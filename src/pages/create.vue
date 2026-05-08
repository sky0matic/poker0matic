<template>
  <div class="setup-screen">
    <div class="setup-card">
      <div>
        <div class="kicker">New session</div>
        <h1 class="setup-title">Create a room</h1>
        <p class="setup-desc">Give your planning session a name and start estimating together.</p>
      </div>

      <form class="setup-form" @submit.prevent="createRoom">
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

        <div class="field-group">
          <label class="field-label">Room name</label>

          <input
            v-model="roomName"
            class="field-input"
            placeholder="e.g. Sprint 42 planning"
            required
          >
        </div>

        <button
          class="btn btn-primary"
          :disabled="!name.trim() || !roomName.trim()"
          type="submit"
        >
          Create room
        </button>
      </form>
    </div>
  </div>
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
