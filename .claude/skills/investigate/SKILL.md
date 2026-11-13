---
name: investigate
description: Investigation phase of the /deliver harness — writes a file-level implementation plan into a run directory. Read-only. Requires a run-dir argument; a user request to "investigate" or "look into" an issue or feature goes to the deliver skill instead, which calls this phase.
argument-hint: <run-dir> <issue# | description>
context: fork
agent: investigator
---

Investigate the following request and write the plan.

Arguments: $ARGUMENTS

- The first argument is the run directory. If it is missing or does not start with `.claude/harness/runs/`, create `.claude/harness/runs/$(date +%Y%m%d-%H%M%S)` and use it.
- The rest is the request: a GitHub issue number (`#12` or `12`) or a free-text description.

Write `<run-dir>/plan.md` in the format defined by your agent instructions, then reply with the run directory path, a short summary of the plan, and any open questions.
