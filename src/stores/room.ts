import type { PruneCandidate, RoomUser } from '@/utils/presence'
import {
  ref as dbRef,
  goOffline,
  goOnline,
  onDisconnect,
  onValue,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'
import { defineStore } from 'pinia'
import { type CardValue, normalizeCards, sameCards } from '@/config/cardDecks'
import { CURRENT_ROOM_VERSION, migrateRoomSettings, type RoomSettings } from '@/config/roomVersions'
import { useConfigStore } from './config'

type UserNode = Partial<RoomUser> & Record<string, unknown>

/** Room fields editable from the room settings dialog. Durations are in seconds. */
export interface EditableRoomSettings {
  name: string
  cards: CardValue[]
  targetDuration?: number
  ceilingDuration?: number
}

export type UpdateRoomSettingsResult = 'updated' | 'unchanged' | 'conflict' | 'unsupported' | 'error'

type TransactionOutcome = 'committed' | 'settingsUnchanged' | 'conflict' | 'unsupported' | 'error'

type DeckAndThresholds = Pick<EditableRoomSettings, 'cards' | 'targetDuration' | 'ceilingDuration'>

function sameSettings (a: DeckAndThresholds, b: DeckAndThresholds): boolean {
  return sameCards(a.cards, b.cards)
    && (a.targetDuration ?? undefined) === (b.targetDuration ?? undefined)
    && (a.ceilingDuration ?? undefined) === (b.ceilingDuration ?? undefined)
}

function toDeckAndThresholds (settings: RoomSettings): DeckAndThresholds {
  return {
    cards: normalizeCards(settings.cards),
    targetDuration: settings.targetDuration,
    ceilingDuration: settings.ceilingDuration,
  }
}

export const useRoomStore = defineStore('room', () => {
  const configStore = useConfigStore()

  function createRoom (
    roomName: string,
    cards: Array<number | string>,
    targetDuration?: number,
    ceilingDuration?: number,
  ): string {
    const db = configStore.getDb()
    if (!db || !configStore.userId) {
      return ''
    }

    const roomId = Math.random().toString(36).slice(2, 10)

    const settings: Record<string, unknown> = { showVotes: false, v: CURRENT_ROOM_VERSION, cards }
    if (targetDuration != null) {
      settings.targetDuration = targetDuration
    }
    if (ceilingDuration != null) {
      settings.ceilingDuration = ceilingDuration
    }

    set(dbRef(db, `rooms/${roomId}`), {
      name: roomName,
      createdAt: Date.now(),
      createdBy: configStore.userId,
      settings,
      lastActivity: Date.now(),
    }).catch(console.error)

    return roomId
  }

  function getUserRef (roomId: string) {
    const db = configStore.getDb()
    if (!db || !configStore.userId) {
      return null
    }
    return dbRef(db, `rooms/${roomId}/users/${configStore.userId}`)
  }

  /**
   * Per-room leave counter. `joinRoom` captures it before its transaction and `leaveRoom` bumps it,
   * so a join that resolves after the user has left does not arm an onDisconnect.
   */
  const leaveGenerations = new Map<string, number>()

  /**
   * Joins (or re-joins after a reconnect) the room. Must be called on every connect:
   * onDisconnect operations are one-shot and have to be re-armed each time.
   * The onDisconnect is armed only once the join transaction has committed: security rules are
   * evaluated when an onDisconnect is registered, against the data at that moment. On a first join
   * the node does not exist yet, so `{ connected, lastSeen }` alone would fail the user node
   * validation (`name` and `joinedAt` required) and the registration would be rejected.
   */
  function joinRoom (roomId: string): void {
    const userRef = getUserRef(roomId)
    if (!userRef) {
      return
    }

    const generation = leaveGenerations.get(roomId) ?? 0
    runTransaction(userRef, (current: UserNode | null) => current
      ? { ...current, name: configStore.username, joinedAt: current.joinedAt ?? Date.now(), connected: true, lastSeen: null }
      : { name: configStore.username, joinedAt: Date.now(), connected: true },
    )
      .then(({ committed }) => {
        const hasLeftSince = (leaveGenerations.get(roomId) ?? 0) !== generation
        return committed && !hasLeftSince
          ? onDisconnect(userRef).update({ connected: false, lastSeen: serverTimestamp() })
          : undefined
      })
      .catch(console.error)
  }

  /**
   * Marks the current user offline without deleting the node (in-app navigation away from the room).
   * Must be called while the room listeners are still attached so the transaction runs on a warm cache.
   * The onDisconnect armed by `joinRoom` is cancelled first: once the user has left, another client may
   * prune the node, and a stale onDisconnect would recreate it as a nameless `{ connected, lastSeen }` node.
   * A join still in flight is invalidated so it does not arm an onDisconnect after this cancel.
   * Operations are sent in order on a single connection, so a later re-join re-arms after this cancel.
   */
  function leaveRoom (roomId: string): void {
    const userRef = getUserRef(roomId)
    if (!userRef) {
      return
    }

    leaveGenerations.set(roomId, (leaveGenerations.get(roomId) ?? 0) + 1)
    onDisconnect(userRef).cancel().catch(console.error)
    runTransaction(userRef, (current: UserNode | null) => current
      ? { ...current, connected: false, lastSeen: serverTimestamp() }
      : undefined,
    ).catch(console.error)
  }

  function updateUsername (roomId: string, name: string): void {
    const userRef = getUserRef(roomId)
    if (!userRef) {
      return
    }

    runTransaction(userRef, (current: UserNode | null) => current ? { ...current, name } : undefined)
      .catch(console.error)
  }

  function castVote (roomId: string, value: number | string): void {
    const db = configStore.getDb()
    const userRef = getUserRef(roomId)
    if (!db || !userRef) {
      return
    }

    runTransaction(userRef, (current: UserNode | null) => current ? { ...current, vote: value } : undefined)
      .then(({ committed }) => committed ? update(dbRef(db, `rooms/${roomId}`), { lastActivity: Date.now() }) : undefined)
      .catch(console.error)
  }

  /**
   * Deletes each candidate only if it is still offline (or a nameless partial node) with the
   * same `lastSeen` it had when selected, so a user who reconnects concurrently is kept.
   */
  function pruneOfflineUsers (roomId: string, candidates: PruneCandidate[]): void {
    const db = configStore.getDb()
    if (!db) {
      return
    }

    for (const candidate of candidates) {
      runTransaction(dbRef(db, `rooms/${roomId}/users/${candidate.userId}`), (current: UserNode | null) => {
        const isStillPrunable = current != null
          && current.connected !== true
          && current.lastSeen === candidate.lastSeen
          && (current.connected === false || current.name == null)
        return isStillPrunable ? null : undefined
      }).catch(console.error)
    }
  }

  function revealVotes (roomId: string): void {
    const db = configStore.getDb()
    if (!db) {
      return
    }

    update(dbRef(db, `rooms/${roomId}`), {
      'settings/showVotes': true,
      'settings/revealedAt': Date.now(),
      'lastActivity': Date.now(),
    }).catch(console.error)
  }

  function resetVotes (roomId: string, users: Record<string, Partial<RoomUser>>): void {
    const db = configStore.getDb()
    if (!db) {
      return
    }

    const updates: Record<string, unknown> = {
      'settings/showVotes': false,
      'settings/revealedAt': null,
      'lastActivity': Date.now(),
      'resetAt': Date.now(),
    }
    for (const userId of Object.keys(users)) {
      updates[`users/${userId}/vote`] = null
    }

    update(dbRef(db, `rooms/${roomId}`), updates).catch(console.error)

    const offlineUsers = Object.entries(users)
      .filter(([, user]) => user?.connected === false)
      .map(([userId, user]) => ({ userId, lastSeen: user.lastSeen }))
    pruneOfflineUsers(roomId, offlineUsers)
  }

  /**
   * Edits the room settings in place and upgrades the room schema to `CURRENT_ROOM_VERSION`.
   * `settings` is the single commit point: a transaction on it checks that the deck and thresholds
   * still match `baseline` (what the editor saw when opening the dialog) and that the room was not
   * upgraded by a newer client, then migrates and writes `next`. Firebase re-runs the update function
   * on every concurrent write, so the checks always run against the latest value.
   * `name` lives outside `settings` and is written right after the commit; a deck change also clears votes.
   * Like `leaveRoom`, this relies on the room listener keeping the settings node in the local cache.
   */
  async function updateRoomSettings (
    roomId: string,
    baseline: EditableRoomSettings,
    next: EditableRoomSettings,
    users: Record<string, Partial<RoomUser>>,
  ): Promise<UpdateRoomSettingsResult> {
    const db = configStore.getDb()
    if (!db) {
      return 'error'
    }

    // Written by the update function, which Firebase may run several times: the last run wins.
    let outcome = 'error' as TransactionOutcome
    let deckChanged = false as boolean

    try {
      const { committed } = await runTransaction(dbRef(db, `rooms/${roomId}/settings`), (current: RoomSettings | null) => {
        outcome = 'error'
        deckChanged = false

        if (current == null) {
          return undefined
        }
        if ((current.v ?? 0) > CURRENT_ROOM_VERSION) {
          outcome = 'unsupported'
          return undefined
        }
        const stored = toDeckAndThresholds(current)
        if (!sameSettings(stored, baseline)) {
          outcome = 'conflict'
          return undefined
        }

        deckChanged = !sameCards(stored.cards, next.cards)
        if (sameSettings(stored, next) && current.v === CURRENT_ROOM_VERSION) {
          outcome = 'settingsUnchanged'
          return undefined
        }

        const updated: RoomSettings = { ...migrateRoomSettings({ ...current }), cards: [...next.cards], v: CURRENT_ROOM_VERSION }
        for (const key of ['targetDuration', 'ceilingDuration'] as const) {
          const value = next[key]
          if (value == null) {
            delete updated[key]
          } else {
            updated[key] = value
          }
        }
        if (deckChanged) {
          updated.showVotes = false
          delete updated.revealedAt
        }
        outcome = 'committed'
        return updated
      })

      if (outcome === 'committed' && !committed) {
        return 'error'
      }
      if (outcome !== 'committed' && outcome !== 'settingsUnchanged') {
        return outcome
      }
      if (outcome === 'settingsUnchanged' && next.name === baseline.name) {
        return 'unchanged'
      }

      if (outcome === 'committed' && deckChanged) {
        resetVotes(roomId, users)
      }
      await update(dbRef(db, `rooms/${roomId}`), { name: next.name, lastActivity: Date.now() })
      return 'updated'
    } catch (error) {
      console.error(error)
      return 'error'
    }
  }

  function resetTimer (roomId: string): void {
    const db = configStore.getDb()
    if (!db) {
      return
    }

    update(dbRef(db, `rooms/${roomId}`), {
      'settings/showVotes': false,
      'settings/revealedAt': null,
      'resetAt': Date.now(),
      'lastActivity': Date.now(),
    }).catch(console.error)
  }

  function watchConnection (cb: (connected: boolean) => void): () => void {
    const db = configStore.getDb()
    if (!db) {
      return () => {}
    }
    return onValue(dbRef(db, '.info/connected'), snapshot => cb(snapshot.val() === true))
  }

  function watchServerTimeOffset (cb: (offset: number) => void): () => void {
    const db = configStore.getDb()
    if (!db) {
      return () => {}
    }
    return onValue(dbRef(db, '.info/serverTimeOffset'), snapshot => {
      const offset = snapshot.val()
      cb(typeof offset === 'number' ? offset : 0)
    })
  }

  function forceReconnect (): void {
    const db = configStore.getDb()
    if (!db) {
      return
    }
    goOffline(db)
    goOnline(db)
  }

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    updateUsername,
    castVote,
    pruneOfflineUsers,
    revealVotes,
    resetVotes,
    updateRoomSettings,
    resetTimer,
    watchConnection,
    watchServerTimeOffset,
    forceReconnect,
  }
})
