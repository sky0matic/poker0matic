<template>
  <v-container>
    <v-card v-if="!roomId">
      <v-card-title>
        Create a room
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="createRoom">
          <v-text-field
            v-model="roomName"
            autofocus
            label="Room name"
            required
          />

          <v-card-actions class="justify-end">
            <v-btn color="primary" :disabled="!roomName" type="submit">
              Create
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>

    <v-card v-if="roomId && currentRoom && !showNamePrompt" class="mt-4">
      <v-card-title>
        {{ currentRoom.name }}
        <v-spacer />
        <span class="text-body-2">Playing as: {{ userName }}</span>
      </v-card-title>

      <v-card-text>
        <v-subheader>Vote cards</v-subheader>

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
            <v-btn block color="primary" :disabled="showVotes" @click="revealVotes">
              Reveal votes
            </v-btn>
          </v-col>

          <v-col cols="12" sm="6">
            <v-btn block color="error" @click="resetVotes">
              Reset votes
            </v-btn>
          </v-col>
        </v-row>

        <v-subheader>Players in room:</v-subheader>

        <v-table class="fixed-columns">
          <thead>
            <tr>
              <th class="text-left">Name</th>
              <th class="text-left">Vote</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(user, userId) in roomUsers" :key="userId">
              <td>{{ user.name }}</td>

              <td>
                <span v-if="showVotes">
                  {{ user.vote !== undefined ? user.vote : 'No vote' }}
                </span>

                <span v-else>
                  <span v-if="user.vote !== undefined">Voted</span>
                  <span v-else>No vote yet</span>
                </span>
              </td>
            </tr>

            <tr v-if="Object.keys(roomUsers).length === 0">
              <td colspan="2">No players yet</td>
            </tr>
          </tbody>
        </v-table>

        <v-card-actions class="mt-4">
          <v-btn
            color="secondary"
            :disabled="!roomId || !firebaseConfig"
            @click="shareRoomConfig"
          >
            Share room + config
          </v-btn>
        </v-card-actions>
      </v-card-text>
    </v-card>

    <v-dialog v-model="showNamePrompt" max-width="500" persistent>
      <v-card>
        <v-card-title>{{ dialogTitle }}</v-card-title>

        <v-card-text>
          <p v-if="roomId">{{ dialogDescription }}</p>
          <p v-else>{{ dialogDescription }}</p>

          <v-form @submit.prevent="submitName">
            <v-text-field
              v-model="name"
              autofocus
              counter="20"
              label="Your name"
              maxlength="20"
              required
            />

            <v-card-actions class="justify-end">
              <v-btn color="primary" :disabled="!name" type="submit">
                {{ dialogAction }}
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
  import { initializeApp } from 'firebase/app'
  import { ref as dbRef, getDatabase, onDisconnect, onValue, set, update } from 'firebase/database'
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useConfigStore } from '@/stores/config'

  const route = useRoute()
  const router = useRouter()
  const configStore = useConfigStore()

  // Initialize config on component mount
  configStore.initializeConfig()

  const roomName = ref('')
  const MAX_NAME_LENGTH = 20
  const VOTE_OPTIONS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55]
  const { userName, firebaseConfig } = storeToRefs(configStore)

  // Room data
  const currentRoom = ref<{ name: string, createdAt: number, createdBy: string, settings?: { showVotes?: boolean, v?: number }, lastActivity?: number } | null>(null)
  const roomUsers = ref<Record<string, { name: string, joinedAt: number, vote?: number }>>({})

  // Firebase initialization - only if config exists
  let app: any = null
  let db: any = null

  if (configStore.firebaseConfig) {
    app = initializeApp(configStore.firebaseConfig)
    db = getDatabase(app)
  }

  const roomId = computed(() => {
    const id = route.query.roomId
    return typeof id === 'string' && id.trim().length > 0 ? id : null
  })

  const name = ref(userName.value || '')
  const showNamePrompt = ref(true)
  const showVotes = computed(() => currentRoom.value?.settings?.showVotes === true)
  const selectedVote = computed(() => {
    if (!configStore.userId || !roomUsers.value[configStore.userId]) return null
    return roomUsers.value[configStore.userId].vote ?? null
  })

  // Dialog content based on context
  const dialogTitle = computed(() => roomId.value ? 'Join room' : 'Create room')
  const dialogAction = computed(() => roomId.value ? 'Join room' : 'Create room')
  const dialogDescription = computed(() => {
    if (roomId.value) {
      return currentRoom.value ? `Joining room "${currentRoom.value.name}".` : 'Joining room.'
    }
    return 'To create a room, please enter your name below.'
  })

  // Create user ref when roomId and db are available
  const myUserPath = computed(() => {
    if (!roomId.value || !configStore.userId) return null
    return `rooms/${roomId.value}/users/${configStore.userId}`
  })

  // Watch for roomId changes to fetch room data (but don't auto-join)
  watch(roomId, (newRoomId, oldRoomId) => {
    // Clean up previous listeners
    if (oldRoomId) {
      // Note: In a real app, you'd want to store and clean up listeners
    }

    if (newRoomId && db) {
      // Listen to room data
      const roomRef = dbRef(db, `rooms/${newRoomId}`)
      onValue(roomRef, snapshot => {
        currentRoom.value = snapshot.val()
      })

      // Listen to users in room
      const usersRef = dbRef(db, `rooms/${newRoomId}/users`)
      onValue(usersRef, snapshot => {
        roomUsers.value = snapshot.val() || {}
      })
    } else {
      currentRoom.value = null
      roomUsers.value = {}
    }
  }, { immediate: true })

  function createRoom () {
    if (!roomName.value.trim() || !db) return

    const newRoomId = Math.random().toString(36).slice(2, 10)
    const userNameValue = name.value.trim().slice(0, MAX_NAME_LENGTH) || 'Anonymous'
    name.value = userNameValue
    configStore.setUserName(userNameValue)

    // Create room in Firebase
    const roomRef = dbRef(db, `rooms/${newRoomId}`)
    set(roomRef, {
      name: roomName.value,
      createdAt: Date.now(),
      createdBy: configStore.userId,
      settings: {
        showVotes: false,
        v: 0,
      },
      lastActivity: Date.now(),
    })

    // Set user presence
    const userRef = dbRef(db, `rooms/${newRoomId}/users/${configStore.userId}`)
    set(userRef, {
      name: userNameValue,
      joinedAt: Date.now(),
    })

    // Set up disconnect cleanup
    onDisconnect(userRef).remove()

    router.push({
      path: '/',
      query: {
        roomId: newRoomId,
      },
    })
  }

  function submitName () {
    const userNameValue = name.value.trim().slice(0, MAX_NAME_LENGTH)
    if (!userNameValue) return

    name.value = userNameValue

    // If we have a roomId, set user presence with required data
    if (roomId.value && db && configStore.userId) {
      const userRef = dbRef(db, `rooms/${roomId.value}/users/${configStore.userId}`)
      update(userRef, {
        name: userNameValue,
        joinedAt: Date.now(),
      })
      onDisconnect(userRef).remove()
    }

    configStore.setUserName(userNameValue)
    showNamePrompt.value = false
  }
  function shareRoomConfig () {
    if (!roomId.value || !firebaseConfig.value) return

    const encoded = btoa(JSON.stringify(firebaseConfig.value))
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?roomId=${encodeURIComponent(roomId.value)}&config=${encodeURIComponent(encoded)}`

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => window.alert('Room link with config copied to clipboard'))
        .catch(() => window.prompt('Copy this room URL', url))
    } else {
      window.prompt('Copy this room URL', url)
    }
  }

  function castVote (value: number) {
    if (!roomId.value || !db || !configStore.userId) return

    const userRef = dbRef(db, `rooms/${roomId.value}/users/${configStore.userId}`)
    update(userRef, {
      vote: value,
    })

    const roomRef = dbRef(db, `rooms/${roomId.value}`)
    update(roomRef, {
      lastActivity: Date.now(),
    })
  }

  function revealVotes () {
    if (!roomId.value || !db) return

    const roomRef = dbRef(db, `rooms/${roomId.value}`)
    update(roomRef, {
      'settings/showVotes': true,
      'lastActivity': Date.now(),
    })
  }

  function resetVotes () {
    if (!roomId.value || !db) return

    const roomRef = dbRef(db, `rooms/${roomId.value}`)
    const updates: Record<string, unknown> = {
      'settings/showVotes': false,
      'lastActivity': Date.now(),
    }

    for (const userId of Object.keys(roomUsers.value)) {
      updates[`users/${userId}/vote`] = null
    }

    update(roomRef, updates)
  }
</script>

<style scoped>
.fixed-columns table {
  table-layout: fixed;
  width: 100%;
}
.fixed-columns th:first-child,
.fixed-columns td:first-child {
  width: 60%;
}
.fixed-columns th:nth-child(2),
.fixed-columns td:nth-child(2) {
  width: 40%;
  white-space: nowrap;
}

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
