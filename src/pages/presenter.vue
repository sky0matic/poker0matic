<template>
  <v-container>
    <v-card v-if="currentRoom" class="mt-4">
      <v-card-item>
        <v-card-title class="text-h5">{{ currentRoom.name }}</v-card-title>

        <v-card-subtitle class="d-flex align-center">
          <v-icon class="me-1" icon="mdi-presentation" size="small" />
          {{ t('room.presenter.title') }}
        </v-card-subtitle>

        <template #append>
          <v-chip
            class="reveal-state"
            :color="showVotes ? 'success' : undefined"
            :prepend-icon="showVotes ? 'mdi-eye' : 'mdi-eye-off'"
            variant="tonal"
          >
            {{ showVotes ? t('room.presenter.votesRevealed') : t('room.presenter.votesHidden') }}
          </v-chip>
        </template>
      </v-card-item>

      <v-card-text>
        <RoomTimer :elapsed-seconds="elapsedSeconds" :revealed-at="revealedAt" :timer-status="timerStatus" />

        <RoomVotesTable
          :self-user-id="null"
          :show-votes="showVotes"
          :users="roomUsers"
          :vote-options="voteOptions"
        />
      </v-card-text>
    </v-card>

    <v-alert
      v-else-if="roomNotFound"
      class="mt-4"
      icon="mdi-alert-circle-outline"
      type="error"
      variant="tonal"
    >
      {{ t('room.presenter.notFound') }}
    </v-alert>
  </v-container>
</template>

<script lang="ts" setup>
  /**
   * Read-only view of a room, meant to be screen-shared from a child window of the room page.
   * It never joins the room and never writes to Firebase: it only listens to the room and users nodes.
   */
  import type { RoomSettings } from '@/config/roomVersions'
  import type { RoomUser } from '@/utils/presence'
  import { ref as dbRef, onValue } from 'firebase/database'
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRoute } from 'vue-router'
  import RoomTimer from '@/components/RoomTimer.vue'
  import RoomVotesTable from '@/components/RoomVotesTable.vue'
  import { useCloseWithOpener } from '@/composables/useCloseWithOpener'
  import { useRoomTimer } from '@/composables/useRoomTimer'
  import { type CardValue, normalizeCards } from '@/config/cardDecks'
  import { useConfigStore } from '@/stores/config'

  const { t } = useI18n()

  const route = useRoute()
  const configStore = useConfigStore()
  const roomId = route.params.roomId as string

  const currentRoom = ref<{ name: string, createdAt: number, settings?: RoomSettings, resetAt?: number } | null>(null)
  const roomUsers = ref<Record<string, RoomUser>>({})
  const roomNotFound = ref(false)

  const db = configStore.getDb()

  const showVotes = computed(() => currentRoom.value?.settings?.showVotes === true)
  const voteOptions = computed<CardValue[]>(() => normalizeCards(currentRoom.value?.settings?.cards))

  const { elapsedSeconds, timerStatus, revealedAt } = useRoomTimer(currentRoom)

  useCloseWithOpener()

  let unsubscribeRoom: (() => void) | null = null
  let unsubscribeUsers: (() => void) | null = null

  onMounted(() => {
    if (!db) return

    unsubscribeRoom = onValue(dbRef(db, `rooms/${roomId}`), snapshot => {
      const data = snapshot.val()
      currentRoom.value = data ?? null
      roomNotFound.value = !data
    })

    unsubscribeUsers = onValue(dbRef(db, `rooms/${roomId}/users`), snapshot => {
      roomUsers.value = snapshot.val() || {}
    })
  })

  onUnmounted(() => {
    unsubscribeRoom?.()
    unsubscribeUsers?.()
  })
</script>
