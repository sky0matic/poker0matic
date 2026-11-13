---
name: implement
description: Implementation phase of the /deliver harness — implements the approved plan of a run (code + tests), or fixes the findings of a previous pass. The verify hook runs when it finishes. Requires a run-dir and pass number; a user request to "implement" or "fix" something goes to the deliver skill instead.
argument-hint: <run-dir> <pass-number>
context: fork
agent: implementer
---

Arguments: $ARGUMENTS

- First argument: the run directory containing `plan.md`.
- Second argument: the pass number (1–3). Defaults to 1.

Pass 1: implement `<run-dir>/plan.md` in full, including tests.
Pass 2+: read `<run-dir>/pass-<previous>.md` and fix every Blocker and failing check it lists (address Warnings too when the fix is small and in scope). The plan is still the spec.

Write `<run-dir>/implementation-pass-<n>.md`, then reply with a short summary.
