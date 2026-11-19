---
name: audit
description: Security audit of poker0matic's npm dependencies. Checks for known vulnerabilities and, after asking, fixes them safely (plain `npm audit fix`, then scoped semver-safe `overrides`; never `--force`) on a branch, with review, verification, a patch release and a PR. Use for requests about vulnerable packages, npm audit, security advisories or dependency security.
argument-hint: "[check | fix]"
---

You are the **orchestrator** of the dependency audit. The `security-advisor` agent does the fixing; you coordinate.

Arguments: $ARGUMENTS. `check` = report only. `fix` = the user explicitly asked to fix; don't ask again.

## 1. Check
1. The working tree must be clean. If not, stop and tell the user. Note the current branch, `git fetch origin main`, then `git switch main && git pull --ff-only` (the audit must look at `main`, not a feature branch). Whenever you stop without fixing (clean, `check`, report only, could not run), switch back to the noted branch.
2. `node .claude/hooks/check-audit.mjs`.
   - "could not run" → tell the user (registry or lockfile problem) and stop.
   - PASS → tell the user in one line (counts, plus any accepted advisories with their expiry) and stop.
3. Show the unaccepted advisories (id, package, severity, direct/transitive).
4. `check` argument → stop here.
5. Unless the argument is `fix`, or the user's request explicitly asked to fix or update the packages, ask (AskUserQuestion): *Fix and open a PR* or *Report only*.

## 2. Fix
1. `STAMP=$(date +%Y%m%d-%H%M%S)`, then `git switch -c fix/security-audit-$STAMP`, `RUN=.claude/harness/runs/$STAMP-audit` and `mkdir -p "$RUN"`.
2. Run the `security-advisor` agent with the report path `$RUN/audit-report.md`.
3. Read the report. For advisories left **not fixed**, show them with the options and ask the user (AskUserQuestion) for each group:
   - *Accept until a date*: record it yourself in `.claude/audit-allowlist.json` as `{ "id", "package", "reason", "approvedBy": "<user>", "expires": "YYYY-MM-DD" }`, at most 90 days out.
   - *Leave it failing*: stop and leave the branch.
   - *Cancel*.

   Never fall back to `npm audit fix --force`.

## 3. Review and verify
1. Run the `reviewer` agent on the uncommitted diff with `$RUN/audit-report.md` as the requirements. Ask it to check, for each override and update:
   - it is scoped to the vulnerable caret range;
   - the target satisfies `^<installed>` or every parent's range (0.x minors are breaking);
   - direct updates keep the declared operator (exact pins move only to an exact patch of the same minor; `~` stays within its minor);
   - `npm ls <pkg>` resolves only patched versions;
   - the `### Security` changelog entry and the patch version are correct.
2. `.claude/hooks/verify.sh --report` must pass (all steps, including `audit` and `release`). If `audit` says "invalid allowlist", fix the entry you wrote with the user's values and re-run.
3. On review Blockers or failing checks, send them back to the `security-advisor` agent once, then re-run steps 1–2. If they still fail, stop and leave the branch for the user.

## 4. Ship
1. `git fetch origin main` and `node .claude/hooks/check-release.mjs`. If `main` moved ahead, merge it and take the next patch, as in the `deliver` skill's Ship step.
2. Stage `package.json`, `package-lock.json`, `CHANGELOG.md` and, if changed, `.claude/audit-allowlist.json`. Never stage `.claude/harness/`.
3. Commit "Fix vulnerable dependencies (<packages>)" (or "Accept dependency advisories until <date> (<packages>)" when only `.claude/audit-allowlist.json` changed: no version bump then) with the attribution trailer, push, and open a PR whose body has:
   - the audit counts before and after;
   - the advisory table from the report;
   - any accepted advisories with reason and expiry;
   - the review verdict, the verify report and the version.
