#!/usr/bin/env bash
# Verify that the project lints, type-checks, passes its tests and builds, that an app change
# bumps the version and documents it in CHANGELOG.md (see check-release.mjs), and that no
# installed npm package has a known vulnerability (npm audit; non-blocking in hook mode).
#
# Modes:
#   verify.sh --report   CLI mode: run all checks, print the report, exit 0 (all pass) or 1.
#   verify.sh            Hook mode (Stop/SubagentStop): reads the hook JSON on stdin.
#                        On failure, exits 2 with the report on stderr so the agent keeps
#                        working and fixes it. If the agent was already blocked once
#                        (stop_hook_active=true), exits 0 to avoid an endless loop; the
#                        failing report is left for the orchestrator to pick up.
#                        Steps in HOOK_NON_BLOCKING (audit) never block in hook mode and are
#                        labelled "reported only" for the agent: the orchestrator hands them to
#                        the security-advisor agent.
#
# The report is always written to .claude/harness/verify-report.md.

set -u

MODE="hook"
# --owner-audit: the calling agent (security-advisor) owns the audit step, so it isn't labelled
# "not yours to fix" for it. It still never blocks in hook mode.
OWNER_AUDIT="false"
for arg in "$@"; do
  [[ "$arg" == "--report" ]] && MODE="report"
  [[ "$arg" == "--owner-audit" ]] && OWNER_AUDIT="true"
done

HOOK_INPUT=""
if [[ "$MODE" == "hook" && ! -t 0 ]]; then
  # Claude Code writes the hook JSON and closes stdin, so this returns at once. When the script is
  # run by hand with an open but silent stdin (e.g. from an agent's shell), the timeout stops it
  # from hanging forever; HOOK_INPUT is then empty and the checks run as usual.
  if command -v timeout >/dev/null 2>&1; then
    HOOK_INPUT="$(timeout 5 cat)"
  else
    HOOK_INPUT="$(cat)"
  fi
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJECT_DIR" || exit 1

HARNESS_DIR=".claude/harness"
REPORT="$HARNESS_DIR/verify-report.md"
LOG_DIR="$HARNESS_DIR/logs"
mkdir -p "$LOG_DIR"

if [[ ! -d node_modules ]]; then
  msg="node_modules is missing: run 'npm ci' before verifying."
  printf '# Verify report\n\nSTATUS: FAIL\n\n%s\n' "$msg" >"$REPORT"
  echo "$msg" >&2
  # Not something the agent can fix by editing code: never block in hook mode.
  [[ "$MODE" == "report" ]] && exit 1 || exit 0
fi

TAIL_LINES=60
STEPS=(
  "lint|npm run lint --silent"
  "type-check|npm run type-check --silent"
  # Local binary only: never let npx download a different vitest. Not 'npm test' (watch mode).
  "test|npm exec --no -- vitest run"
  "build|npm run build-only --silent"
  # Every merge to main is deployed: app changes need a version bump and a CHANGELOG.md entry.
  "release|node .claude/hooks/check-release.mjs"
  # Any known, unaccepted vulnerability fails (see check-audit.mjs and .claude/audit-allowlist.json).
  # Fixed by the security-advisor agent (/audit); never 'npm audit fix --force'.
  "audit|node .claude/hooks/check-audit.mjs"
)
# Reported but never blocking in hook mode: a new advisory isn't the implementer's to fix,
# the orchestrator runs the security-advisor agent instead.
HOOK_NON_BLOCKING=" audit "

overall=0
blocking=0
summary=""
details=""

for step in "${STEPS[@]}"; do
  name="${step%%|*}"
  cmd="${step#*|}"
  log="$LOG_DIR/$name.log"
  if bash -c "$cmd" >"$log" 2>&1; then
    summary+="- ✅ **$name** — PASS (\`$cmd\`)"$'\n'
    # Accepted advisories are never a silent pass: list them in the report.
    if grep -qE '^(ACCEPTED|STALE):' "$log"; then
      summary+="$(grep -E '^(ACCEPTED|STALE):' "$log" | sed 's/^/  - /')"$'\n'
    fi
  else
    overall=1
    [[ "$HOOK_NON_BLOCKING" != *" $name "* ]] && blocking=1
    if [[ "$MODE" == "hook" && "$OWNER_AUDIT" == "false" && "$HOOK_NON_BLOCKING" == *" $name "* ]]; then
      summary+="- ❌ **$name** — FAIL, reported only: not yours to fix (\`$cmd\`)"$'\n'
    else
      summary+="- ❌ **$name** — FAIL (\`$cmd\`)"$'\n'
    fi
    details+=$'\n'"### $name (last $TAIL_LINES lines, full log: $log)"$'\n\n```\n'
    details+="$(tail -n "$TAIL_LINES" "$log" | sed 's/\x1b\[[0-9;]*m//g')"
    details+=$'\n```\n'
  fi
done

status="PASS"
[[ $overall -ne 0 ]] && status="FAIL"

{
  echo "# Verify report"
  echo
  echo "Generated: $(date -Iseconds)"
  echo
  echo "STATUS: $status"
  echo
  printf '%s' "$summary"
  if [[ -n "$details" ]]; then
    echo
    echo "## Failures"
    printf '%s\n' "$details"
  fi
} >"$REPORT"

if [[ "$MODE" == "report" ]]; then
  cat "$REPORT"
  exit $overall
fi

# Hook mode: only blocking steps keep the agent working (see HOOK_NON_BLOCKING).
[[ $blocking -eq 0 ]] && exit 0

stop_hook_active="false"
if [[ -n "$HOOK_INPUT" ]] && command -v jq >/dev/null 2>&1; then
  stop_hook_active="$(jq -r '.stop_hook_active // false' <<<"$HOOK_INPUT" 2>/dev/null || echo false)"
fi

if [[ "$stop_hook_active" == "true" ]]; then
  # Already blocked once in this stop sequence: let the agent stop, the orchestrator
  # reads $REPORT and counts this pass as failed.
  exit 0
fi

{
  if [[ "$OWNER_AUDIT" == "false" ]]; then
    echo "Verification failed. Fix every failing check below before finishing,"
    echo "except steps marked 'reported only' (audit): those are not yours to fix."
  else
    echo "Verification failed. Fix every failing check below before finishing."
  fi
  echo "Do not weaken lint rules, skip tests or delete assertions to make checks pass."
  echo
  cat "$REPORT"
} >&2
exit 2
