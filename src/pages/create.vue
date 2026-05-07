<template>
  <v-container>
    <v-card class="mx-auto mt-8" max-width="500">
      <v-card-title>Create a room</v-card-title>

      <v-card-text>
        <v-form @submit.prevent="createRoom">
          <v-text-field
            v-model="name"
            autofocus
            :counter="MAX_NAME_LENGTH"
            label="Your name"
            :maxlength="MAX_NAME_LENGTH"
            required
          />

          <v-text-field
            v-model="roomName"
            label="Room name"
            required
          />

          <v-card-actions class="justify-end">
            <v-btn color="primary" :disabled="!name.trim() || !roomName.trim()" type="submit">
              Create
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
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
