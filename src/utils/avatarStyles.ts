export interface AvatarStyle {
  id: string
  label: string
  recommended?: boolean
}

/**
 * Neutral dark blue-gray used when a user has not chosen a custom background.
 * Deliberately more elevated than any theme's --bg-elev so transparent avatar
 * styles remain legible without requiring user action.
 */
export const DEFAULT_AVATAR_BG = '#374357'

/**
 * Sentinel stored in avatarBg when the user opts into "follow theme".
 * PlayerAvatar maps this to a CSS color-mix so every viewer's own theme is used.
 */
export const THEME_BG_VALUE = 'theme'

/** All styles sorted alphabetically by label. */
export const AVATAR_STYLES: AvatarStyle[] = [
  { id: 'adventurer-neutral', label: 'Adventurer',   recommended: true  },
  { id: 'adventurer',         label: 'Adventurer+'                      },
  { id: 'avataaars-neutral',  label: 'Avataaars'                        },
  { id: 'avataaars',          label: 'Avataaars+'                       },
  { id: 'big-ears-neutral',   label: 'Big Ears'                         },
  { id: 'big-ears',           label: 'Big Ears+'                        },
  { id: 'big-smile',          label: 'Big Smile'                        },
  { id: 'bottts-neutral',     label: 'Bottts'                           },
  { id: 'bottts',             label: 'Bottts+'                          },
  { id: 'croodles-neutral',   label: 'Croodles'                         },
  { id: 'croodles',           label: 'Croodles+'                        },
  { id: 'dylan',              label: 'Dylan'                            },
  { id: 'fun-emoji',          label: 'Fun Emoji',    recommended: true  },
  { id: 'glass',              label: 'Glass'                            },
  { id: 'icons',              label: 'Icons'                            },
  { id: 'identicon',          label: 'Identicon'                        },
  { id: 'initials',           label: 'Initials'                         },
  { id: 'lorelei-neutral',    label: 'Lorelei'                          },
  { id: 'lorelei',            label: 'Lorelei+',     recommended: true  },
  { id: 'micah',              label: 'Micah'                            },
  { id: 'miniavs',            label: 'Miniavs',      recommended: true  },
  { id: 'notionists-neutral', label: 'Notionists'                       },
  { id: 'notionists',         label: 'Notionists+',  recommended: true  },
  { id: 'open-peeps',         label: 'Open Peeps'                       },
  { id: 'personas',           label: 'Personas'                         },
  { id: 'pixel-art-neutral',  label: 'Pixel Art'                        },
  { id: 'pixel-art',          label: 'Pixel Art+'                       },
  { id: 'rings',              label: 'Rings'                            },
  { id: 'shapes',             label: 'Shapes'                           },
  { id: 'thumbs',             label: 'Thumbs',       recommended: true  },
  { id: 'toon-head',          label: 'Toon Head'                        },
]

export const DEFAULT_AVATAR_STYLE = 'notionists-neutral'

/**
 * Build a DiceBear avatar URL.
 * The background is applied via CSS on the component, not via URL params,
 * so the same URL works regardless of which theme the viewer uses.
 */
export function buildAvatarUrl (style: string, seed: string): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}
