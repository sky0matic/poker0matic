<template>
  <div
    class="text-caption mb-4 d-flex align-center gap-1"
    :class="{
      'text-medium-emphasis': timerStatus === 'normal',
      'text-warning': timerStatus === 'target',
      'text-error': timerStatus === 'ceiling',
    }"
  >
    <span>{{ t('room.timeSinceReset', { time: formatElapsed(elapsedSeconds) }) }}</span>

    <v-tooltip v-if="timerStatus !== 'normal'" location="end">
      <template #activator="{ props: activatorProps }">
        <v-icon
          v-bind="activatorProps"
          :icon="timerStatus === 'ceiling' ? 'mdi-clock-alert' : 'mdi-clock-alert-outline'"
          size="x-small"
        />
      </template>

      <span v-if="timerStatus === 'target'">{{ t('room.pastTarget') }}</span>
      <span v-else>{{ t('room.pastCeiling') }}</span>
    </v-tooltip>

    <span v-if="revealedAt != null" class="ml-1 text-medium-emphasis">
      {{ t('room.revealedAt', { time: formatElapsed(revealedAt) }) }}
    </span>
  </div>
</template>

<script lang="ts" setup>
  import { useI18n } from 'vue-i18n'
  import { formatElapsed, type TimerStatus } from '@/composables/useRoomTimer'

  defineProps<{
    elapsedSeconds: number
    timerStatus: TimerStatus
    revealedAt: number | null
  }>()

  const { t } = useI18n()
</script>
