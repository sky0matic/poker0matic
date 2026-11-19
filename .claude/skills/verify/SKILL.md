---
name: verify
description: Check that poker0matic still lints, type-checks, passes unit tests, builds, that app changes bump the version with a CHANGELOG.md entry, and that no npm package has a known vulnerability. Use after changing code, before committing.
allowed-tools: Bash(.claude/hooks/verify.sh *), Read
---

Run:

```bash
.claude/hooks/verify.sh --report
```

It runs `npm run lint`, `npm run type-check`, `npx vitest run`, `npm run build-only` and the release check (`.claude/hooks/check-release.mjs`: version bumped and documented in `CHANGELOG.md` whenever app files changed), the dependency audit (`.claude/hooks/check-audit.mjs`: any known vulnerability not accepted in `.claude/audit-allowlist.json` fails; fix with `/audit`), and writes `.claude/harness/verify-report.md` (full logs in `.claude/harness/logs/`).

Report the STATUS line and, for each failing step, the relevant errors with `file:line`. Do not fix anything unless the user asked you to.
