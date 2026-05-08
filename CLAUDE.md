# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Type-check + Vite production build → dist/
npm run preview      # Serve dist/ locally
npm run type-check   # Vue TSC type validation only
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
```

No test framework is configured — there are no unit or integration tests.

Deployment is automatic via GitHub Actions on push to `main`, building and publishing to GitHub Pages at `/poker0matic/`.

## Architecture

**Poker0matic** is a real-time collaborative planning poker (story point estimation) SPA. Users join a shared room, cast votes on cards, and reveal results together.

**Stack:** Vue 3 (Composition API, `<script setup>`) · Vuetify 4 (Material Design UI) · Pinia (state) · Vue Router 5 · Vue I18n · Firebase Realtime Database · TypeScript · Vite

### Data flow

```
User input
  → Pinia store (config.ts, app.ts)
    → localStorage (Firebase config, userId, userName)
  → Firebase Realtime DB (room state, votes, user presence)
    → onValue listeners → reactive refs in index.vue → UI
```

- Firebase config is base64-encoded and persisted in localStorage under a constant key (`CONFIG_KEY`). It can also be distributed via a URL query param (`?c=<encoded>`).
- Room state (votes, users, reveal status) lives entirely in Firebase; there is no server-side logic.
- `onDisconnect()` handles automatic user cleanup when a tab closes.

### Key files

| File | Purpose |
|---|---|
| `src/pages/index.vue` | Core poker room: voting, reveal, reset, real-time Firebase sync |
| `src/pages/config.vue` | Firebase project config input/storage |
| `src/stores/config.ts` | Pinia store — Firebase config, userId, userName, localStorage persistence |
| `src/router/index.ts` | Routes + guard that redirects to `/config` when Firebase config is missing |
| `src/plugins/` | Vue plugin registrations (Vuetify, Pinia, i18n, Router) |
| `src/styles/settings.scss` | Vuetify SCSS variable overrides |
| `src/App.vue` | Root layout: toolbar, theme toggle, `<router-view>` |

### Routing

Three routes: `/` (room), `/config`, `/attributions`. The `/` route guard checks for a valid Firebase config in the Pinia store; if absent it redirects to `/config?e`.

### Room versioning

Room schema changes are tracked in `src/config/roomVersions.ts` via `CURRENT_ROOM_VERSION` (integer) and `ROOM_CHANGELOG`.

**Bump the version and add a changelog entry only when a change adds or modifies data stored in Firebase** (e.g. a new field in room `settings`). Client-side-only changes — new UI, computed stats, display tweaks — do not require a version bump, as they work regardless of when the room was created.

When adding a room data feature:
1. Increment `CURRENT_ROOM_VERSION` in `roomVersions.ts`
2. Add an entry to `ROOM_CHANGELOG` under the new version number describing the feature
3. Stamp new rooms with the updated version (already handled via `CURRENT_ROOM_VERSION` in `room.ts`)

### Vote cards

Defined as a constant `VOTE_OPTIONS`: `0, 1, 2, 3, 5, 8, 13, 21, 34, 55, ?, ☕`

### Vite config notes

- Base URL is `/poker0matic/` (required for GitHub Pages).
- Path alias `@` → `src/`.
- Vuetify plugin uses auto-import; the SCSS config file is `src/styles/settings.scss`.
