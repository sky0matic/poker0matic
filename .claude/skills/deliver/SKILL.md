---
name: deliver
description: End-to-end delivery harness for poker0matic. Investigates a feature or bug, implements it, runs an independent review and verification (lint, type-check, tests, build), retries up to 3 passes, then commits and opens a PR.
argument-hint: <issue# | description>
disable-model-invocation: true
---

You are the **orchestrator** of the delivery harness. You coordinate phases; you do not write application code yourself. Each phase runs in its own subagent via a skill.

Request: $ARGUMENTS

`MAX_PASSES = 3`

## 0. Preflight
1. `git status --porcelain` must be empty and the current branch must be `main`. If not, stop and tell the user why.
2. `git pull --ff-only` to start from an up-to-date `main`.
3. Create the run directory: `RUN=.claude/harness/runs/$(date +%Y%m%d-%H%M%S)` and `mkdir -p "$RUN"`.
4. If the request is an issue number (`#12` or `12`), note it as `ISSUE`. Otherwise `ISSUE` is none.

## 1. Investigate (once)
1. Invoke the `investigate` skill with `$RUN <request>`.
2. Read `$RUN/plan.md`. Check it has `TYPE`, `SLUG`, acceptance criteria and a tests section; if not, invoke `investigate` once more with what is missing.
3. **Checkpoint**: show the user the plan summary (title, type, acceptance criteria, files to change, room version bump, open questions) and the path to `$RUN/plan.md`. Ask with AskUserQuestion: *Approve*, *Approve with changes* (user describes them), or *Cancel*.
   - Changes: append them under a `## User adjustments` section in `plan.md` (they override the rest of the plan).
   - Cancel: stop and leave nothing behind but the run directory.
4. Create the branch: `git switch -c <TYPE>/<ISSUE>-<SLUG>` (or `<TYPE>/<SLUG>` with no issue).

## 2. Implement → Review → Verify loop
For `pass` in 1..MAX_PASSES:
1. **Implement**: invoke the `implement` skill with `$RUN <pass>`. Its Stop hook runs `.claude/hooks/verify.sh`, so it already had one chance to fix check failures.
2. **Review**: invoke the `review` skill with `$RUN`. Read the `VERDICT:` line of `$RUN/review.md`.
3. **Verify**: run `.claude/hooks/verify.sh --report` yourself (this is the authoritative result). Copy `.claude/harness/verify-report.md` to `$RUN/verify-pass-<pass>.md`.
4. If the verdict is `PASS` **and** verify exits 0 → go to step 3 (Ship).
5. Otherwise write `$RUN/pass-<pass>.md` containing the review's Blockers and Warnings and the failing verify steps (copy them verbatim), tell the user in one line what failed in this pass, and continue with the next pass.

If all MAX_PASSES fail → go to step 4 (Give up).

## 3. Ship
1. Stage only the files the implementer touched (`git status --porcelain`; never stage `.claude/harness/`). Show the user the file list.
2. Commit with a message in the repo's style, ending with the attribution trailer from your system instructions:
   ```
   #<ISSUE> - <Imperative summary>        (or just <Imperative summary> with no issue)

   <2–4 lines: what and why>
   ```
3. `git push -u origin HEAD`.
4. `gh pr create --base main --title "<same summary line>" --body-file <file>` where the body contains:
   - `Closes #<ISSUE>` (if any)
   - Summary and acceptance criteria from `plan.md` (checked)
   - Review: verdict and any remaining Warnings/Suggestions
   - Verification: the STATUS and per-step lines of the last verify report
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
