import { type CardValue, SPECIAL_CARDS } from '@/config/cardDecks'
import { isSpectator, isUserOnline, type RoomUser } from '@/utils/presence'

export type RoomUserWithId = RoomUser & { userId: string }

export function onlineUsers (users: Record<string, RoomUser>): RoomUser[] {
  return Object.values(users).filter(user => isUserOnline(user))
}

/** Counts online players and how many of them have voted. Offline users and spectators are left out of both. */
export function countVotes (users: Record<string, RoomUser>): { voted: number, total: number } {
  const online = onlineUsers(users).filter(user => !isSpectator(user))
  return {
    voted: online.filter(user => user.vote != null).length,
    total: online.length,
  }
}

function numericVotes (users: Record<string, RoomUser>): number[] {
  return onlineUsers(users)
    .filter(user => !isSpectator(user))
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

/** Online players' votes that are estimates (spectators left out): in the deck and not a special card, with their deck position. */
function estimateVotes (users: Record<string, RoomUser>, voteOptions: CardValue[]): EstimateVote[] {
  const votes: EstimateVote[] = []
  for (const [userId, user] of Object.entries(users)) {
    if (!isUserOnline(user) || isSpectator(user) || user.vote == null || SPECIAL_CARDS.includes(user.vote)) {
      continue
    }
    const rank = voteOptions.indexOf(user.vote)
    if (rank !== -1) {
      votes.push({ userId, rank })
    }
  }
  return votes
}

/** Online players' votes (spectators left out), values only. */
function playerVotes (users: Record<string, RoomUser>): CardValue[] {
  return onlineUsers(users)
    .filter(user => !isSpectator(user) && user.vote != null)
    .map(user => user.vote as CardValue)
}

/** Deck positions of the `votes` that are estimates: in the deck and not a special card. */
function estimateRanks (votes: CardValue[], voteOptions: CardValue[]): number[] {
  return votes
    .filter(vote => !SPECIAL_CARDS.includes(vote))
    .map(vote => voteOptions.indexOf(vote))
    .filter(rank => rank !== -1)
}

/** The card every estimate in `votes` picked, when there are at least 2 of them and they all agree; otherwise `null`. */
export function consensusOf (votes: CardValue[], voteOptions: CardValue[]): CardValue | null {
  const ranks = estimateRanks(votes, voteOptions)
  if (ranks.length < 2 || ranks.some(rank => rank !== ranks[0])) {
    return null
  }
  return voteOptions[ranks[0]]
}

/** The card every estimate voter picked, when there are at least 2 of them and they all agree; otherwise `null`. */
export function consensusVote (users: Record<string, RoomUser>, voteOptions: CardValue[]): CardValue | null {
  return consensusOf(playerVotes(users), voteOptions)
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

export interface VoteBucket {
  vote: CardValue
  count: number
}

/** How many times each card appears in `votes`, in deck order; cards no longer in the deck go last. */
export function distributionOf (votes: CardValue[], voteOptions: CardValue[]): VoteBucket[] {
  const counts = new Map<CardValue, number>()
  for (const vote of votes) {
    counts.set(vote, (counts.get(vote) ?? 0) + 1)
  }
  const rank = (vote: CardValue) => {
    const index = voteOptions.indexOf(vote)
    return index === -1 ? voteOptions.length : index
  }
  return [...counts]
    .map(([vote, count]) => ({ vote, count }))
    .toSorted((a, b) => rank(a.vote) - rank(b.vote))
}

/** How many online players picked each card, in deck order; cards no longer in the deck go last. Spectators are left out. */
export function voteDistribution (users: Record<string, RoomUser>, voteOptions: CardValue[]): VoteBucket[] {
  return distributionOf(playerVotes(users), voteOptions)
}

/**
 * The card to suggest as the estimate for `votes`, or `null` without any estimate vote (`?` and `☕` don't count).
 * With numeric votes: the numeric deck card closest to their median, ties going to the higher card.
 * Otherwise (e.g. T-shirt sizes): the middle vote in deck order, the higher one for an even count.
 */
export function suggestedEstimateOf (votes: CardValue[], voteOptions: CardValue[]): CardValue | null {
  const ranks = estimateRanks(votes, voteOptions)
  if (ranks.length === 0) {
    return null
  }

  const median = medianOf(ranks.map(rank => voteOptions[rank]).filter((vote): vote is number => typeof vote === 'number'))
  if (median == null) {
    const sorted = ranks.toSorted((a, b) => a - b)
    return voteOptions[sorted[Math.floor(sorted.length / 2)]]
  }

  let best: number | null = null
  for (const card of voteOptions) {
    if (typeof card !== 'number') {
      continue
    }
    const distance = Math.abs(card - median)
    const bestDistance = best == null ? Infinity : Math.abs(best - median)
    if (distance < bestDistance || (distance === bestDistance && card > (best ?? -Infinity))) {
      best = card
    }
  }
  return best
}

/** The suggested estimate for the online players' votes (spectators left out); see `suggestedEstimateOf`. */
export function suggestedEstimate (users: Record<string, RoomUser>, voteOptions: CardValue[]): CardValue | null {
  return suggestedEstimateOf(playerVotes(users), voteOptions)
}

/** Sorts users by deck order when votes are revealed (non-voters last), otherwise by join time. Spectators always come last. */
export function sortRoomUsers (
  users: Record<string, RoomUser>,
  showVotes: boolean,
  voteOptions: CardValue[],
): RoomUserWithId[] {
  const withId = Object.entries(users).map(([userId, user]) => ({ userId, ...user }))
  const spectatorsLast = (a: RoomUserWithId, b: RoomUserWithId) => Number(isSpectator(a)) - Number(isSpectator(b))

  if (showVotes) {
    const order = (vote: number | string | undefined): number => {
      if (vote == null) {
        return Infinity
      }
      const idx = voteOptions.indexOf(vote)
      return idx === -1 ? Infinity : idx
    }

    return withId.toSorted((a, b) => spectatorsLast(a, b) || order(a.vote) - order(b.vote))
  }

  return withId.toSorted((a, b) => spectatorsLast(a, b) || a.joinedAt - b.joinedAt)
}
