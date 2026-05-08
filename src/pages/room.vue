<template>
  <template v-if="currentRoom && !showNamePrompt">
    <div class="shell">
      <aside class="rail" :class="{ collapsed: railCollapsed }">
        <div class="rail-head">
          <span v-if="!railCollapsed" class="kicker">Now voting</span>

          <button
            class="icon-btn"
            :title="railCollapsed ? 'Expand panel' : 'Collapse panel'"
            type="button"
            @click="railCollapsed = !railCollapsed"
          >
            <svg fill="none" height="14" viewBox="0 0 16 16" width="14">
              <path
                :d="railCollapsed ? 'M6 4l4 4-4 4' : 'M10 4l-4 4 4 4'"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.6"
              />
            </svg>
          </button>
        </div>

        <template v-if="!railCollapsed">
          <div class="story">
            <div class="story-id">
              <span>{{ roomId }}</span>
              <span class="badge">Round {{ currentRound }}</span>
            </div>

            <h1 class="story-title">{{ currentRoom.name }}</h1>

            <div class="story-meta">
              <div>
                <span class="lbl">Participants</span>
                <span class="val">{{ totalPlayers }}</span>
              </div>

              <div>
                <span class="lbl">Voted</span>
                <span class="val">{{ votedCount }}/{{ totalPlayers }}</span>
              </div>

              <div>
                <span class="lbl">Round</span>
                <span class="val">{{ currentRound }}</span>
              </div>

              <div>
                <span class="lbl">Status</span>

                <span class="val" :class="showVotes ? 'status-revealed' : 'status-waiting'">
                  {{ showVotes ? 'Revealed' : 'Voting' }}
                </span>
              </div>
            </div>
          </div>

          <div class="stats" :data-state="showVotes && stats ? 'shown' : 'hidden'">
            <div class="stats-head">
              <h4>Round insights</h4>

              <span class="consensus-pill" :class="consensusPillClass">
                {{ consensusPillLabel }}
              </span>
            </div>

            <div class="stat-grid">
              <div class="stat-cell">
                <div class="lbl">Average</div>

                <div class="val" :class="{ muted: !stats }">
                  {{ stats ? formatNum(stats.avg) : '-' }}
                </div>
              </div>

              <div class="stat-cell">
                <div class="lbl">Median</div>

                <div class="val" :class="{ muted: !stats }">
                  {{ stats ? formatNum(stats.median) : '-' }}
                </div>
              </div>

              <div class="stat-cell">
                <div class="lbl">Closest card</div>

                <div class="val" :class="{ muted: !stats }">
                  {{ stats ? stats.closest : '-' }}
                </div>
              </div>

              <div class="stat-cell">
                <div class="lbl">Spread</div>

                <div class="val" :class="{ muted: !stats }">
                  <template v-if="stats">
                    {{ stats.min }}<span class="spread-separator">-</span>{{ stats.max }}
                  </template>

                  <template v-else>-</template>
                </div>
              </div>
            </div>

            <div v-if="stats && Object.keys(stats.counts).length > 0" class="distribution">
              <div class="kicker">Distribution</div>

              <div
                v-for="(count, value) in stats.counts"
                :key="value"
                class="dist-row"
                :class="{ 'is-mode': count === stats.maxCount }"
              >
                <span class="lab">{{ value }}</span>

                <span
                  class="bar"
                  :style="{ '--w': `${(count / stats.maxCount) * 100}%` }"
                />

                <span class="ct">{{ count }}</span>
              </div>
            </div>
          </div>

          <div class="rail-footer">
            <div class="kicker">Share</div>

            <button
              class="btn"
              :class="shareCopied ? 'btn-primary' : 'btn-ghost'"
              :disabled="!firebaseConfig"
              type="button"
              @click="shareRoomConfig"
            >
              <svg
                v-if="!shareCopied"
                fill="none"
                height="13"
                viewBox="0 0 16 16"
                width="13"
              >
                <path
                  d="M11.5 2.5l-7 7M11.5 2.5H7M11.5 2.5V7"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.4"
                />

                <path
                  d="M13 9v3.5A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-7A1.5 1.5 0 0 1 4.5 4H8"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.4"
                />
              </svg>

              <svg
                v-else
                fill="none"
                height="13"
                viewBox="0 0 16 16"
                width="13"
              >
                <path
                  d="M3 8l3.5 3.5L13 4"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.6"
                />
              </svg>
              {{ shareCopied ? 'Copied' : 'Copy room + config link' }}
            </button>
          </div>
        </template>
      </aside>

      <main class="main">
        <div class="main-head">
          <h2>
            The table
            <span class="round-counter">round {{ currentRound }}</span>
          </h2>

          <div class="progress-pill">
            <span class="progress-dots">
              <span
                v-for="player in sortedRoomUsers"
                :key="player.userId"
                class="pdot"
                :class="{ done: player.vote != null }"
                :title="player.name"
              />
            </span>

            <span class="vote-count">{{ votedCount }}/{{ totalPlayers }} voted</span>
          </div>
        </div>

        <div class="table" data-cstyle="real">
          <div class="players">
            <div
              v-for="player in sortedRoomUsers"
              :key="player.userId"
              class="player"
            >
              <div class="avatar" :class="{ 'has-voted': player.vote != null }">
                <PlayerAvatar :name="player.name" :size="64" :user-id="player.userId" />
              </div>

              <div
                class="pcard"
                :class="{
                  flipped: showVotes && player.vote != null,
                  'has-vote': player.vote != null,
                  'no-vote': player.vote == null,
                }"
                :style="showVotes && player.vote != null ? { animationDelay: `${getPlayerIndex(player.userId) * 90}ms` } : {}"
              >
                <div
                  class="pcard-inner"
                  :style="showVotes && player.vote != null ? { transitionDelay: `${getPlayerIndex(player.userId) * 90}ms` } : {}"
                >
                  <div class="pcard-back">
                    <span class="logo">P0</span>
                  </div>

                  <div class="pcard-face">
                    {{ player.vote }}
                  </div>
                </div>
              </div>

              <div
                class="pname"
                :class="{
                  voted: player.vote != null,
                  you: player.userId === configStore.userId,
                }"
              >
                <span v-if="player.vote != null" class="check-mini">
                  <svg fill="none" height="8" viewBox="0 0 11 11" width="8">
                    <path
                      d="M2 5.5L4.5 8L9 3"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </span>

                <span>{{ player.name }}</span>
                <span v-if="player.userId === configStore.userId" class="you-tag">You</span>
              </div>
            </div>
          </div>
        </div>

        <div class="reactions">
          <span class="label">React</span>

          <button
            v-for="emoji in REACTIONS"
            :key="emoji"
            class="react-btn"
            type="button"
            @click="sendReaction(emoji)"
          >
            {{ emoji }}
          </button>
        </div>

        <div
          v-for="reaction in floatingReactions"
          :key="reaction.id"
          class="float-react"
          :style="{ left: `${reaction.x}px`, top: `${reaction.y}px` }"
        >
          {{ reaction.emoji }}
        </div>

        <div class="action-row room-action-row">
          <template v-if="!showVotes">
            <button
              class="btn btn-primary"
              :disabled="votedCount === 0"
              type="button"
              @click="revealVotes"
            >
              <svg fill="none" height="14" viewBox="0 0 16 16" width="14">
                <path
                  d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                  stroke="currentColor"
                  stroke-width="1.4"
                />

                <circle cx="8" cy="8" fill="currentColor" r="2" />
              </svg>
              Reveal votes
              <span v-if="!allVoted" class="button-meta">
                {{ votedCount }}/{{ totalPlayers }}
              </span>
            </button>

            <button class="btn btn-ghost" type="button" @click="resetVotes">
              Reset round
            </button>
          </template>
        </div>
      </main>

      <aside class="drawer" :class="{ collapsed: drawerCollapsed }">
        <div class="drawer-head">
          <h3>
            History
            <span class="count">{{ sessionHistory.length }}</span>
          </h3>

          <button
            :aria-label="drawerCollapsed ? 'Expand history' : 'Collapse history'"
            class="icon-btn"
            type="button"
            @click="drawerCollapsed = !drawerCollapsed"
          >
            <svg fill="none" height="14" viewBox="0 0 16 16" width="14">
              <path
                :d="drawerCollapsed ? 'M10 4l-4 4 4 4' : 'M6 4l4 4-4 4'"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.6"
              />
            </svg>
          </button>
        </div>

        <div class="drawer-body">
          <div
            v-for="history in [...sessionHistory].reverse()"
            :key="history.id"
            class="hist-item"
          >
            <div class="top">
              <span class="hid">{{ history.name }}</span>
              <span class="hvote">{{ history.finalVote ?? '-' }}</span>
            </div>

            <p class="htitle">Round {{ history.round }} - {{ history.duration }}</p>

            <div class="hmeta">
              <span>{{ history.participantCount }} players</span>

              <span :class="history.consensus === 'yes' ? 'history-agreed' : 'history-split'">
                {{ history.consensus === 'yes' ? 'agreed' : 'split' }}
              </span>
            </div>
          </div>

          <div v-if="sessionHistory.length === 0" class="hist-empty">
            No rounds completed yet
          </div>
        </div>
      </aside>
    </div>

    <div class="dock" :class="{ revealed: showVotes, 'dock-collapsed': dockCollapsed }">
      <button
        class="dock-collapse-btn"
        :title="dockCollapsed ? 'Expand vote panel' : 'Collapse vote panel'"
        type="button"
        @click="dockCollapsed = !dockCollapsed"
      >
        <svg fill="none" height="12" viewBox="0 0 16 16" width="12">
          <path
            :d="dockCollapsed ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.2"
          />
        </svg>
      </button>

      <template v-if="dockCollapsed">
        <div class="dock-mini-bar">
          <span class="dock-mini-label">
            {{ showVotes ? 'Votes revealed' : `Playing as ${userName}` }}
          </span>

          <span v-if="selectedVote != null && !showVotes" class="dock-mini-vote">
            {{ selectedVote }}
          </span>
        </div>
      </template>

      <template v-else>
        <template v-if="!showVotes">
          <div class="dock-cards">
            <button
              v-for="option in VOTE_OPTIONS"
              :key="option"
              class="vote-card"
              :class="{ selected: selectedVote === option }"
              :data-val="option"
              type="button"
              @click="castVote(option)"
            >
              <span class="corner tl">{{ option }}</span>
              {{ option }}
              <span class="corner br">{{ option }}</span>
            </button>
          </div>

          <div class="dock-actions">
            <span>Playing as</span>
            <span class="dock-user">{{ userName }}</span>
            <span class="sep">-</span>
            <span>tap a card to vote</span>
          </div>
        </template>

        <template v-else>
          <div class="dock-reveal-head">
            <span class="dock-reveal-label">Votes revealed</span>

            <span class="dock-reveal-hint">
              Review the stats and start a new round when ready.
            </span>
          </div>

          <div class="dock-reveal-confirm">
            <span class="dock-reveal-final">
              Average:
              <strong>{{ stats ? formatNum(stats.avg) : '-' }}</strong>

              <span v-if="stats?.consensus === 'consensus'" class="consensus-inline">
                Consensus
              </span>
            </span>

            <button class="btn btn-ghost" type="button" @click="resetVotes">
              <svg fill="none" height="13" viewBox="0 0 16 16" width="13">
                <path
                  d="M3 8a5 5 0 1 0 1.5-3.5"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-width="1.5"
                />

                <path
                  d="M2 3v3h3"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                />
              </svg>
              New round
            </button>
          </div>
        </template>
      </template>
    </div>

    <div v-if="showConfetti" class="confetti-host">
      <div
        v-for="piece in confettiPieces"
        :key="piece.id"
        class="confetti-piece"
        :style="{
          left: `${piece.left}%`,
          background: piece.bg,
          animationDelay: `${piece.delay}s`,
          animationDuration: `${piece.duration}s`,
          borderRadius: piece.shape,
          transform: `rotate(${piece.rotation}deg)`,
        }"
      />
    </div>
  </template>

  <div v-else class="setup-screen">
    <div class="setup-card">
      <div class="kicker">Room</div>
      <h1 class="setup-title">{{ roomNotFound ? 'Room not found' : 'Loading room' }}</h1>

      <p class="setup-desc">
        {{ roomNotFound ? 'This room could not be found. You will be redirected shortly.' : 'Connecting to the room.' }}
      </p>
    </div>
  </div>

  <v-snackbar v-model="roomNotFound" color="error" :timeout="-1">
    Room not found. Redirecting...
  </v-snackbar>

  <v-dialog v-model="showNamePrompt" max-width="480" persistent>
    <div class="p0-modal">
      <div class="p0-modal-head">
        <h2>Join room</h2>
        <p>{{ dialogDescription }}</p>
      </div>

      <div class="p0-modal-body">
        <form @submit.prevent="submitName">
          <div class="field-group">
            <label class="field-label">Your name</label>

            <input
              v-model="name"
              autofocus
              class="field-input"
              maxlength="20"
              placeholder="e.g. Alex"
              required
            >
          </div>
        </form>
      </div>

      <div class="p0-modal-foot">
        <button
          class="btn btn-primary"
          :disabled="!name.trim()"
          type="button"
          @click="submitName"
        >
          Join room
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { ref as dbRef, onDisconnect, onValue, update } from 'firebase/database'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import PlayerAvatar from '@/components/PlayerAvatar.vue'
  import { useAppStore } from '@/stores/app'
  import { useConfigStore } from '@/stores/config'
  import { copyText } from '@/utils/clipboard'

  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const configStore = useConfigStore()
  const roomId = route.params.roomId as string

  const MAX_NAME_LENGTH = 20
  const VOTE_OPTIONS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, '?', '☕'] as const
  const REACTIONS = ['👍', '🔥', '🤔', '😅', '🎯', '💯', '☕', '🚀'] as const
  const DECK_NUMS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55]

  const { userName, firebaseConfig } = storeToRefs(configStore)

  const currentRoom = ref<{
    name: string
    createdAt: number
    createdBy: string
    settings?: { showVotes?: boolean, v?: number }
    lastActivity?: number
  } | null>(null)
  const roomUsers = ref<Record<string, { name: string, joinedAt: number, vote?: number | string }>>({})

  const db = configStore.getDb()
  const name = ref(userName.value || '')
  const showNamePrompt = ref(!userName.value)
  const roomNotFound = ref(false)
  const drawerCollapsed = ref(false)
  const railCollapsed = ref(false)
  const dockCollapsed = ref(false)
  const shareCopied = ref(false)
  const currentRound = ref(1)
  const showConfetti = ref(false)
  const confettiPieces = ref<Array<{
    id: string
    left: number
    bg: string
    delay: number
    duration: number
    rotation: number
    shape: string
  }>>([])
  const floatingReactions = ref<Array<{ id: string, emoji: string, x: number, y: number }>>([])

  let hasAutoJoined = false
  let redirectTimeout: ReturnType<typeof setTimeout> | null = null
  let roundStartTime = Date.now()
  let unsubscribeRoom: (() => void) | null = null
  let unsubscribeUsers: (() => void) | null = null

  const showVotes = computed(() => currentRoom.value?.settings?.showVotes === true)
  const votedCount = computed(() =>
    Object.values(roomUsers.value).filter(user => user.vote != null).length,
  )
  const totalPlayers = computed(() => Object.keys(roomUsers.value).length)
  const allVoted = computed(() => votedCount.value > 0 && votedCount.value === totalPlayers.value)
  const selectedVote = computed(() => {
    if (!configStore.userId || !roomUsers.value[configStore.userId]) return null
    return roomUsers.value[configStore.userId].vote ?? null
  })

  const sortedRoomUsers = computed(() => {
    const withId = Object.entries(roomUsers.value).map(([userId, user]) => ({ userId, ...user }))

    if (showVotes.value) {
      const getVoteKey = (vote: number | string | undefined) => {
        if (vote == null) {
          return { rank: 2, value: '' }
        }

        if (typeof vote === 'number') {
          return { rank: 0, value: vote }
        }

        return { rank: 1, value: String(vote) }
      }

      return withId.toSorted((a, b) => {
        const keyA = getVoteKey(a.vote)
        const keyB = getVoteKey(b.vote)

        if (keyA.rank !== keyB.rank) {
          return keyA.rank - keyB.rank
        }

        if (keyA.rank === 0) {
          return (keyA.value as number) - (keyB.value as number)
        }

        return keyA.value < keyB.value ? -1 : (keyA.value > keyB.value ? 1 : 0)
      })
    }

    return withId.toSorted((a, b) => a.joinedAt - b.joinedAt)
  })

  const numericVotes = computed(() =>
    Object.values(roomUsers.value)
      .map(user => user.vote)
      .filter((vote): vote is number => typeof vote === 'number'),
  )

  const averageVote = computed(() => {
    if (numericVotes.value.length === 0) return null

    const sum = numericVotes.value.reduce((acc, val) => acc + val, 0)
    return Number.parseFloat((sum / numericVotes.value.length).toFixed(2))
  })

  const medianVote = computed(() => {
    if (numericVotes.value.length === 0) return null

    const sorted = numericVotes.value.toSorted((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  })

  const stats = computed(() => {
    if (!showVotes.value || averageVote.value == null || medianVote.value == null) return null

    const nums = numericVotes.value
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const spread = max - min
    const counts: Record<number, number> = {}
    for (const num of nums) {
      counts[num] = (counts[num] || 0) + 1
    }
    const maxCount = Math.max(...Object.values(counts))

    let closest = DECK_NUMS[0]
    let bestDistance = Math.abs(averageVote.value - DECK_NUMS[0])
    for (const num of DECK_NUMS) {
      const distance = Math.abs(averageVote.value - num)
      if (distance < bestDistance - 1e-9) {
        closest = num
        bestDistance = distance
      } else if (Math.abs(distance - bestDistance) < 1e-9 && num > closest) {
        closest = num
      }
    }

    const consensus = spread === 0
      ? 'consensus'
      : (spread <= 3 && Object.keys(counts).length <= 2 ? 'close' : 'split')

    return {
      avg: averageVote.value,
      median: medianVote.value,
      closest,
      min,
      max,
      spread,
      counts,
      maxCount,
      total: nums.length,
      consensus,
    }
  })

  const consensusPillClass = computed(() => {
    if (!stats.value) return 'wait'
    return stats.value.consensus === 'split' ? 'no' : 'yes'
  })

  const consensusPillLabel = computed(() => {
    if (!stats.value) return 'Waiting'
    if (stats.value.consensus === 'consensus') return 'Consensus'
    if (stats.value.consensus === 'close') return 'Near match'
    return 'Split vote'
  })

  const dialogDescription = computed(() =>
    currentRoom.value ? `Joining room "${currentRoom.value.name}".` : 'Joining room.',
  )

  const sessionHistory = ref<Array<{
    id: string
    name: string
    finalVote: string | null
    round: number
    duration: string
    participantCount: number
    consensus: 'yes' | 'split'
  }>>([])

  watch(userName, newName => {
    if (!currentRoom.value || !db || !configStore.userId) return
    const userRef = dbRef(db, `rooms/${roomId}/users/${configStore.userId}`)
    update(userRef, { name: newName || 'Anonymous' }).catch(console.error)
  })

  watch([currentRoom, roomUsers], () => {
    if (!currentRoom.value) return
    appStore.setRoomInfo(roomId, currentRoom.value.name, totalPlayers.value)
  }, { deep: true })

  onMounted(() => {
    if (!db) return

    const roomRef = dbRef(db, `rooms/${roomId}`)
    unsubscribeRoom = onValue(roomRef, snapshot => {
      const data = snapshot.val()

      if (!data) {
        roomNotFound.value = true
        currentRoom.value = null
        configStore.setActiveRoom(null, null)
        appStore.setRoomInfo(null, '', 0)
        redirectTimeout = setTimeout(() => router.replace('/'), 3000)
        return
      }

      roomNotFound.value = false
      currentRoom.value = data
      configStore.setActiveRoom(roomId, data.name)
      appStore.setRoomInfo(roomId, data.name, totalPlayers.value)

      if (!hasAutoJoined && userName.value) {
        hasAutoJoined = true
        joinRoom()
      }
    })

    const usersRef = dbRef(db, `rooms/${roomId}/users`)
    unsubscribeUsers = onValue(usersRef, snapshot => {
      roomUsers.value = snapshot.val() || {}
    })
  })

  onUnmounted(() => {
    unsubscribeRoom?.()
    unsubscribeUsers?.()
    if (redirectTimeout !== null) clearTimeout(redirectTimeout)
  })

  function getPlayerIndex (userId: string): number {
    return sortedRoomUsers.value.findIndex(player => player.userId === userId)
  }

  function formatNum (num: number | null | undefined): string {
    if (num == null) return '-'
    return Number.isInteger(num) ? String(num) : String(Number.parseFloat(num.toFixed(2)))
  }

  function joinRoom () {
    if (!db || !configStore.userId) return
    const userRef = dbRef(db, `rooms/${roomId}/users/${configStore.userId}`)
    update(userRef, { name: userName.value || 'Anonymous', joinedAt: Date.now() }).catch(console.error)
    onDisconnect(userRef).remove()
  }

  function submitName () {
    const userNameValue = name.value.trim().slice(0, MAX_NAME_LENGTH)
    if (!userNameValue) return

    name.value = userNameValue
    configStore.setUserName(userNameValue)
    hasAutoJoined = true
    joinRoom()
    showNamePrompt.value = false
  }

  async function shareRoomConfig () {
    if (!firebaseConfig.value) return

    const encoded = btoa(JSON.stringify(firebaseConfig.value))
    const url = `${window.location.origin}${import.meta.env.BASE_URL}rooms/${encodeURIComponent(roomId)}?config=${encodeURIComponent(encoded)}`
    const ok = await copyText(url)

    if (ok) {
      shareCopied.value = true
      appStore.showToast('Room link with config copied.', 'success')
      setTimeout(() => {
        shareCopied.value = false
      }, 2000)
    } else {
      appStore.showToast('Copy failed. Your browser blocked clipboard access.', 'error')
    }
  }

  function castVote (value: number | string) {
    if (!db || !configStore.userId || showVotes.value) return

    const userRef = dbRef(db, `rooms/${roomId}/users/${configStore.userId}`)
    update(userRef, { vote: value }).catch(console.error)

    const roomRef = dbRef(db, `rooms/${roomId}`)
    update(roomRef, { lastActivity: Date.now() }).catch(console.error)
  }

  function revealVotes () {
    if (!db) return

    const roomRef = dbRef(db, `rooms/${roomId}`)
    update(roomRef, {
      'settings/showVotes': true,
      'lastActivity': Date.now(),
    }).catch(console.error)

    setTimeout(() => {
      if (stats.value?.consensus === 'consensus' && stats.value.total >= 2) {
        triggerConfetti()
      }
    }, 900)
  }

  function resetVotes () {
    if (!db) return

    if (showVotes.value && currentRoom.value) {
      const duration = Math.max(1, Math.round((Date.now() - roundStartTime) / 60_000))
      sessionHistory.value.push({
        id: `${Date.now()}`,
        name: currentRoom.value.name,
        finalVote: stats.value ? formatNum(stats.value.avg) : null,
        round: currentRound.value,
        duration: `${duration}m`,
        participantCount: totalPlayers.value,
        consensus: stats.value?.consensus === 'consensus' || stats.value?.consensus === 'close' ? 'yes' : 'split',
      })
      currentRound.value += 1
      roundStartTime = Date.now()
    }

    const roomRef = dbRef(db, `rooms/${roomId}`)
    const updates: Record<string, unknown> = {
      'settings/showVotes': false,
      'lastActivity': Date.now(),
    }

    for (const userId of Object.keys(roomUsers.value)) {
      updates[`users/${userId}/vote`] = null
    }

    update(roomRef, updates).catch(console.error)
  }

  function triggerConfetti () {
    const colors = ['#4f8cff', '#3ecf8e', '#f5b14d', '#f05a5a', '#a78bfa', '#ffffff']
    confettiPieces.value = Array.from({ length: 80 }, (_, index) => ({
      id: `c${index}`,
      left: Math.random() * 100,
      bg: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.4,
      duration: 1.8 + Math.random() * 1.4,
      rotation: Math.random() * 360,
      shape: Math.random() > 0.5 ? '50%' : '2px',
    }))
    showConfetti.value = true
    setTimeout(() => {
      showConfetti.value = false
    }, 3500)
  }

  function sendReaction (emoji: string) {
    const id = `r${Date.now()}-${Math.random()}`
    floatingReactions.value.push({
      id,
      emoji,
      x: 80 + Math.random() * 200,
      y: 60 + Math.random() * 80,
    })
    setTimeout(() => {
      floatingReactions.value = floatingReactions.value.filter(reaction => reaction.id !== id)
    }, 1700)
  }
</script>
