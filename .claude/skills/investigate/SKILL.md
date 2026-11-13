---
name: investigate
description: Investigate a poker0matic feature request or bug (GitHub issue number or description) and write a file-level implementation plan. Read-only.
argument-hint: <run-dir> <issue# | description>
context: fork
agent: investigator
---

Investigate the following request and write the plan.

Arguments: $ARGUMENTS

- The first argument is the run directory. If it is missing or does not start with `.claude/harness/runs/`, create `.claude/harness/runs/$(date +%Y%m%d-%H%M%S)` and use it.
- The rest is the request: a GitHub issue number (`#12` or `12`) or a free-text description.

Write `<run-dir>/plan.md` in the format defined by your agent instructions, then reply with the run directory path, a short summary of the plan, and any open questions.
