# Changelog

## [3.8.0] — 2026-11-24

### Changed

- **Average and median in the vote distribution** — after the reveal, the average and median show as chips in the "Vote distribution" header, next to the suggested estimate, instead of as rows at the bottom of the players table (room and presenter window). They are hidden before the reveal and when there are no numeric votes.

### Fixed

- **Locale number format for the average and median** — the vote distribution chips and the round history (including the copied round summary) now format the average and median for the current language, e.g. "Moyenne 4,33" in French and "Promedio 4,33" in Spanish instead of "4.33", without digit grouping.

## [3.7.0] — 2026-11-19

### Added

- **Vote distribution and suggested estimate** — after the reveal, the players table (room and presenter window) shows how many players picked each card, as bars in deck order, and a "Suggested estimate": the deck card closest to the median of the estimates (ties go to the higher card; the middle card for decks without numbers, like T-shirt sizes). `?`, `☕`, offline users and spectators are left out, and the suggestion is hidden when there is a consensus.

## [3.6.0] — 2026-11-19

### Added

- **Numeric deck warning** (#10) — while editing a deck (room creation and room settings), a warning says when no card is numeric (average and median won't be available) or when numeric cards are fewer than the others (they may not be accurate). `?` and `☕` count as non-numeric.
- **Consensus highlight** (#36) — after the reveal, the players table (room and presenter window) shows a "Consensus on X!" banner when every estimate vote agrees, otherwise "Lowest" / "Highest" chips on the voters at both ends so they explain first. `?`, `☕`, offline users and spectators are ignored.
- **Round history** (#37, room version 5) — each reveal records an anonymous round under `rooms/{roomId}/rounds` (card values, start and reveal times; no names, titles or links). A collapsible "Round history" panel lists the rounds of the session with votes, average, median and duration, a copy button per round and a "Clear history" button. Rooms are reused, so a reveal more than 4 hours after the previous round starts a new session and deletes the old rounds; at most 30 are kept.
- **Spectator mode** (#38, room version 6) — a "Spectator mode" switch lets a participant watch without voting: their vote is cleared, the cards are hidden, and they are left out of the vote count, "all voted", statistics, consensus and round history. Spectators keep the room actions and are listed last with an eye icon. The choice is stored on the user node and remembered per room on the device.
- **Dependency security checks** — `verify.sh` has a new `audit` step (`.claude/hooks/check-audit.mjs`) that fails on any known vulnerability not accepted in `.claude/audit-allowlist.json`, and reports a registry error as "could not run" rather than as an advisory. A new `security-advisor` agent and `/audit` skill fix vulnerable packages safely: plain `npm audit fix` first, then overrides scoped to the vulnerable caret range, only to versions that satisfy `^<installed>` (same major; same minor for 0.x) or every parent's range, and direct-dependency updates that keep their declared pin. Never `npm audit fix --force`. Anything else is reported, and can be accepted by the user for up to 90 days in a validated allowlist. `/deliver` checks `main` for advisories before starting and hands an `audit` failure to the security advisor, never to the implementer.

### Changed

- **`/deliver` harness releases every change** — the investigator plans the next version and changelog entry, the implementer bumps `package.json` / `package-lock.json` and adds the `CHANGELOG.md` section first, the reviewer checks it, and `verify.sh` has a new `release` step (`.claude/hooks/check-release.mjs`) that fails when app files change without a version bump and a changelog entry.

## [3.5.0] — 2026-11-19

### Added

- **Presenter window** (#33) — a new "Open presenter view" button in the room title bar opens a read-only child window (`/rooms/:roomId/presenter`) to share on screen while you keep voting in the main window. It shows the room name, a "Votes hidden / Votes revealed" chip, the timer and the players table (card backs before reveal, votes with average and median after), but no vote cards, no action buttons, no dialogs and no toolbar, and it does not mark your own row. It never joins the room or writes to Firebase. Clicking the button again focuses the open window; the window closes itself when the room page is closed, reloaded or left. A blocked pop-up shows an error message.

### Changed

- **Room view building blocks extracted** — the timer line (`RoomTimer`), the players table (`RoomVotesTable`), the elapsed-time logic (`useRoomTimer`) and the vote statistics (`src/utils/roomStats.ts`) are now shared between the room page and the presenter window. The room page behaves as before.

## [3.4.0] — 2026-11-12

### Added

- **Room settings dialog** (#32) — a new settings button in the room title bar lets participants edit the room name, card deck and timer thresholds in place. Changing the deck clears the current votes and other participants are notified when the settings change. Save is disabled while offline, and the dialog stays dismissible if the connection drops during a save.
- **"Upgrade room" button** (#32) — outdated rooms are migrated in place from the update banner instead of being recreated; the room link stays the same. Saves go through a compare-and-set Firebase transaction with idempotent per-version migrations, so any participant can upgrade safely, even concurrently. Clients that open a room upgraded by a newer version are asked to reload.
- **Offline presence** (#31, room version 4) — users who lose their connection stay in the room, shown as offline (dimmed, with a wifi-off icon) with their vote kept, instead of being removed. Offline users are pruned after 10 minutes offline, on vote reset and when the room is opened. A "Connection lost" alert pauses voting while you are offline, and a "Reconnected" message confirms when you are back.
- **`/deliver` development harness** (#27, #28) — a multi-agent delivery pipeline under `.claude/` (investigate, implement, review, verify) with a verify hook running lint, type-check, unit tests and build, invocable from natural-language requests.

### Changed

- **Presence re-armed on every reconnect** (#31) — `onDisconnect` now marks the user offline rather than deleting the node, is re-armed after each reconnect, and is only armed once the join transaction commits (fixes users staying online forever after closing the tab on a first join).
- **Multi-tab fix** (#31) — when another tab of the same user leaves and marks the shared node offline, the still-connected tab marks itself online again.
- **Dependency updates** (#29) — firebase 13, pinia 4, vitest 5, jsdom 31 and TypeScript 6, among others; npm audit advisories resolved via `overrides` without downgrading direct dependencies.

## [3.3.0] — 2026-06-19

### Added

- **Internationalization (i18n)** — the app is now available in English, Spanish (Español), and French Canadian (Français). The active language is auto-detected from browser preferences and can be changed at any time via the language switcher in the toolbar. The selection is persisted in localStorage.

## [3.2.0] — 2026-05-31

### Added

- **`VoteCard` component** — playing card–style vote cards with suit symbols, dynamic suit-color coding, and a 3D mouse-tilt effect. Includes `small` and `readonly` variants used in the results table after reveal.
- **`CardBack` component** — decorative card-back face (blue diamond-mesh pattern) shown in the results table while votes are still hidden.
- **Preferences store** (`src/stores/preferences.ts`) — tracks `reducedMotion`, honoring the OS `prefers-reduced-motion` media query with a user-level toggle override persisted in localStorage.
- **"Reduce motion" toggle in user menu** — lets users override the system animation preference directly from the app without touching OS settings.
- **"(You)" label in player table** — your own row in the results table now shows a "(You)" annotation next to your name.

### Changed

- **Reveal / Reset buttons moved to card header** — the two action buttons are now placed in the `v-card-item` append slot so they stay anchored to the room title rather than sitting below the vote row.
- **Router injects `?config=<encoded>` into room URLs** — when a valid Firebase config is loaded and the URL doesn't already carry one, the router guard appends it. Rooms are therefore shareable by copying the address bar. (Previously the guard stripped `?config` on arrival.)
- **Vote cards replaced with playing card design** — the old `v-chip` row is replaced by `VoteCard` throughout the room view.
- **Revealed votes shown as small playing cards in the results table** — after reveal each player's vote renders as a `VoteCard small` instead of plain text.

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
