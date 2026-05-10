<template>
  <v-container class="setup-screen" fluid>
    <v-card class="setup-card page-card" flat>
      <div>
        <div class="kicker">New session</div>
        <h1 class="setup-title">Create a room</h1>
        <p class="setup-desc">Give your planning session a name and configure the deck.</p>
      </div>

      <v-form class="setup-form" @submit.prevent="createRoom">
        <RoomSettingsForm v-model="settings" autofocus />

        <v-btn
          class="p0-btn p0-btn-primary"
          :disabled="!settings.name.trim()"
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
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import RoomSettingsForm, { type RoomFormSettings } from '@/components/RoomSettingsForm.vue'
  import { useConfigStore } from '@/stores/config'

  const router = useRouter()
  const configStore = useConfigStore()
  const db = configStore.getDb()

  const settings = ref<RoomFormSettings>({
    name: '',
    deck: 'fibonacci',
    customDeck: '',
    specialQuestion: true,
    specialCoffee: true,
    historyEnabled: true,
  })

  function createRoom () {
    if (!settings.value.name.trim() || !db) return

    const { name, deck, customDeck, specialQuestion, specialCoffee, historyEnabled } = settings.value
    const userName = configStore.userName || 'Guest'
    const newRoomId = Math.random().toString(36).slice(2, 10)

    const roomRef = dbRef(db, `rooms/${newRoomId}`)
    set(roomRef, {
      name: name.trim(),
      createdAt: Date.now(),
      createdBy: configStore.userId,
      settings: {
        showVotes: false,
        v: 0,
        deck,
        customDeck: deck === 'custom' ? customDeck.trim() : null,
        specialQuestion,
        specialCoffee,
        historyEnabled,
      },
      lastActivity: Date.now(),
    }).catch(console.error)

    const userRef = dbRef(db, `rooms/${newRoomId}/users/${configStore.userId}`)
    set(userRef, {
      name: userName,
      joinedAt: Date.now(),
    }).catch(console.error)

    onDisconnect(userRef).remove()

    router.push(`/rooms/${newRoomId}`)
  }
</script>
