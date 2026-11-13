<template>
  <v-dialog v-model="open" max-width="500" :persistent="saving">
    <v-card>
      <v-card-title>{{ t('room.settings.title') }}</v-card-title>

      <v-card-text>
        <v-form @submit.prevent="save">
          <v-alert
            v-if="conflict"
            class="mb-4"
            density="compact"
            type="error"
            variant="tonal"
          >
            {{ t('room.settings.conflict') }}
          </v-alert>

          <RoomSettingsFields
            v-model:cards="cards"
            v-model:ceiling-duration-minutes="ceilingDurationMinutes"
            v-model:room-name="roomName"
            v-model:target-duration-minutes="targetDurationMinutes"
          />

          <v-alert
            v-if="isDeckChanged"
            class="mt-4"
            density="compact"
            type="warning"
            variant="tonal"
          >
            {{ t('room.settings.deckChangeWarning') }}
          </v-alert>

          <v-card-actions class="justify-end px-0">
            <v-btn :disabled="saving" @click="open = false">{{ t('room.settings.cancel') }}</v-btn>

            <v-btn
              color="primary"
              :disabled="!canSave"
              :loading="saving"
              type="submit"
            >
              {{ t('room.settings.save') }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import type { EditableRoomSettings } from '@/stores/room'
  import { computed, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import RoomSettingsFields from '@/components/RoomSettingsFields.vue'
  import { type CardValue, sameCards } from '@/config/cardDecks'

  const props = defineProps<{
    /** Live room values, durations in seconds. */
    settings: EditableRoomSettings
    saving: boolean
    conflict: boolean
  }>()

  const emit = defineEmits<{
    save: [payload: { baseline: EditableRoomSettings, next: EditableRoomSettings }]
  }>()

  const open = defineModel<boolean>({ default: false })

  const { t } = useI18n()

  const roomName = ref('')
  const cards = ref<CardValue[]>([])
  const targetDurationMinutes = ref('')
  const ceilingDurationMinutes = ref('')
  /** The settings as they were when the form was (re)loaded, used by the store to detect concurrent edits. */
  const baseline = ref<EditableRoomSettings>(copySettings(props.settings))

  const isDeckChanged = computed(() => !sameCards(cards.value, baseline.value.cards))
  const canSave = computed(() => !props.saving && roomName.value.trim() !== '' && cards.value.length > 0)

  function copySettings (settings: EditableRoomSettings): EditableRoomSettings {
    return {
      name: settings.name,
      cards: [...settings.cards],
      targetDuration: settings.targetDuration,
      ceilingDuration: settings.ceilingDuration,
    }
  }

  function toMinutes (seconds: number | undefined): string {
    return seconds == null ? '' : String(seconds / 60)
  }

  function toSeconds (minutes: string): number | undefined {
    return minutes ? Number(minutes) * 60 : undefined
  }

  function loadSettings () {
    baseline.value = copySettings(props.settings)
    roomName.value = props.settings.name
    cards.value = [...props.settings.cards]
    targetDurationMinutes.value = toMinutes(props.settings.targetDuration)
    ceilingDurationMinutes.value = toMinutes(props.settings.ceilingDuration)
  }

  watch(open, isOpen => {
    if (isOpen) loadSettings()
  }, { immediate: true })

  watch(() => props.conflict, isConflict => {
    if (isConflict) loadSettings()
  })

  function save () {
    if (!canSave.value) return

    emit('save', {
      baseline: copySettings(baseline.value),
      next: {
        name: roomName.value.trim(),
        cards: [...cards.value],
        targetDuration: toSeconds(targetDurationMinutes.value),
        ceilingDuration: toSeconds(ceilingDurationMinutes.value),
      },
    })
  }
</script>
