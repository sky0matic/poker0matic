import type { CardValue } from '@/config/cardDecks'
import { isUserOnline, type RoomUser } from '@/utils/presence'
import { averageOf, medianOf } from '@/utils/roomStats'

/**
 * A new reveal this long after the latest stored round starts a new session: the older rounds are
 * deleted, and they are hidden as soon as the latest one is this old. Rooms are reused across meetings.
 */
export const ROUND_SESSION_GAP_MS = 4 * 60 * 60_000

/** Rounds kept per room; the oldest ones are deleted when a reveal goes past it. */
export const MAX_ROUNDS = 30

/**
 * A round as stored under `rooms/{roomId}/rounds/{startedAt}`. Keyed on the round start, which every
 * client shares, so concurrent reveals write the same round. Card values only:
 * no names, titles or links, since the database may live outside the company.
 */
export interface StoredRound {
  startedAt: number
  revealedAt: number
  /** Firebase may hand back arrays as index-keyed objects. */
  votes?: CardValue[] | Record<string, CardValue>
}

export interface Round {
  key: string
  /** 1-based position in the current session. */
  number: number
  startedAt: number
  revealedAt: number
  votes: CardValue[]
}

export type StoredRounds = Record<string, StoredRound | null | undefined> | null | undefined

function isStoredRound (value: unknown): value is StoredRound {
  const round = value as StoredRound | null
  return round != null && typeof round.startedAt === 'number' && typeof round.revealedAt === 'number'
}

function sortedRounds (raw: StoredRounds): Array<[string, StoredRound]> {
  return Object.entries(raw ?? {})
    .filter((entry): entry is [string, StoredRound] => isStoredRound(entry[1]))
    .toSorted(([, a], [, b]) => a.revealedAt - b.revealedAt)
}

/** The rounds of the current session, oldest first and numbered from 1; empty once the latest is `ROUND_SESSION_GAP_MS` old. */
export function roundsInSession (raw: StoredRounds, now: number): Round[] {
  const rounds = sortedRounds(raw)
  const latest = rounds.at(-1)
  if (!latest || now - latest[1].revealedAt >= ROUND_SESSION_GAP_MS) {
    return []
  }

  return rounds.map(([key, round], i) => ({
    key,
    number: i + 1,
    startedAt: round.startedAt,
    revealedAt: round.revealedAt,
    votes: round.votes == null ? [] : Object.values(round.votes),
  }))
}

/**
 * Keys of the stored rounds to delete before adding one revealed at `now`: all of them when the
 * latest is from a previous session, otherwise the oldest ones beyond `MAX_ROUNDS - 1`.
 * Malformed entries (e.g. a vote update that raced a clear) are always deleted.
 */
export function roundKeysToDelete (raw: StoredRounds, now: number): string[] {
  const malformed = Object.entries(raw ?? {})
    .filter(([, round]) => round != null && !isStoredRound(round))
    .map(([key]) => key)
  const rounds = sortedRounds(raw)
  const latest = rounds.at(-1)
  if (latest && now - latest[1].revealedAt >= ROUND_SESSION_GAP_MS) {
    return [...malformed, ...rounds.map(([key]) => key)]
  }
  return [...malformed, ...rounds.slice(0, Math.max(0, rounds.length - (MAX_ROUNDS - 1))).map(([key]) => key)]
}

/** The online users' votes, values only. */
export function roundVotes (users: Record<string, Partial<RoomUser>>): CardValue[] {
  return Object.values(users)
    .filter(user => user != null && isUserOnline(user) && user.vote != null)
    .map(user => user.vote as CardValue)
}

/** Votes in deck order; cards no longer in the deck go last. */
export function sortVotes (votes: CardValue[], voteOptions: CardValue[]): CardValue[] {
  const rank = (vote: CardValue) => {
    const index = voteOptions.indexOf(vote)
    return index === -1 ? Infinity : index
  }
  return votes.toSorted((a, b) => rank(a) - rank(b))
}

export interface RoundStats {
  average: number | null
  median: number | null
  durationSeconds: number
}

export function roundStats (round: Round): RoundStats {
  const numbers = round.votes.filter((vote): vote is number => typeof vote === 'number')
  return {
    average: averageOf(numbers),
    median: medianOf(numbers),
    durationSeconds: Math.max(0, Math.floor((round.revealedAt - round.startedAt) / 1000)),
  }
}
