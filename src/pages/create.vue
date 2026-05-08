<template>
  <v-container class="setup-screen" fluid>
    <v-card class="setup-card" flat>
      <div>
        <div class="kicker">New session</div>
        <h1 class="setup-title">Create a room</h1>
        <p class="setup-desc">Give your planning session a name and start estimating together.</p>
      </div>

      <v-form class="setup-form" @submit.prevent="createRoom">
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

        <v-text-field
          v-model="roomName"
          class="p0-field"
          hide-details="auto"
          label="Room name"
          placeholder="e.g. Sprint 42 planning"
          required
          variant="outlined"
        />

        <v-btn
          class="p0-btn p0-btn-primary"
          :disabled="!name.trim() || !roomName.trim()"
          prepend-icon="mdi-plus"
          type="submit"
          variant="flat"
        >
          Create room
        </v-btn>
      </v-form>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref as dbRef, onDisconnect, set } from 'firebase/database'
  import { storeToRefs } from 'pinia'
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useConfigStore } from '@/stores/config'

  const router = useRouter()
  const configStore = useConfigStore()
  const { userName } = storeToRefs(configStore)

  const MAX_NAME_LENGTH = 20
  const name = ref(userName.value || '')
  const roomName = ref('')
  const db = configStore.getDb()

  function createRoom () {
    if (!name.value.trim() || !roomName.value.trim() || !db) return

    const userNameValue = name.value.trim().slice(0, MAX_NAME_LENGTH) || 'Anonymous'
    const newRoomId = Math.random().toString(36).slice(2, 10)

    configStore.setUserName(userNameValue)

    const roomRef = dbRef(db, `rooms/${newRoomId}`)
    set(roomRef, {
      name: roomName.value.trim(),
      createdAt: Date.now(),
      createdBy: configStore.userId,
      settings: { showVotes: false, v: 0 },
      lastActivity: Date.now(),
    }).catch(console.error)

    const userRef = dbRef(db, `rooms/${newRoomId}/users/${configStore.userId}`)
    set(userRef, {
      name: userNameValue,
      joinedAt: Date.now(),
    }).catch(console.error)

    onDisconnect(userRef).remove()

    router.push(`/rooms/${newRoomId}`)
  }
</script>
