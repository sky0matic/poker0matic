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
