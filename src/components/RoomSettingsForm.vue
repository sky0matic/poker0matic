<script setup lang="ts">
  export type DeckPreset = 'fibonacci' | 'linear' | 'tshirt' | 'custom'

  export interface RoomFormSettings {
    name: string
    deck: DeckPreset
    customDeck: string
    specialQuestion: boolean
    specialCoffee: boolean
    historyEnabled: boolean
  }

  const DECK_PRESETS: { id: DeckPreset; label: string; preview: string; count?: number }[] = [
    { id: 'fibonacci', label: 'Fibonacci', preview: '0 · 1 · 2 · 3 · 5 · 8 · 13 · 21 · 34 · 55', count: 10 },
    { id: 'linear',    label: 'Linear',    preview: '1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · 12 · 15', count: 12 },
    { id: 'tshirt',    label: 'T-shirt',   preview: 'XS · S · M · L · XL · XXL', count: 6 },
    { id: 'custom',    label: 'Custom',    preview: 'Define your own sequence' },
  ]

  const props = defineProps<{
    modelValue: RoomFormSettings
    /** Auto-focus the room name field on mount (e.g. on the create page). */
    autofocus?: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [settings: RoomFormSettings]
  }>()

  function patch (changes: Partial<RoomFormSettings>) {
    emit('update:modelValue', { ...props.modelValue, ...changes })
  }
</script>

<template>
  <div class="room-settings-form">
    <!-- Room name -->
    <v-text-field
      :autofocus="autofocus"
      class="p0-field"
      hide-details="auto"
      label="Room name"
      maxlength="60"
      placeholder="e.g. Sprint 42 planning"
      required
      :model-value="modelValue.name"
      variant="outlined"
      @update:model-value="patch({ name: $event })"
    />

    <!-- Card deck -->
    <div class="room-settings-section">
      <span class="settings-label">Card deck</span>

      <div class="deck-picker">
        <button
          v-for="preset in DECK_PRESETS"
          :key="preset.id"
          class="deck-option"
          :class="{ active: modelValue.deck === preset.id }"
          type="button"
          @click="patch({ deck: preset.id })"
        >
          <div class="deck-option-top">
            <span class="deck-option-label">{{ preset.label }}</span>
            <span v-if="preset.count" class="deck-option-count">{{ preset.count }}</span>
            <v-icon v-else icon="mdi-pencil" size="12" style="color: var(--text-4)" />
          </div>
          <span class="deck-option-preview">{{ preset.preview }}</span>
        </button>
      </div>

      <v-text-field
        v-if="modelValue.deck === 'custom'"
        class="p0-field"
        hint="Comma-separated values — e.g. 1, 2, 3, 5, 8, 13"
        label="Custom values"
        persistent-hint
        variant="outlined"
        :model-value="modelValue.customDeck"
        @update:model-value="patch({ customDeck: $event })"
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
          <input
            class="p0-toggle"
            type="checkbox"
            :checked="modelValue.specialQuestion"
            @change="patch({ specialQuestion: ($event.target as HTMLInputElement).checked })"
          >
        </label>

        <label class="toggle-item">
          <div class="toggle-info">
            <span class="toggle-card">☕</span>
            <span class="toggle-name">Break</span>
          </div>
          <input
            class="p0-toggle"
            type="checkbox"
            :checked="modelValue.specialCoffee"
            @change="patch({ specialCoffee: ($event.target as HTMLInputElement).checked })"
          >
        </label>
      </div>
    </div>

    <!-- Round history -->
    <div class="room-settings-section">
      <span class="settings-label">Round history</span>

      <label class="toggle-item">
        <div class="toggle-info">
          <v-icon icon="mdi-history" size="15" style="color: var(--text-2)" />
          <span class="toggle-name">Save completed rounds</span>
        </div>
        <input
          class="p0-toggle"
          type="checkbox"
          :checked="modelValue.historyEnabled"
          @change="patch({ historyEnabled: ($event.target as HTMLInputElement).checked })"
        >
      </label>
    </div>
  </div>
</template>
