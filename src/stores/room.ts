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
import { CURRENT_ROOM_VERSION } from '@/config/roomVersions'
import { useConfigStore } from './config'

type UserNode = Partial<RoomUser> & Record<string, unknown>

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
   * Joins (or re-joins after a reconnect) the room. Must be called on every connect:
   * onDisconnect operations are one-shot and have to be re-armed each time.
   */
  function joinRoom (roomId: string): void {
    const userRef = getUserRef(roomId)
    if (!userRef) {
      return
    }

    onDisconnect(userRef).update({ connected: false, lastSeen: serverTimestamp() }).catch(console.error)
    runTransaction(userRef, (current: UserNode | null) => current
      ? { ...current, name: configStore.username, joinedAt: current.joinedAt ?? Date.now(), connected: true, lastSeen: null }
      : { name: configStore.username, joinedAt: Date.now(), connected: true },
    ).catch(console.error)
  }

  /**
   * Marks the current user offline without deleting the node (in-app navigation away from the room).
   * Must be called while the room listeners are still attached so the transaction runs on a warm cache.
   * The onDisconnect armed by `joinRoom` is cancelled first: once the user has left, another client may
   * prune the node, and a stale onDisconnect would recreate it as a nameless `{ connected, lastSeen }` node.
   * Operations are sent in order on a single connection, so a later re-join re-arms after this cancel.
   */
  function leaveRoom (roomId: string): void {
    const userRef = getUserRef(roomId)
    if (!userRef) {
      return
    }

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
    resetTimer,
    watchConnection,
    watchServerTimeOffset,
    forceReconnect,
  }
})
