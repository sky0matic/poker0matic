<script setup lang="ts">
  import { computed, ref } from 'vue'

  interface HistoryEntry {
    id: string
    storyNotes?: string | null
    finalVote: string | null
    round: number
    durationMs?: number
    duration?: string
    completedAt?: number
    participantCount: number
    consensus: 'yes' | 'split'
    votes?: Record<string, string>
  }

  const props = defineProps<{
    open: boolean
    history: HistoryEntry[]
    historyEnabled: boolean
    storyNotes: string
  }>()

  defineEmits<{
    'update:open': [value: boolean]
    'update:storyNotes': [value: string]
  }>()

  const historyExpanded = ref(true)
  const storyExpanded = ref(true)

  const reversedHistory = computed(() => props.history.toReversed())

  function formatDuration (entry: HistoryEntry): string {
    if (entry.durationMs != null) {
      const ms = entry.durationMs
      if (ms < 60_000) return `${Math.round(ms / 1000)}s`
      const m = Math.floor(ms / 60_000)
      const s = Math.round((ms % 60_000) / 1000)
      return s > 0 ? `${m}m ${s}s` : `${m}m`
    }
    return entry.duration ?? '-'
  }

  function formatDate (ts: number | undefined): string {
    if (!ts || !Number.isFinite(ts)) return ''
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts))
  }
</script>

<template>
  <aside class="side-panel" :class="{ 'side-panel-collapsed': !open }">
    <div class="side-panel-head">
      <span v-if="open" class="side-panel-title">Room panel</span>

      <v-btn
        :aria-label="open ? 'Collapse panel' : 'Expand panel'"
        class="icon-btn"
        density="compact"
        icon
        variant="text"
        @click="$emit('update:open', !open)"
      >
        <v-icon :icon="open ? 'mdi-chevron-left' : 'mdi-chevron-right'" size="16" />
      </v-btn>
    </div>

    <template v-if="open">
      <!-- ── Story section ─────────────────────────────────────────────── -->
      <div class="sp-section">
        <button class="sp-section-head" type="button" @click="storyExpanded = !storyExpanded">
          <v-icon icon="mdi-text-box-outline" size="14" />
          <span>Story</span>
          <v-icon class="sp-chevron" :icon="storyExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="14" />
        </button>

        <div v-if="storyExpanded" class="sp-section-body">
          <textarea
            class="story-notes-input"
            placeholder="Paste your user story, ticket description, or notes here…"
            rows="6"
            :value="storyNotes"
            @input="$emit('update:storyNotes', ($event.target as HTMLTextAreaElement).value)"
          />
        </div>
      </div>

      <!-- ── History section (hidden when historyEnabled=false) ──────────── -->
      <div v-if="historyEnabled" class="sp-section">
        <button class="sp-section-head" type="button" @click="historyExpanded = !historyExpanded">
          <v-icon icon="mdi-history" size="14" />
          <span>History</span>
          <span class="sp-badge">{{ history.length }}</span>
          <v-icon class="sp-chevron" :icon="historyExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="14" />
        </button>

        <div v-if="historyExpanded" class="sp-section-body sp-history-body">
          <div
            v-for="entry in reversedHistory"
            :key="entry.id"
            class="hist-item"
          >
            <div class="top">
              <span class="hid">Round {{ entry.round }}</span>
              <span class="hvote">{{ entry.finalVote ?? '-' }}</span>
            </div>

            <p v-if="entry.storyNotes" class="htitle">{{ entry.storyNotes }}</p>

            <div v-if="entry.votes && Object.keys(entry.votes).length" class="hvotes">
              <span
                v-for="(vote, playerName) in entry.votes"
                :key="playerName"
                class="hvote-chip"
              >{{ playerName }}: <strong>{{ vote }}</strong></span>
            </div>

            <div class="hmeta">
              <span>{{ entry.participantCount }} players · {{ formatDuration(entry) }}</span>

              <span :class="entry.consensus === 'yes' ? 'history-agreed' : 'history-split'">
                {{ entry.consensus === 'yes' ? 'agreed' : 'split' }}
              </span>
            </div>

            <div v-if="entry.completedAt" class="hdate">{{ formatDate(entry.completedAt) }}</div>
          </div>

          <div v-if="history.length === 0" class="hist-empty">
            No rounds completed yet
          </div>
        </div>
      </div>
    </template>
  </aside>
</template>
