export const OFFLINE_USER_TTL_MS = 10 * 60_000
export const OFFLINE_USER_GC_INTERVAL_MS = 60_000
export const FORCE_RECONNECT_AFTER_HIDDEN_MS = 60_000
export const RECONNECTED_SNACKBAR_TIMEOUT_MS = 3000

export interface RoomUser {
  name: string
  joinedAt: number
  vote?: number | string
  connected?: boolean
  lastSeen?: number
}

export interface PruneCandidate {
  userId: string
  lastSeen?: number
}

/** Users without a `connected` field (legacy rooms) count as online. */
export function isUserOnline (user: Pick<RoomUser, 'connected'>): boolean {
  return user.connected !== false
}

/**
 * Returns the other users that can be garbage-collected: offline for at least `ttlMs`
 * (server time), or nameless partial nodes left by older clients that are not connected.
 */
export function findPrunableUsers (
  users: Record<string, Partial<RoomUser>>,
  serverNow: number,
  ttlMs: number,
  selfId: string | null,
): PruneCandidate[] {
  const candidates: PruneCandidate[] = []
  for (const [userId, user] of Object.entries(users)) {
    if (userId === selfId || user == null) {
      continue
    }

    const isStaleOffline = user.connected === false
      && typeof user.lastSeen === 'number'
      && serverNow - user.lastSeen >= ttlMs
    const isNamelessPartial = user.name == null && user.connected !== true

    if (isStaleOffline || isNamelessPartial) {
      candidates.push({ userId, lastSeen: user.lastSeen })
    }
  }
  return candidates
}
