# Poker0matic

A real-time collaborative planning poker app for agile teams. Team members join a shared room, cast story point votes anonymously, then reveal all votes simultaneously to spark estimation discussions.

Firebase Realtime Database is the only backend — there is no server. Each team brings their own Firebase project.

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## First-time setup

See [CONFIG.md](CONFIG.md) for step-by-step instructions on creating a Firebase project, enabling Realtime Database, and connecting it to the app.

## Stack

- Vue 3 (Composition API) + Vite
- Vuetify 4 (Material Design UI)
- Pinia (state management)
- Vue Router 5
- Vue I18n
- Firebase Realtime Database
- TypeScript

## Project structure

- `src/pages/index.vue` — lobby: create-a-room button and join-by-code form
- `src/pages/create.vue` — room creation form (name, card deck)
- `src/pages/room.vue` — poker room: voting, reveal, reset, real-time Firebase sync
- `src/pages/presenter.vue` — read-only presenter window (no vote cards, no Firebase writes), opened as a pop-out from the room
- `src/pages/config.vue` — Firebase config input and sharing
- `src/stores/config.ts` — Pinia store: Firebase config, user identity, active room, localStorage persistence
- `src/stores/room.ts` — room actions: create, join, vote, reveal, reset
- `src/config/roomVersions.ts` — room schema version + changelog (drives the upgrade banner)
- `src/components/UserMenu.vue` — toolbar avatar menu: theme toggle, change name
- `src/router/index.ts` — routes + guard that redirects to `/config` when no config is saved
- `src/App.vue` — root layout: toolbar, GitHub link, router outlet
- `src/plugins/` — Vue plugin registrations

## Dev

```bash
npm install
npm run dev       # dev server on port 3000
npm run build     # type-check + production build → dist/
npm run preview   # serve dist/ locally
npm run lint      # ESLint check
npm run lint:fix  # ESLint auto-fix
```

Deployment is automatic via GitHub Actions on push to `main`, publishing to GitHub Pages at `/poker0matic/`.

## AI delivery harness

The repo ships a [Claude Code](https://claude.com/claude-code) delivery pipeline under `.claude/`. Run `/deliver <issue# | description>` (or just ask Claude to work on an issue) and it takes the change from request to pull request:

1. **Investigate** — the read-only `investigator` agent turns the request into a file-level `plan.md` (type, slug, acceptance criteria, files, tests, room version bump, open questions). The run **pauses for your approval**, then creates a `feat/<issue>-<slug>` or `fix/<issue>-<slug>` branch.
2. **Implement** — the `implementer` agent writes the code and tests. A Stop hook runs `.claude/hooks/verify.sh` so it fixes failing checks before handing back.
3. **Review** — the `reviewer` agent independently reviews the diff against the plan, without seeing the implementer's notes, and gives a `PASS` / `CHANGES_REQUIRED` verdict with Blockers, Warnings and Suggestions.
4. **Verify** — `.claude/hooks/verify.sh --report` runs lint, type-check, `vitest run` and build. This is the authoritative result.

Steps 2–4 repeat with the findings for at most **3 passes**. On success the harness commits, pushes and opens a PR summarising the plan, review and verification; otherwise it stops and leaves the branch for you to inspect.

| Piece | Location |
|---|---|
| Orchestrator and phase skills | `.claude/skills/{deliver,investigate,implement,review,verify}/` |
| Agents | `.claude/agents/{investigator,implementer,reviewer}.md` |
| Checks | `.claude/hooks/verify.sh` (report in `.claude/harness/verify-report.md`) |
| Standalone adversarial review | `/adversarial-review` (`.claude/commands/`) |
| Run artifacts (git-ignored) | `.claude/harness/runs/<timestamp>/` — `plan.md`, `review.md`, `verify-pass-<n>.md`, … |

Each phase can also be run on its own: `/investigate`, `/implement <run-dir> <pass>`, `/review [run-dir]`, `/verify`. Project conventions the agents follow (testing rules, room versioning) live in [CLAUDE.md](CLAUDE.md).
