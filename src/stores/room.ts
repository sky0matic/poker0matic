import { ref as dbRef, onDisconnect, set, update } from 'firebase/database'
import { defineStore } from 'pinia'
import { CURRENT_ROOM_VERSION } from '@/config/roomVersions'
import { useConfigStore } from './config'

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

  function joinRoom (roomId: string): void {
    const db = configStore.getDb()
    if (!db || !configStore.userId) {
      return
    }

    const userRef = dbRef(db, `rooms/${roomId}/users/${configStore.userId}`)
    update(userRef, {
      name: configStore.userName,
      joinedAt: Date.now(),
    }).catch(console.error)
    onDisconnect(userRef).remove()
  }

  function updateUserName (roomId: string, name: string): void {
    const db = configStore.getDb()
    if (!db || !configStore.userId) {
      return
    }

    update(dbRef(db, `rooms/${roomId}/users/${configStore.userId}`), { name }).catch(console.error)
  }

  function castVote (roomId: string, value: number | string): void {
    const db = configStore.getDb()
    if (!db || !configStore.userId) {
      return
    }

    update(dbRef(db, `rooms/${roomId}/users/${configStore.userId}`), { vote: value }).catch(console.error)
    update(dbRef(db, `rooms/${roomId}`), { lastActivity: Date.now() }).catch(console.error)
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

  function resetVotes (roomId: string, userIds: string[]): void {
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
    for (const userId of userIds) {
      updates[`users/${userId}/vote`] = null
    }

    update(dbRef(db, `rooms/${roomId}`), updates).catch(console.error)
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

  return { createRoom, joinRoom, updateUserName, castVote, revealVotes, resetVotes, resetTimer }
})
