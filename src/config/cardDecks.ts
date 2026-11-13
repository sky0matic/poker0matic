export type CardValue = number | string

export type RawCards = CardValue[] | Record<string, CardValue> | undefined

export interface PresetDefinition {
  key: 'fibonacci' | 'modifiedFib' | 'tshirt' | 'powersOf2'
  cards: CardValue[]
}

export const PRESET_DEFINITIONS: PresetDefinition[] = [
  { key: 'fibonacci', cards: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, '?', '☕'] },
  { key: 'modifiedFib', cards: [0, '½', 1, 2, 3, 5, 8, 13, 20, 40, 100, '?', '☕'] },
  { key: 'tshirt', cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'] },
  { key: 'powersOf2', cards: [0, 1, 2, 4, 8, 16, 32, 64, '?', '☕'] },
]

/** Deck used by rooms created before custom decks existed (no `settings/cards`). */
export const DEFAULT_CARDS: readonly CardValue[] = PRESET_DEFINITIONS[0].cards

/**
 * Returns the deck as an array. Firebase may hand back arrays as index-keyed objects;
 * a missing or empty deck falls back to `DEFAULT_CARDS`.
 */
export function normalizeCards (raw: RawCards): CardValue[] {
  if (!raw) {
    return [...DEFAULT_CARDS]
  }
  const cards = Array.isArray(raw) ? raw : Object.values(raw)
  return cards.length > 0 ? [...cards] : [...DEFAULT_CARDS]
}

export function sameCards (a: readonly CardValue[], b: readonly CardValue[]): boolean {
  return a.length === b.length && a.every((card, i) => card === b[i])
}

/** Index of the preset whose cards match `cards` exactly (same values, same order), or null. */
export function findPresetIndex (cards: readonly CardValue[]): number | null {
  const index = PRESET_DEFINITIONS.findIndex(preset => sameCards(preset.cards, cards))
  return index === -1 ? null : index
}
