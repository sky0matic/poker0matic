import { type CardValue, DEFAULT_CARDS } from './cardDecks'

export const CURRENT_ROOM_VERSION = 4

export const ROOM_CHANGELOG: Record<number, string[]> = {
  2: [
    'Custom card decks — rooms now support a configurable set of vote cards',
  ],
  3: [
    'Timer thresholds — rooms can now set a target duration and ceiling duration to visually alert when voting runs long',
  ],
  4: [
    'Offline presence — users who lose their connection stay in the room (shown as offline, vote kept) and are removed after 10 minutes offline or when votes are reset',
  ],
}

/** The `rooms/{roomId}/settings` node as stored in Firebase. Unknown fields are kept as is. */
export interface RoomSettings {
  [key: string]: unknown
  showVotes?: boolean
  v?: number
  cards?: CardValue[] | Record<string, CardValue>
  targetDuration?: number
  ceilingDuration?: number
  revealedAt?: number
}

/**
 * Schema migrations, keyed by the version they upgrade a room *to*.
 * Each one must be pure and idempotent: it may run on any client, any number of times.
 *
 * Every `CURRENT_ROOM_VERSION` bump must add an entry here (enforced by `roomVersions.spec.ts`).
 * If the new version adds a stored field, its migration must give it a sensible default.
 */
export const ROOM_MIGRATIONS: Record<number, (settings: RoomSettings) => RoomSettings> = {
  // v2: custom card decks. Legacy rooms used the Fibonacci deck implicitly; make it explicit.
  2: settings => {
    const { cards } = settings
    const isMissing = cards == null || (Array.isArray(cards) ? cards.length === 0 : Object.keys(cards).length === 0)
    return isMissing ? { ...settings, cards: [...DEFAULT_CARDS] } : settings
  },
  // v3: timer thresholds. Both are optional, so a room without them is already valid.
  3: settings => settings,
  // v4: offline presence. Handled entirely by clients on the users nodes; nothing to change in settings.
  4: settings => settings,
}

/**
 * Applies every migration from `settings.v + 1` up to `CURRENT_ROOM_VERSION` and stamps `v`.
 * Settings already at (or above) the current version are returned untouched: `v` never decreases.
 */
export function migrateRoomSettings (settings: RoomSettings): RoomSettings {
  const fromVersion = settings.v ?? 0
  if (fromVersion >= CURRENT_ROOM_VERSION) {
    return settings
  }

  let migrated = { ...settings }
  for (let version = fromVersion + 1; version <= CURRENT_ROOM_VERSION; version++) {
    const migration = ROOM_MIGRATIONS[version]
    if (migration) {
      migrated = migration(migrated)
    }
  }
  return { ...migrated, v: CURRENT_ROOM_VERSION }
}
