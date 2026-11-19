---
name: deliver
description: End-to-end delivery harness for poker0matic. Investigates a feature or bug, pauses for plan approval, implements it, runs an independent review and verification (lint, type-check, tests, build), retries up to 3 passes, then commits and opens a PR. Use this for any request to change the app, whether it names a GitHub issue ("#25", "issue 25") or describes the work, phrased with words like deliver, implement, investigate, fix, build, add, change, update, refactor, resolve, tackle or "work on". It is the default entry point for code changes; the investigate/implement/review/verify skills are its phases.
argument-hint: <issue# | description>
---

You are the **orchestrator** of the delivery harness. You coordinate phases; you do not write application code yourself. Each phase runs in its own subagent via a skill.

Request: $ARGUMENTS

`MAX_PASSES = 3`

## 0. Preflight
1. `git status --porcelain` must be empty and the current branch must be `main`. If not, stop and tell the user why.
2. `git pull --ff-only` to start from an up-to-date `main`.
3. Create the run directory: `RUN=.claude/harness/runs/$(date +%Y%m%d-%H%M%S)` and `mkdir -p "$RUN"`.
4. If the request is an issue number (`#12` or `12`), note it as `ISSUE`. Otherwise `ISSUE` is none.
5. `node .claude/hooks/check-audit.mjs`.
   - "could not run": tell the user (registry or lockfile problem, not an advisory) and continue.
   - Unaccepted advisories on `main`: tell the user and ask (AskUserQuestion):
     - *Run /audit first* (recommended): the fixes ship in their own PR, and this delivery restarts once that PR is merged.
     - *Continue*: the security advisor fixes them in this PR.
     - *Cancel*.

## 1. Investigate (once)
1. Invoke the `investigate` skill with `$RUN <request>`.
2. Read `$RUN/plan.md`. Check it has `TYPE`, `SLUG`, `VERSION`, acceptance criteria, a tests section and a changelog entry (both may be `none` only for changes limited to `.claude/`, docs or CI); if not, invoke `investigate` once more with what is missing.
3. **Checkpoint**: show the user the plan summary (title, type, new app version, acceptance criteria, files to change, room version bump, open questions) and the path to `$RUN/plan.md`. Ask with AskUserQuestion: *Approve*, *Approve with changes* (user describes them), or *Cancel*.
   - Changes: append them under a `## User adjustments` section in `plan.md` (they override the rest of the plan).
   - Cancel: stop and leave nothing behind but the run directory.
4. Create the branch: `git switch -c <TYPE>/<ISSUE>-<SLUG>` (or `<TYPE>/<SLUG>` with no issue).

## 2. Implement → Review → Verify loop
For `pass` in 1..MAX_PASSES:
1. **Implement**: invoke the `implement` skill with `$RUN <pass>`. Its Stop hook runs `.claude/hooks/verify.sh`, so it already had one chance to fix check failures.
2. **Review**: invoke the `review` skill with `$RUN`. Read the `VERDICT:` line of `$RUN/review.md`.
3. **Verify**: run `.claude/hooks/verify.sh --report` yourself (this is the authoritative result). Copy `.claude/harness/verify-report.md` to `$RUN/verify-pass-<pass>.md`.
4. If the verdict is `PASS` **and** verify exits 0 → go to step 3 (Ship).
5. If `audit` is the only failing verify step, with advisories (not "could not run"), and the security advisor hasn't run in this pass yet. If other steps also fail, skip this: step 6 hands them to the implementer, and a later pass handles `audit` once they pass.
   1. Run the `security-advisor` agent with the report path `$RUN/audit-pass-<pass>.md`, the note that it runs inside a `/deliver` run, and the plan's `VERSION` line.
   2. Append a `## Dependency security (pass <pass>)` section to `plan.md`. It points to the report and lists what the reviewer should accept as planned:
      - each override or direct update, which must be scoped to the vulnerable caret range, target `^<installed>` or every parent's range (0.x minors are breaking), keep declared pins, and resolve only patched versions (`npm ls <pkg>`);
      - the `### Security` changelog entry;
      - with a `VERSION: none` plan, the patch bump the advisor makes;
      - any `.claude/audit-allowlist.json` entries the user accepts (added to this section after asking).
   3. If the advisor left advisories **not fixed**, ask the user (AskUserQuestion):
      - *Accept until a date*: record them in `.claude/audit-allowlist.json` with id, package, reason, `approvedBy` and `expires` (at most 90 days out), and list them in the PR.
      - *Stop*: go to step 4 (Give up).
   4. Re-run steps 2–4 of this pass once. Never use `npm audit fix --force`.

   If `audit` failed with "could not run" (registry or lockfile), it is the only failing step, and the review verdict is PASS: re-run verify once. If it still fails, ask the user (AskUserQuestion): *Retry now* (re-run verify) or *Stop* (leave the branch). Don't start another implementer pass for it, and don't run the advisor. If the verdict is CHANGES_REQUIRED, continue with step 6.

   If `audit` failed with "invalid allowlist", fix the entry with the values the user gave you (asking again if needed) and re-run verify. Never hand it to the implementer or the advisor.
