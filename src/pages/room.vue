<template>
  <template v-if="currentRoom && !showNamePrompt">
    <div class="shell">
      <aside class="rail" :class="{ collapsed: railCollapsed }">
        <div class="rail-head">
          <span v-if="!railCollapsed" class="kicker">Now voting</span>

          <v-btn
            :aria-label="railCollapsed ? 'Expand panel' : 'Collapse panel'"
            class="icon-btn"
            density="compact"
            icon
            variant="text"
            @click="railCollapsed = !railCollapsed"
          >
            <v-icon :icon="railCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left'" size="16" />
          </v-btn>
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

          <RoundStatsPanel :stats="stats" />

          <div class="rail-footer">
            <div class="kicker">Share</div>

            <v-btn
              class="p0-btn"
              :class="shareCopied ? 'p0-btn-primary' : 'p0-btn-ghost'"
              :disabled="!firebaseConfig"
              :prepend-icon="shareCopied ? 'mdi-check' : 'mdi-share-variant'"
              variant="flat"
              @click="shareRoomConfig"
            >
              {{ shareCopied ? 'Copied' : 'Copy room + config link' }}
            </v-btn>
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

        <PokerTable
          :current-user-id="configStore.userId"
          :players="sortedRoomUsers"
          :show-votes="showVotes"
        />

        <ReactionBar
          :reactions="REACTIONS"
          @react="sendReaction"
        />

        <FloatingReactions :reactions="floatingReactions" />

        <div class="action-row room-action-row">
          <template v-if="!showVotes">
            <v-btn
              class="p0-btn p0-btn-primary"
              :disabled="votedCount === 0"
              prepend-icon="mdi-eye"
              variant="flat"
              @click="revealVotes"
            >
              Reveal votes
              <span v-if="!allVoted" class="button-meta">
                {{ votedCount }}/{{ totalPlayers }}
              </span>
            </v-btn>

            <v-btn
              class="p0-btn p0-btn-ghost"
              variant="flat"
              @click="resetVotes"
            >
              Reset round
            </v-btn>
          </template>
        </div>
      </main>

      <RoomHistoryDrawer
        v-model:collapsed="drawerCollapsed"
        :history="sessionHistory"
      />
    </div>

    <VoteDock
      v-model:collapsed="dockCollapsed"
      :selected-vote="selectedVote"
      :show-votes="showVotes"
      :stats="stats"
      :user-name="userName"
      :vote-options="VOTE_OPTIONS"
      @cast-vote="castVote"
      @reset-votes="resetVotes"
    />

    <ConfettiBurst
      v-if="showConfetti"
      :pieces="confettiPieces"
    />
  </template>

  <v-container v-else class="setup-screen" fluid>
    <v-card class="setup-card" flat>
      <div class="kicker">Room</div>
      <h1 class="setup-title">{{ roomNotFound ? 'Room not found' : 'Loading room' }}</h1>

      <p class="setup-desc">
        {{ roomNotFound ? 'This room could not be found. You will be redirected shortly.' : 'Connecting to the room.' }}
      </p>
    </v-card>
  </v-container>

  <v-snackbar v-model="roomNotFound" color="error" :timeout="-1">
    Room not found. Redirecting...
  </v-snackbar>

  <v-dialog v-model="showNamePrompt" max-width="480" persistent>
    <v-card class="p0-modal" flat>
      <div class="p0-modal-head">
        <h2>Join room</h2>
        <p>{{ dialogDescription }}</p>
      </div>

      <v-form @submit.prevent="submitName">
        <div class="p0-modal-body">
          <v-text-field
            v-model="name"
            autofocus
            class="p0-field"
            counter="20"
            hide-details="auto"
            label="Your name"
            maxlength="20"
            placeholder="e.g. Alex"
            required
            variant="outlined"
          />
        </div>

        <div class="p0-modal-foot">
          <v-btn
            class="p0-btn p0-btn-primary"
            :disabled="!name.trim()"
            type="submit"
            variant="flat"
          >
            Join room
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { ref as dbRef, onDisconnect, onValue, update } from 'firebase/database'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ConfettiBurst from '@/components/ConfettiBurst.vue'
  import FloatingReactions from '@/components/FloatingReactions.vue'
  import PokerTable from '@/components/PokerTable.vue'
  import ReactionBar from '@/components/ReactionBar.vue'
  import RoomHistoryDrawer from '@/components/RoomHistoryDrawer.vue'
  import RoundStatsPanel from '@/components/RoundStatsPanel.vue'
  import VoteDock from '@/components/VoteDock.vue'
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
  type ConsensusState = 'consensus' | 'close' | 'split'

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

    const consensus: ConsensusState = spread === 0
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
