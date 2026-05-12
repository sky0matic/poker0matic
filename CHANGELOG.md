# Changelog

## [3.1.0] — 2026-05-12

### Added

- **"All players voted" animation** — the Reveal votes button bounces and glows when every player in the room has cast a vote, making the ready state immediately noticeable.
- **Timer continues after reveal** — the elapsed-time display no longer freezes when votes are revealed; it keeps running to capture discussion time. A `(revealed at MM:SS)` marker appears inline so the voting phase duration remains visible.

### Changed

- **`revealedAt` persisted in Firebase** — the moment votes are revealed is stored as a timestamp under `settings/revealedAt`, so players who join late see the correct "revealed at" time rather than nothing. It is cleared on vote reset and when the first user joins an empty room.
- **ESLint upgraded to v10** — resolves a peer dependency conflict with `eslint-config-vuetify`.

## [3.0.0] — 2026-05-08

### Added

- **Timer thresholds** — rooms can now optionally set a *target duration* and a *ceiling duration* (in minutes) when created. The elapsed-time display turns yellow at the target and red at the ceiling, with an icon and tooltip explaining each state. Rooms without thresholds behave exactly as before.
- **Smart update banner** — the "missing features" banner now highlights only features that are genuinely new since the last dismissal. Any previously acknowledged entries collapse into a "Previously acknowledged features" disclosure rather than being shown again at full weight.

## [2.0.0] — 2026-05-07

### Added

- **Custom card decks** — the card deck is now configurable when creating a room. Choose from built-in presets (Fibonacci, Modified Fibonacci, T-Shirt, Powers of 2), drag chips to reorder, remove cards, or add custom values.
- **Room version banner** — a dismissible info banner appears when entering a room that is missing newer features, listing what it lacks. Dismissed state is persisted per room in localStorage and reappears if a future version adds more entries.
- **`src/config/roomVersions.ts`** — single source of truth for the room schema version (`CURRENT_ROOM_VERSION`) and per-version changelog. Update this file whenever a new feature changes the room's Firebase data structure.
- **Elapsed time display** — time since the last vote reset is shown below the vote controls.
- **GitHub button in toolbar** — a single button combining the repository star count and a GitHub icon, linking to the repo.

### Changed

- **Room actions extracted to `src/stores/room.ts`** — create, join, vote, reveal, reset, and name-update Firebase operations are now centralized in a dedicated Pinia store instead of being inlined in page components.
- **Average and median** are hidden when the active card deck contains no numeric values.
- **Vote sort order** after reveal now follows card deck position rather than type-based ranking (numbers before strings).

## [1.1.0] — 2026-05-07

### Added

- **Median vote** — displayed in the table footer alongside the average, both shown only after votes are revealed.
- **Vote status icons** — while votes are hidden, the Vote column shows a green checkmark for players who have voted and a grey outline circle for those who haven't, replacing the "Voted" / "No vote" text.
- **Vote count in header** — the Vote column header shows `voted/total` on a second line so progress is visible at a glance.

### Changed

- **Current user row highlighted in bold** — your own row in the player table is rendered in bold for quick self-identification.
- **Average rounded to 2 decimal places** — trailing zeros are omitted (e.g. `3.5` not `3.50`, `3` not `3.00`).

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
