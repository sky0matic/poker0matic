<script setup lang="ts">
  import { computed } from 'vue'

  interface RoundStats {
    avg: number
    median: number
    closest: number
    min: number
    max: number
    spread: number
    counts: Record<number, number>
    maxCount: number
    total: number
    consensus: 'consensus' | 'close' | 'split'
  }

  const props = defineProps<{
    stats: RoundStats | null
  }>()

  const consensusClass = computed(() => {
    if (!props.stats) return 'wait'
    return props.stats.consensus === 'split' ? 'no' : 'yes'
  })

  const consensusLabel = computed(() => {
    if (!props.stats) return 'Waiting'
    if (props.stats.consensus === 'consensus') return 'Consensus'
    if (props.stats.consensus === 'close') return 'Near match'
    return 'Split vote'
  })

  function formatNum (num: number | null | undefined): string {
    if (num == null) return '-'
    return Number.isInteger(num) ? String(num) : String(Number.parseFloat(num.toFixed(2)))
  }
</script>

<template>
  <section
    class="stats"
    :data-state="stats ? 'shown' : 'hidden'"
  >
    <div class="stats-head">
      <h4>Round insights</h4>

      <span class="consensus-pill" :class="consensusClass">
        {{ consensusLabel }}
      </span>
    </div>

    <div class="stat-grid">
      <div class="stat-cell">
        <div class="lbl">Average</div>

        <div class="val" :class="{ muted: !stats }">
          {{ stats ? formatNum(stats.avg) : '-' }}
        </div>
      </div>

      <div class="stat-cell">
        <div class="lbl">Median</div>

        <div class="val" :class="{ muted: !stats }">
          {{ stats ? formatNum(stats.median) : '-' }}
        </div>
      </div>

      <div class="stat-cell">
        <div class="lbl">Closest card</div>

        <div class="val" :class="{ muted: !stats }">
          {{ stats ? stats.closest : '-' }}
        </div>
      </div>

      <div class="stat-cell">
        <div class="lbl">Spread</div>

        <div class="val" :class="{ muted: !stats }">
          <template v-if="stats">
            {{ stats.min }}<span class="spread-separator">-</span>{{ stats.max }}
          </template>

          <template v-else>-</template>
        </div>
      </div>
    </div>

    <div v-if="stats && Object.keys(stats.counts).length > 0" class="distribution">
      <div class="kicker">Distribution</div>

      <div
        v-for="(count, value) in stats.counts"
        :key="value"
        class="dist-row"
        :class="{ 'is-mode': count === stats.maxCount }"
      >
        <span class="lab">{{ value }}</span>

        <span
          class="bar"
          :style="{ '--w': `${(count / stats.maxCount) * 100}%` }"
        />

        <span class="ct">{{ count }}</span>
      </div>
    </div>
  </section>
</template>
