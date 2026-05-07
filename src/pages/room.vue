<template>
  <v-container>
    <v-card v-if="currentRoom && !showNamePrompt" class="mt-4">
      <v-card-title class="d-flex align-center">
        {{ currentRoom.name }}
        <v-btn
          class="ms-2"
          density="compact"
          :disabled="!firebaseConfig"
          icon="mdi-link-variant"
          variant="tonal"
          @click="shareRoomConfig"
        />
      </v-card-title>

      <v-card-text>
        <div class="text-body-2 mb-2">Playing as: {{ userName }}</div>

        <div class="text-subtitle-1 mb-2">Vote cards</div>

        <v-row align="center" class="mb-4">
          <v-col cols="12" sm="10">
            <div class="vote-cards">
              <v-chip
                v-for="option in VOTE_OPTIONS"
                :key="option"
                class="vote-card ma-1"
                :class="{ 'selected': selectedVote === option }"
                @click="castVote(option)"
              >
                {{ option }}
              </v-chip>
            </div>
          </v-col>
        </v-row>

        <v-row class="mb-4">
          <v-col cols="12" sm="6">
            <v-btn block color="primary" :disabled="showVotes || votedCount === 0" @click="revealVotes">
              Reveal votes
            </v-btn>
          </v-col>

          <v-col cols="12" sm="6">
            <v-btn block color="error" @click="resetVotes">
              Reset votes
            </v-btn>
          </v-col>
        </v-row>

        <v-data-table
          class="elevation-1"
          :headers="headers"
          hide-default-footer
          :items="sortedRoomUsers"
          items-per-page="-1"
        >
          <template #header.vote="{ column }">
            <span>
              {{ column.title }}
              <span v-if="totalPlayers > 0" class="text-caption ms-2">
                ({{ votedCount }}/{{ totalPlayers }})
              </span>
            </span>
          </template>

          <template #item.vote="{ item }">
            <span v-if="showVotes">
              {{ item.vote != null ? item.vote : 'No vote' }}
            </span>

            <span v-else>
              {{ item.vote != null ? 'Voted' : 'No vote' }}
            </span>
          </template>

          <template #body.append>
            <tr>
              <td class="text-right"><strong>Average</strong></td>

              <td>
                <span v-if="showVotes && averageVote != null">{{ averageVote }}</span>
                <span v-else>-</span>
              </td>
            </tr>
          </template>
        </v-data-table>

      </v-card-text>
    </v-card>

    <v-snackbar v-model="roomNotFound" color="error" :timeout="-1">
      Room not found. Redirecting...
    </v-snackbar>

    <v-dialog v-model="showNamePrompt" max-width="500" persistent>
      <v-card>
        <v-card-title>Join room</v-card-title>

        <v-card-text>
          <p>{{ dialogDescription }}</p>

          <v-form @submit.prevent="submitName">
            <v-text-field
              v-model="name"
              autofocus
              :counter="MAX_NAME_LENGTH"
              label="Your name"
              :maxlength="MAX_NAME_LENGTH"
              required
            />

            <v-card-actions class="justify-end">
              <v-btn color="primary" :disabled="!name" type="submit">
                Join room
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
  import type { DataTableHeader } from 'vuetify'
  import { ref as dbRef, onDisconnect, onValue, update } from 'firebase/database'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useConfigStore } from '@/stores/config'

  const route = useRoute()
  const router = useRouter()
  const configStore = useConfigStore()
  const roomId = route.params.roomId as string

  const MAX_NAME_LENGTH = 20
  const VOTE_OPTIONS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, '?', '☕']
  const { userName, firebaseConfig } = storeToRefs(configStore)

  const headers: DataTableHeader[] = [
    { title: 'Name', value: 'name', width: '75%' },
    { title: 'Vote', value: 'vote', width: '25%' },
  ]

  const currentRoom = ref<{ name: string, createdAt: number, createdBy: string, settings?: { showVotes?: boolean, v?: number }, lastActivity?: number } | null>(null)
  const roomUsers = ref<Record<string, { name: string, joinedAt: number, vote?: number | string }>>({})

  const db = configStore.getDb()

  const name = ref(userName.value || '')
  const showNamePrompt = ref(!userName.value)
  const roomNotFound = ref(false)
  let hasAutoJoined = false
  let redirectTimeout: ReturnType<typeof setTimeout> | null = null

  const showVotes = computed(() => currentRoom.value?.settings?.showVotes === true)
  const votedCount = computed(() =>
    Object.values(roomUsers.value).filter(user => user.vote != null).length,
  )
  const totalPlayers = computed(() => Object.keys(roomUsers.value).length)
  const selectedVote = computed(() => {
    if (!configStore.userId || !roomUsers.value[configStore.userId]) return null
    return roomUsers.value[configStore.userId].vote ?? null
  })

  const averageVote = computed(() => {
    const votes = Object.values(roomUsers.value)
      .map(user => user.vote)
      .filter(vote => typeof vote === 'number') as number[]

    if (votes.length === 0) return null

    const sum = votes.reduce((acc, val) => acc + val, 0)
    return sum / votes.length
  })

  const sortedRoomUsers = computed(() => {
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

      return Object.values(roomUsers.value).toSorted((a, b) => {
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

    return Object.values(roomUsers.value).toSorted((a, b) => a.joinedAt - b.joinedAt)
  })

  const dialogDescription = computed(() =>
    currentRoom.value ? `Joining room "${currentRoom.value.name}".` : 'Joining room.',
  )

  watch(userName, newName => {
    if (!currentRoom.value || !db || !configStore.userId) return
    const userRef = dbRef(db, `rooms/${roomId}/users/${configStore.userId}`)
    update(userRef, { name: newName || 'Anonymous' }).catch(console.error)
  })

  let unsubscribeRoom: (() => void) | null = null
  let unsubscribeUsers: (() => void) | null = null

  onMounted(() => {
    if (!db) return

    const roomRef = dbRef(db, `rooms/${roomId}`)
    unsubscribeRoom = onValue(roomRef, snapshot => {
      const data = snapshot.val()

      if (!data) {
        roomNotFound.value = true
        configStore.setActiveRoom(null, null)
        redirectTimeout = setTimeout(() => router.replace('/'), 3000)
        return
      }

      currentRoom.value = data
      configStore.setActiveRoom(roomId, data.name)

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

  function shareRoomConfig () {
    if (!firebaseConfig.value) return

    const encoded = btoa(JSON.stringify(firebaseConfig.value))
    const url = `${window.location.origin}${import.meta.env.BASE_URL}room/${encodeURIComponent(roomId)}?config=${encodeURIComponent(encoded)}`

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => window.alert('Room link with config copied to clipboard'))
        .catch(() => window.prompt('Copy this room URL', url))
    } else {
      window.prompt('Copy this room URL', url)
    }
  }

  function castVote (value: number | string) {
    if (!db || !configStore.userId) return

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
  }

  function resetVotes () {
    if (!db) return

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
</script>

<style scoped>
.vote-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vote-card {
  width: 60px;
  height: 80px;
  border-radius: 8px;
  background: white !important;
  color: black !important;
  border: 2px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.vote-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.vote-card.selected {
  border-color: #1976d2;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
  background: #1976d2 !important;
  color: white !important;
}
</style>
