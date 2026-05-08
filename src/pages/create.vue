<template>
  <v-container class="setup-screen" fluid>
    <v-card class="setup-card page-card" flat>
      <div>
        <div class="kicker">New session</div>
        <h1 class="setup-title">Create a room</h1>
        <p class="setup-desc">Give your planning session a name and configure the deck.</p>
      </div>

      <v-form class="setup-form" @submit.prevent="createRoom">
        <!-- Identity -->
        <v-text-field
          v-model="name"
          autofocus
          class="p0-field"
          hide-details
          label="Your name"
          maxlength="20"
          placeholder="e.g. Alex"
          required
          variant="outlined"
        />

        <v-text-field
          v-model="roomName"
          class="p0-field"
          hide-details
          label="Room name"
          placeholder="e.g. Sprint 42 planning"
          required
          variant="outlined"
        />

        <!-- Deck -->
        <div class="room-settings-section">
          <span class="settings-label">Card deck</span>

          <div class="p0-select-wrap">
            <select v-model="deckPreset" class="p0-select">
              <option v-for="preset in DECK_PRESETS" :key="preset.id" :value="preset.id">
                {{ preset.label }} ({{ preset.preview }})
              </option>
            </select>
          </div>

          <v-text-field
            v-if="deckPreset === 'custom'"
            v-model="customDeck"
            class="p0-field"
            hint="Comma-separated values — e.g. 1, 2, 3, 5, 8, 13"
            label="Custom values"
            persistent-hint
            variant="outlined"
          />
        </div>

        <!-- Special cards -->
        <div class="room-settings-section">
          <span class="settings-label">Special cards</span>

          <div class="toggles-row">
            <label class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-card">?</span>
                <span class="toggle-name">Unknown</span>
              </div>
              <input v-model="specialQuestion" class="p0-toggle" type="checkbox">
            </label>

            <label class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-card">☕</span>
                <span class="toggle-name">Break</span>
              </div>
              <input v-model="specialCoffee" class="p0-toggle" type="checkbox">
            </label>
          </div>
        </div>

        <!-- History -->
        <div class="room-settings-section">
          <span class="settings-label">Round history</span>

          <label class="toggle-item">
            <div class="toggle-info">
              <v-icon icon="mdi-history" size="15" style="color: var(--text-2)" />
              <span class="toggle-name">Save completed rounds</span>
            </div>
            <input v-model="historyEnabled" class="p0-toggle" type="checkbox">
          </label>
        </div>

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

  type DeckPreset = 'fibonacci' | 'linear' | 'tshirt' | 'custom'

  const DECK_PRESETS: { id: DeckPreset, label: string, preview: string }[] = [
    { id: 'fibonacci', label: 'Fibonacci', preview: '0 · 1 · 2 · 3 · 5 · 8 · 13 · 21 · 34 · 55' },
    { id: 'linear',    label: 'Linear',    preview: '1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · 12 · 15' },
    { id: 'tshirt',    label: 'T-shirt',   preview: 'XS · S · M · L · XL · XXL' },
    { id: 'custom',    label: 'Custom',    preview: 'Define your own sequence' },
  ]

  const router = useRouter()
  const configStore = useConfigStore()
  const { userName } = storeToRefs(configStore)

  const MAX_NAME_LENGTH = 20
  const name = ref(userName.value || '')
  const roomName = ref('')
  const deckPreset = ref<DeckPreset>('fibonacci')
  const customDeck = ref('')
  const specialQuestion = ref(true)
  const specialCoffee = ref(true)
  const historyEnabled = ref(true)
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
      settings: {
        showVotes: false,
        v: 0,
        deck: deckPreset.value,
        customDeck: deckPreset.value === 'custom' ? customDeck.value.trim() : null,
        specialQuestion: specialQuestion.value,
        specialCoffee: specialCoffee.value,
        historyEnabled: historyEnabled.value,
      },
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
