# Changelog

## [1.0.0] — 2026-05-07

First stable release.

### Added

- **`/rooms/:roomId` route** — rooms now have clean, shareable URLs instead of query parameters.
- **`/create` route** — dedicated page for creating a room with separate name and room-name fields.
- **`UserMenu` component** — avatar button in the toolbar that groups theme toggle and "Change name" into a dropdown, replacing the standalone theme-toggle icon.
- **Active room link in toolbar** — when inside a room, a "Room — {name}" breadcrumb appears in the navigation bar.
- **`activeRoomId` / `activeRoomName` state in config store** — tracks the current room so the toolbar can display it; cleared automatically when the Firebase config changes.
- **Room-not-found handling** — snackbar notification with a 3-second auto-redirect to home when a room ID resolves to nothing in the database.
- **"Reveal votes" guard** — the reveal button is disabled until at least one vote has been cast.
- **`CONFIG.md`** — step-by-step guide for setting up a Firebase project and connecting it to the app, including the recommended Realtime Database security rules.
- **`README.md`** — project-specific readme replacing the Vuetify scaffold boilerplate.

### Changed

- **Home page** (`/`) is now a lobby: a "Create a room" button and a "Join by room code" form, replacing the old all-in-one create/join/vote page.
- **Room logic moved to `room.vue`** — voting, reveal, reset, and Firebase sync extracted from `index.vue` into a dedicated page component.
- **Create room logic moved to `create.vue`** — extracted from `index.vue` into its own page.
- **Router guards refactored** — extracted into named `requireConfig` / `requireConfigIndex` functions; legacy `?roomId=` query param now redirects to `/rooms/:roomId`.
- **Config URL param cleanup** delegated to the router instead of manual `history.replaceState` in the store.
- **`saveFirebaseConfig`** now resets `_db` and clears the active room when a new config is saved.
- **Share button** in the room view is now a compact icon button (`mdi-link-variant`) in the card title instead of a full-width action button.

### Removed

- **`/attributions` route and page** — attributions content moved inline to the home page.
- **"Attributions" nav link** from the toolbar.
