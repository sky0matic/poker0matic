<template>
  <v-text-field
    v-model="roomName"
    :label="t('create.roomName')"
    required
  />

  <div class="mt-1 mb-2">
    <div class="text-subtitle-2 mb-2">{{ t('create.cardDeck') }}</div>

    <v-btn-toggle
      class="flex-wrap mb-3"
      density="compact"
      :model-value="selectedPreset"
      rounded="lg"
      variant="outlined"
      @update:model-value="selectPreset"
    >
      <v-btn
        v-for="(preset, i) in PRESET_DEFINITIONS"
        :key="preset.key"
        size="small"
        :value="i"
      >
        {{ t(`create.presets.${preset.key}`) }}
      </v-btn>
    </v-btn-toggle>

    <draggable
      v-model="cards"
      :animation="150"
      class="card-chips mb-3"
      :item-key="(item: CardValue) => String(item)"
      tag="div"
    >
      <template #item="{ element, index }">
        <v-chip
          class="ma-1 draggable-chip"
          closable
          :disabled="cards.length <= 1"
          @click:close="removeCard(index)"
        >
          {{ element }}
        </v-chip>
      </template>
    </draggable>

    <div class="d-flex align-center" style="gap: 8px">
      <v-text-field
        v-model="newCard"
        density="compact"
        hide-details
        :label="t('create.addCard')"
        :maxlength="5"
        @keydown.enter.prevent="addCard"
      />

      <v-btn
        :disabled="!newCard.trim()"
        size="small"
        variant="tonal"
        @click="addCard"
      >
        {{ t('create.add') }}
      </v-btn>
    </div>
  </div>

  <div class="mt-2 mb-1">
    <div class="text-subtitle-2 mb-1">
      {{ t('create.timerThresholds') }}
      <span class="text-caption text-medium-emphasis ms-1">{{ t('create.optional') }}</span>
    </div>

    <v-row density="comfortable">
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="targetDurationMinutes"
          density="compact"
          :hint="t('create.targetHint')"
          :label="t('create.targetDuration')"
          min="1"
          persistent-hint
          type="number"
        />
      </v-col>

      <v-col cols="12" sm="6">
        <v-text-field
          v-model="ceilingDurationMinutes"
          density="compact"
          :hint="t('create.ceilingHint')"
          :label="t('create.ceilingDuration')"
          min="1"
          persistent-hint
          type="number"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup>
  import { ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import draggable from 'vuedraggable'
  import { type CardValue, findPresetIndex, PRESET_DEFINITIONS } from '@/config/cardDecks'

  const { t } = useI18n()

  const roomName = defineModel<string>('roomName', { required: true })
  const cards = defineModel<CardValue[]>('cards', { required: true })
  const targetDurationMinutes = defineModel<string>('targetDurationMinutes', { default: '' })
  const ceilingDurationMinutes = defineModel<string>('ceilingDurationMinutes', { default: '' })

  const selectedPreset = ref<number | null>(findPresetIndex(cards.value))
  const newCard = ref('')

  // Keeps the highlighted preset in sync when the parent replaces the deck (e.g. the settings dialog reloads).
  watch(cards, value => {
    selectedPreset.value = findPresetIndex(value)
  })

  function selectPreset (idx: number | null) {
    selectedPreset.value = idx
    if (idx != null) {
      cards.value = [...PRESET_DEFINITIONS[idx].cards]
    }
  }

  function removeCard (index: number) {
    cards.value = cards.value.filter((_, i) => i !== index)
    selectedPreset.value = null
  }

  function addCard () {
    const val = newCard.value.trim()
    if (!val) return
    const num = Number(val)
    cards.value = [...cards.value, Number.isNaN(num) ? val : num]
    newCard.value = ''
    selectedPreset.value = null
  }
</script>

<style scoped>
.card-chips {
  display: flex;
  flex-wrap: wrap;
}

.draggable-chip {
  cursor: grab;
}

.draggable-chip:active {
  cursor: grabbing;
}
</style>
