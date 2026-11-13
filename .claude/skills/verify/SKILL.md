---
name: verify
description: Check that poker0matic still lints, type-checks, passes unit tests and builds. Use after changing code, before committing.
allowed-tools: Bash(.claude/hooks/verify.sh *), Read
---

Run:

```bash
.claude/hooks/verify.sh --report
```

It runs `npm run lint`, `npm run type-check`, `npx vitest run` and `npm run build-only`, and writes `.claude/harness/verify-report.md` (full logs in `.claude/harness/logs/`).

Report the STATUS line and, for each failing step, the relevant errors with `file:line`. Do not fix anything unless the user asked you to.
