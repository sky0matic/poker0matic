<template>
  <v-container>
    <v-card class="mx-auto mt-8" max-width="500">
      <v-card-title>{{ t('create.title') }}</v-card-title>

      <v-card-text>
        <v-form @submit.prevent="createRoom">
          <v-text-field
            v-model="name"
            autofocus
            :counter="MAX_NAME_LENGTH"
            :label="t('create.yourName')"
            :maxlength="MAX_NAME_LENGTH"
            required
          />

          <RoomSettingsFields
            v-model:cards="cards"
            v-model:ceiling-duration-minutes="ceilingDurationMinutes"
            v-model:room-name="roomName"
            v-model:target-duration-minutes="targetDurationMinutes"
          />

          <v-card-actions class="justify-end px-0">
            <v-btn
              color="primary"
              :disabled="!name.trim() || !roomName.trim() || cards.length === 0"
              type="submit"
            >
              {{ t('create.create') }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import RoomSettingsFields from '@/components/RoomSettingsFields.vue'
  import { type CardValue, PRESET_DEFINITIONS } from '@/config/cardDecks'
  import { useConfigStore } from '@/stores/config'
  import { useRoomStore } from '@/stores/room'

  const { t } = useI18n()
  const router = useRouter()
  const configStore = useConfigStore()
  const roomStore = useRoomStore()
  const { username } = storeToRefs(configStore)

  const MAX_NAME_LENGTH = 20

  const name = ref(username.value || '')
  const roomName = ref('')

  const cards = ref<CardValue[]>([...PRESET_DEFINITIONS[0].cards])
  const targetDurationMinutes = ref('')
  const ceilingDurationMinutes = ref('')

  function createRoom () {
    if (!name.value.trim() || !roomName.value.trim() || cards.value.length === 0) return

    const usernameValue = name.value.trim().slice(0, MAX_NAME_LENGTH) || 'Anonymous'
    configStore.setUsername(usernameValue)

    const targetSecs = targetDurationMinutes.value ? Number(targetDurationMinutes.value) * 60 : undefined
    const ceilingSecs = ceilingDurationMinutes.value ? Number(ceilingDurationMinutes.value) * 60 : undefined
    const roomId = roomStore.createRoom(roomName.value.trim(), cards.value, targetSecs, ceilingSecs)

    router.push(`/rooms/${roomId}`)
  }
</script>
