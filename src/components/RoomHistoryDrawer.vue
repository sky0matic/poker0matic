<script setup lang="ts">
  import { computed } from 'vue'

  interface HistoryEntry {
    id: string
    name: string
    finalVote: string | null
    round: number
    duration: string
    participantCount: number
    consensus: 'yes' | 'split'
  }

  const props = defineProps<{
    history: HistoryEntry[]
    collapsed: boolean
  }>()

  defineEmits<{
    'update:collapsed': [value: boolean]
  }>()

  const reversedHistory = computed(() => props.history.toReversed())
</script>

<template>
  <aside class="drawer" :class="{ collapsed }">
    <div class="drawer-head">
      <v-btn
        :aria-label="collapsed ? 'Expand history' : 'Collapse history'"
        class="icon-btn"
        density="compact"
        icon
        variant="text"
        @click="$emit('update:collapsed', !collapsed)"
      >
        <v-icon :icon="collapsed ? 'mdi-chevron-left' : 'mdi-chevron-right'" size="16" />
      </v-btn>

      <h3>
        History
        <span class="count">{{ history.length }}</span>
      </h3>
    </div>

    <div class="drawer-body">
      <div
        v-for="entry in reversedHistory"
        :key="entry.id"
        class="hist-item"
      >
        <div class="top">
          <span class="hid">{{ entry.name }}</span>
          <span class="hvote">{{ entry.finalVote ?? '-' }}</span>
        </div>

        <p class="htitle">Round {{ entry.round }} - {{ entry.duration }}</p>

        <div class="hmeta">
          <span>{{ entry.participantCount }} players</span>

          <span :class="entry.consensus === 'yes' ? 'history-agreed' : 'history-split'">
            {{ entry.consensus === 'yes' ? 'agreed' : 'split' }}
          </span>
        </div>
      </div>

      <div v-if="history.length === 0" class="hist-empty">
        No rounds completed yet
      </div>
    </div>
  </aside>
</template>
