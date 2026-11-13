---
name: review
description: Independent adversarial review of the current branch's changes against the plan of a /deliver run (or standalone, against main). Writes review.md with a PASS / CHANGES_REQUIRED verdict.
argument-hint: "[run-dir]"
context: fork
agent: reviewer
---

Arguments: $ARGUMENTS

If a run directory is given, review the changes against `<run-dir>/plan.md` and write `<run-dir>/review.md`. Do not read `implementation-*.md` in that directory.

If no run directory is given, review the current branch against `main` (committed and uncommitted changes) and print the review instead of writing a file.

End with the verdict line `VERDICT: PASS` or `VERDICT: CHANGES_REQUIRED`.
