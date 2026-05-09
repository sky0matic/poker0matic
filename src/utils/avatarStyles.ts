export interface AvatarStyle {
  id: string
  label: string
  needsBg: boolean
}

export const AVATAR_STYLES: AvatarStyle[] = [
  /* ── no background required ─────────────────────────────────────────── */
  { id: 'notionists-neutral', label: 'Notionists', needsBg: false },
  { id: 'bottts-neutral', label: 'Bottts', needsBg: false },
  { id: 'pixel-art-neutral', label: 'Pixel Art', needsBg: false },
  { id: 'adventurer-neutral', label: 'Adventurer', needsBg: false },
  { id: 'lorelei-neutral', label: 'Lorelei', needsBg: false },
  { id: 'big-ears-neutral', label: 'Big Ears', needsBg: false },
  { id: 'avataaars-neutral', label: 'Avataaars', needsBg: false },
  { id: 'croodles-neutral', label: 'Croodles', needsBg: false },
  { id: 'fun-emoji', label: 'Fun Emoji', needsBg: false },
  { id: 'thumbs', label: 'Thumbs', needsBg: false },
  { id: 'identicon', label: 'Identicon', needsBg: false },
  { id: 'glass', label: 'Glass', needsBg: false },
  { id: 'shapes', label: 'Shapes', needsBg: false },
  { id: 'dylan', label: 'Dylan', needsBg: false },
  { id: 'icons', label: 'Icons', needsBg: false },
  { id: 'initials', label: 'Initials', needsBg: false },
  /* ── background required (dark app-tone fill) ────────────────────────── */
  { id: 'micah', label: 'Micah', needsBg: true },
  { id: 'open-peeps', label: 'Open Peeps', needsBg: true },
  { id: 'notionists', label: 'Notionists+', needsBg: true },
  { id: 'bottts', label: 'Bottts+', needsBg: true },
  { id: 'pixel-art', label: 'Pixel Art+', needsBg: true },
  { id: 'adventurer', label: 'Adventurer+', needsBg: true },
  { id: 'lorelei', label: 'Lorelei+', needsBg: true },
  { id: 'big-ears', label: 'Big Ears+', needsBg: true },
  { id: 'avataaars', label: 'Avataaars+', needsBg: true },
  { id: 'big-smile', label: 'Big Smile', needsBg: true },
  { id: 'croodles', label: 'Croodles+', needsBg: true },
  { id: 'miniavs', label: 'Miniavs', needsBg: true },
  { id: 'personas', label: 'Personas', needsBg: true },
  { id: 'rings', label: 'Rings', needsBg: true },
  { id: 'toon-head', label: 'Toon Head', needsBg: true },
]

export const DEFAULT_AVATAR_STYLE = 'notionists-neutral'

const AVATAR_BG_COLOR = '1e2535'

export function buildAvatarUrl (style: string, seed: string): string {
  const entry = AVATAR_STYLES.find(s => s.id === style)
  const bg = entry?.needsBg ? `&backgroundColor=${AVATAR_BG_COLOR}` : ''
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}${bg}`
}
