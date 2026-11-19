import type { CardValue } from '@/config/cardDecks'
import { isUserOnline, type RoomUser } from '@/utils/presence'

export type RoomUserWithId = RoomUser & { userId: string }

export function onlineUsers (users: Record<string, RoomUser>): RoomUser[] {
  return Object.values(users).filter(user => isUserOnline(user))
}

/** Counts online users and how many of them have voted. Offline users are left out of both. */
export function countVotes (users: Record<string, RoomUser>): { voted: number, total: number } {
  const online = onlineUsers(users)
  return {
    voted: online.filter(user => user.vote != null).length,
    total: online.length,
  }
}

function numericVotes (users: Record<string, RoomUser>): number[] {
  return onlineUsers(users)
    .map(user => user.vote)
    .filter(vote => typeof vote === 'number') as number[]
}

/** Average of `numbers`, rounded to 2 decimals, or `null` when empty. */
export function averageOf (numbers: number[]): number | null {
  if (numbers.length === 0) {
    return null
  }

  const sum = numbers.reduce((acc, val) => acc + val, 0)
  return Number.parseFloat((sum / numbers.length).toFixed(2))
}

/** Median of `numbers`, or `null` when empty. */
export function medianOf (numbers: number[]): number | null {
  if (numbers.length === 0) {
    return null
  }

  const sorted = numbers.toSorted((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Average of the online numeric votes, rounded to 2 decimals, or `null` when there are none. */
export function averageVote (users: Record<string, RoomUser>): number | null {
  return averageOf(numericVotes(users))
}

/** Median of the online numeric votes, or `null` when there are none. */
export function medianVote (users: Record<string, RoomUser>): number | null {
  return medianOf(numericVotes(users))
}

/** Sorts users by deck order when votes are revealed (non-voters last), otherwise by join time. */
export function sortRoomUsers (
  users: Record<string, RoomUser>,
  showVotes: boolean,
  voteOptions: CardValue[],
): RoomUserWithId[] {
  const withId = Object.entries(users).map(([userId, user]) => ({ userId, ...user }))

  if (showVotes) {
    const order = (vote: number | string | undefined): number => {
      if (vote == null) {
        return Infinity
      }
      const idx = voteOptions.indexOf(vote)
      return idx === -1 ? Infinity : idx
    }

    return withId.toSorted((a, b) => order(a.vote) - order(b.vote))
  }

  return withId.toSorted((a, b) => a.joinedAt - b.joinedAt)
}
