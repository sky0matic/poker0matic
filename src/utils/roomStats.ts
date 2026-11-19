import { type CardValue, SPECIAL_CARDS } from '@/config/cardDecks'
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

interface EstimateVote {
  userId: string
  rank: number
}

/** Online users' votes that are estimates: in the deck and not a special card, with their deck position. */
function estimateVotes (users: Record<string, RoomUser>, voteOptions: CardValue[]): EstimateVote[] {
  const votes: EstimateVote[] = []
  for (const [userId, user] of Object.entries(users)) {
    if (!isUserOnline(user) || user.vote == null || SPECIAL_CARDS.includes(user.vote)) {
      continue
    }
    const rank = voteOptions.indexOf(user.vote)
    if (rank !== -1) {
      votes.push({ userId, rank })
    }
  }
  return votes
}

/** The card every estimate voter picked, when there are at least 2 of them and they all agree; otherwise `null`. */
export function consensusVote (users: Record<string, RoomUser>, voteOptions: CardValue[]): CardValue | null {
  const votes = estimateVotes(users, voteOptions)
  if (votes.length < 2 || votes.some(vote => vote.rank !== votes[0].rank)) {
    return null
  }
  return voteOptions[votes[0].rank]
}

/** Users who picked the lowest and the highest estimate (deck order); both empty unless at least 2 distinct estimates. */
export function voteOutliers (
  users: Record<string, RoomUser>,
  voteOptions: CardValue[],
): { lowest: Set<string>, highest: Set<string> } {
  const votes = estimateVotes(users, voteOptions)
  const ranks = votes.map(vote => vote.rank)
  const min = Math.min(...ranks)
  const max = Math.max(...ranks)
  if (votes.length < 2 || min === max) {
    return { lowest: new Set(), highest: new Set() }
  }
  return {
    lowest: new Set(votes.filter(vote => vote.rank === min).map(vote => vote.userId)),
    highest: new Set(votes.filter(vote => vote.rank === max).map(vote => vote.userId)),
  }
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
