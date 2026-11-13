export const CURRENT_ROOM_VERSION = 4

export const ROOM_CHANGELOG: Record<number, string[]> = {
  2: [
    'Custom card decks — rooms now support a configurable set of vote cards',
  ],
  3: [
    'Timer thresholds — rooms can now set a target duration and ceiling duration to visually alert when voting runs long',
  ],
  4: [
    'Offline presence — users who lose their connection stay in the room (shown as offline, vote kept) and are removed after 10 minutes offline or when votes are reset',
  ],
}
