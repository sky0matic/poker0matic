<template>
  <section :aria-label="t('room.distribution.title')" class="vote-distribution mb-3">
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <div class="text-subtitle-2 flex-grow-1">{{ t('room.distribution.title') }}</div>

      <v-chip
        v-if="average != null"
        class="stat-average"
        label
        size="small"
        variant="tonal"
      >
        {{ t('room.distribution.average', { value: average }) }}
      </v-chip>

      <v-chip
        v-if="median != null"
        class="stat-median"
        label
        size="small"
        variant="tonal"
      >
        {{ t('room.distribution.median', { value: median }) }}
      </v-chip>

      <v-chip
        v-if="suggestion != null"
        class="suggested-estimate"
        color="primary"
        label
        prepend-icon="mdi-lightbulb-on-outline"
        size="small"
        variant="tonal"
      >
        {{ t('room.distribution.suggested', { vote: suggestion }) }}
      </v-chip>
    </div>

    <ul class="distribution-bars">
      <li
        v-for="bucket in distribution"
        :key="String(bucket.vote)"
        :aria-label="t('room.distribution.count', { count: bucket.count, vote: bucket.vote }, bucket.count)"
        class="distribution-row"
        :class="{ 'is-suggested': bucket.vote === suggestion }"
        :title="t('room.distribution.count', { count: bucket.count, vote: bucket.vote }, bucket.count)"
      >
        <span aria-hidden="true" class="bar-label">{{ bucket.vote }}</span>

        <span aria-hidden="true" class="bar-track">
          <span class="bar-fill" :style="{ width: `${(bucket.count / maxCount) * 100}%` }" />
        </span>

        <span aria-hidden="true" class="bar-count">{{ bucket.count }}</span>
      </li>
    </ul>
  </section>
</template>

<script lang="ts" setup>
  import type { CardValue } from '@/config/cardDecks'
  import type { VoteBucket } from '@/utils/roomStats'
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    /** Votes per card, in display order. */
    distribution: VoteBucket[]
    /** Card to highlight as the suggested estimate, if any. */
    suggestion: CardValue | null
    /** Average of the numeric votes, if any. */
    average?: number | null
    /** Median of the numeric votes, if any. */
    median?: number | null
  }>()

  const { t } = useI18n()

  const maxCount = computed(() => Math.max(1, ...props.distribution.map(bucket => bucket.count)))
</script>

<style scoped>
  .distribution-bars {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 4px;
  }

  .distribution-row {
    display: grid;
    grid-template-columns: 3rem 1fr 2rem;
    align-items: center;
    gap: 8px;
    min-height: 20px;
  }

  .bar-label {
    text-align: right;
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  }

  .bar-count {
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    font-variant-numeric: tabular-nums;
  }

  .is-suggested .bar-label,
  .is-suggested .bar-count {
    color: rgb(var(--v-theme-on-surface));
    font-weight: 600;
  }

  .bar-track {
    display: block;
    height: 12px;
  }

  .bar-fill {
    display: block;
    height: 100%;
    min-width: 4px;
    background: rgb(var(--v-theme-primary));
    border-radius: 0 4px 4px 0;
  }
</style>