6. Otherwise write `$RUN/pass-<pass>.md` containing the review's Blockers and Warnings and the failing verify steps, copied verbatim, **except the `audit` step** (that is the security advisor's, not the implementer's). Tell the user in one line what failed in this pass, and continue with the next pass.

If all MAX_PASSES fail → go to step 4 (Give up).

## 3. Ship
0. `git fetch origin main`, then `node .claude/hooks/check-release.mjs`. If `main` shipped a version since the branch started, it fails: commit the work, `git merge origin/main` (resolve `package.json`, `package-lock.json` and the top of `CHANGELOG.md` by keeping `main`'s sections), take the next version (`npm version <x.y.z> --no-git-tag-version`), put this branch's `CHANGELOG.md` section under that version above `main`'s sections, re-run `.claude/hooks/verify.sh --report`, and only then continue.
1. Stage only the files the implementer and the security advisor touched, plus `.claude/audit-allowlist.json` if you changed it (`git status --porcelain`; never stage `.claude/harness/`). Show the user the file list.
2. Commit with a message in the repo's style, ending with the attribution trailer from your system instructions:
   ```
   #<ISSUE> - <Imperative summary>        (or just <Imperative summary> with no issue)

   <2–4 lines: what and why>
   ```
3. `git push -u origin HEAD`.
4. `gh pr create --base main --title "<same summary line>" --body-file <file>` where the body contains:
   - `Closes #<ISSUE>` (if any)
   - Summary and acceptance criteria from `plan.md` (checked)
   - Version: `<previous> → <next>` and the new `CHANGELOG.md` section (omit only when `VERSION: none` and the security advisor made no bump)
   - Review: verdict and any remaining Warnings/Suggestions
   - Verification: the STATUS and per-step lines of the last verify report
   - Dependency security (if the security advisor ran): its advisory table and any accepted advisories with reason and expiry
   - Passes used: `<n>/3`
   - The PR attribution line from your system instructions.
5. Report the PR URL to the user.

## 4. Give up (3 passes failed)
Do not commit, push or open a PR. Leave the changes on the branch. Tell the user:
- which acceptance criteria / Blockers / checks are still failing (from the last `pass-3.md`),
- the branch name and `$RUN` path so they can inspect `plan.md`, `review.md`, `verify-pass-*.md`,
- a suggestion for how to proceed (e.g. adjust the plan and run `/implement $RUN 1` again).

## Rules
- Never skip the review or the final verify run, even if the implementer says everything passes.
- Never weaken checks (edit ESLint config, tsconfig, vitest config, delete tests) to get a pass. If the implementer did, treat it as a failed pass.
- Keep user-facing messages short: one line per phase, plus the checkpoint and final report.
