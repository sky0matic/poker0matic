#!/usr/bin/env bash
# Verify that the project lints, type-checks, passes its tests and builds.
#
# Modes:
#   verify.sh --report   CLI mode: run all checks, print the report, exit 0 (all pass) or 1.
#   verify.sh            Hook mode (Stop/SubagentStop): reads the hook JSON on stdin.
#                        On failure, exits 2 with the report on stderr so the agent keeps
#                        working and fixes it. If the agent was already blocked once
#                        (stop_hook_active=true), exits 0 to avoid an endless loop; the
#                        failing report is left for the orchestrator to pick up.
#
# The report is always written to .claude/harness/verify-report.md.

set -u

MODE="hook"
[[ "${1:-}" == "--report" ]] && MODE="report"

HOOK_INPUT=""
if [[ "$MODE" == "hook" && ! -t 0 ]]; then
  HOOK_INPUT="$(cat)"
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
)

overall=0
summary=""
details=""

for step in "${STEPS[@]}"; do
  name="${step%%|*}"
  cmd="${step#*|}"
  log="$LOG_DIR/$name.log"
  if bash -c "$cmd" >"$log" 2>&1; then
    summary+="- ✅ **$name** — PASS (\`$cmd\`)"$'\n'
  else
    overall=1
    summary+="- ❌ **$name** — FAIL (\`$cmd\`)"$'\n'
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

# Hook mode
[[ $overall -eq 0 ]] && exit 0

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
  echo "Verification failed. Fix every failing check below before finishing."
  echo "Do not weaken lint rules, skip tests or delete assertions to make checks pass."
  echo
  cat "$REPORT"
} >&2
exit 2
