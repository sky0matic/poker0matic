<script setup lang="ts">
  import { ref, watch } from 'vue'

  type DeckPreset = 'fibonacci' | 'linear' | 'tshirt' | 'custom'

  const DECK_PRESETS: { id: DeckPreset, label: string, preview: string }[] = [
    { id: 'fibonacci', label: 'Fibonacci', preview: '0 · 1 · 2 · 3 · 5 · 8 · 13 · 21 · 34 · 55' },
    { id: 'linear', label: 'Linear', preview: '1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · 12 · 15' },
    { id: 'tshirt', label: 'T-shirt', preview: 'XS · S · M · L · XL · XXL' },
    { id: 'custom', label: 'Custom', preview: 'Define your own sequence' },
  ]

  interface RoomSettings {
    name: string
    deck: DeckPreset
    customDeck: string
    specialQuestion: boolean
    specialCoffee: boolean
    historyEnabled: boolean
  }

  const props = defineProps<{
    modelValue: boolean
    currentSettings: RoomSettings
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'save': [settings: RoomSettings]
  }>()

  const roomName = ref('')
  const deck = ref<DeckPreset>('fibonacci')
  const customDeck = ref('')
  const specialQuestion = ref(true)
  const specialCoffee = ref(true)
  const historyEnabled = ref(true)

  watch(() => props.modelValue, open => {
    if (open) {
      roomName.value = props.currentSettings.name
      deck.value = props.currentSettings.deck
      customDeck.value = props.currentSettings.customDeck
      specialQuestion.value = props.currentSettings.specialQuestion
      specialCoffee.value = props.currentSettings.specialCoffee
      historyEnabled.value = props.currentSettings.historyEnabled
    }
  }, { immediate: true })

  function save () {
    if (!roomName.value.trim()) return
    emit('save', {
      name: roomName.value.trim(),
      deck: deck.value,
      customDeck: deck.value === 'custom' ? customDeck.value.trim() : '',
      specialQuestion: specialQuestion.value,
      specialCoffee: specialCoffee.value,
      historyEnabled: historyEnabled.value,
    })
    emit('update:modelValue', false)
  }
</script>

<template>
  <v-dialog
    max-width="480"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="p0-modal" flat>
      <div class="p0-modal-head">
        <h2>Room settings</h2>
        <p>Changes apply to all participants. Modifying the deck will reset current votes.</p>
      </div>

      <v-form @submit.prevent="save">
        <div class="p0-modal-body">
          <div class="config-fields">
            <v-text-field
              v-model="roomName"
              class="p0-field"
              hide-details="auto"
              label="Room name"
              maxlength="60"
              required
              variant="outlined"
            />

            <!-- Deck -->
            <div class="room-settings-section">
              <span class="settings-label">Card deck</span>

              <div class="p0-select-wrap">
                <select v-model="deck" class="p0-select">
                  <option v-for="preset in DECK_PRESETS" :key="preset.id" :value="preset.id">
                    {{ preset.label }} ({{ preset.preview }})
                  </option>
                </select>
              </div>

              <v-text-field
                v-if="deck === 'custom'"
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
          </div>
        </div>

        <div class="p0-modal-foot">
          <v-btn
            class="p0-btn p0-btn-ghost"
            variant="flat"
            @click="$emit('update:modelValue', false)"
          >
            Cancel
          </v-btn>

          <v-btn
            class="p0-btn p0-btn-primary"
            :disabled="!roomName.trim()"
            prepend-icon="mdi-content-save"
            type="submit"
            variant="flat"
          >
            Save changes
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
