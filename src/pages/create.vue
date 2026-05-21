<template>
  <v-container>
    <v-card class="mx-auto mt-8" max-width="500">
      <v-card-title>Create a room</v-card-title>

      <v-card-text>
        <v-form @submit.prevent="createRoom">
          <v-text-field
            v-model="name"
            autofocus
            :counter="MAX_NAME_LENGTH"
            label="Your name"
            :maxlength="MAX_NAME_LENGTH"
            required
          />

          <v-text-field
            v-model="roomName"
            label="Room name"
            required
          />

          <div class="mt-1 mb-2">
            <div class="text-subtitle-2 mb-2">Card deck</div>

            <v-btn-toggle
              class="flex-wrap mb-3"
              density="compact"
              :model-value="selectedPreset"
              rounded="lg"
              variant="outlined"
              @update:model-value="selectPreset"
            >
              <v-btn
                v-for="(preset, i) in PRESETS"
                :key="preset.label"
                size="small"
                :value="i"
              >
                {{ preset.label }}
              </v-btn>
            </v-btn-toggle>

            <draggable
              v-model="cards"
              :animation="150"
              class="card-chips mb-3"
              :item-key="(item: number | string) => String(item)"
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
                label="Add card"
                :maxlength="5"
                style="max-width: 150px"
                @keydown.enter.prevent="addCard"
              />

              <v-btn
                :disabled="!newCard.trim()"
                size="small"
                variant="tonal"
                @click="addCard"
              >
                Add
              </v-btn>
            </div>
          </div>

          <div class="mt-2 mb-1">
            <div class="text-subtitle-2 mb-1">
              Timer thresholds
              <span class="text-caption text-medium-emphasis ms-1">(optional)</span>
            </div>

            <v-row density="comfortable">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="targetDurationMinutes"
                  density="compact"
                  hint="Timer turns yellow when reached"
                  label="Target duration (minutes)"
                  min="1"
                  persistent-hint
                  type="number"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="ceilingDurationMinutes"
                  density="compact"
                  hint="Timer turns red when reached"
                  label="Ceiling duration (minutes)"
                  min="1"
                  persistent-hint
                  type="number"
                />
              </v-col>
            </v-row>
          </div>

          <v-card-actions class="justify-end px-0">
            <v-btn
              color="primary"
              :disabled="!name.trim() || !roomName.trim() || cards.length === 0"
              type="submit"
            >
              Create
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import draggable from 'vuedraggable'
  import { useConfigStore } from '@/stores/config'
  import { useRoomStore } from '@/stores/room'

  const router = useRouter()
  const configStore = useConfigStore()
  const roomStore = useRoomStore()
  const { userName } = storeToRefs(configStore)

  const MAX_NAME_LENGTH = 20

  const PRESETS: Array<{ label: string, cards: Array<number | string> }> = [
    { label: 'Fibonacci', cards: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, '?', '☕'] },
    { label: 'Modified Fib', cards: [0, '½', 1, 2, 3, 5, 8, 13, 20, 40, 100, '?', '☕'] },
    { label: 'T-Shirt', cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'] },
    { label: 'Powers of 2', cards: [0, 1, 2, 4, 8, 16, 32, 64, '?', '☕'] },
  ]

  const name = ref(userName.value || '')
  const roomName = ref('')

  const selectedPreset = ref<number | null>(0)
  const cards = ref<Array<number | string>>([...PRESETS[0].cards])
  const newCard = ref('')
  const targetDurationMinutes = ref('')
  const ceilingDurationMinutes = ref('')

  watch(selectedPreset, idx => {
    if (idx != null) {
      cards.value = [...PRESETS[idx].cards]
    }
  })

  function selectPreset (idx: number | null) {
    selectedPreset.value = idx
  }

  function removeCard (index: number) {
    cards.value.splice(index, 1)
    selectedPreset.value = null
  }

  function addCard () {
    const val = newCard.value.trim()
    if (!val) return
    const num = Number(val)
    cards.value.push(Number.isNaN(num) ? val : num)
    newCard.value = ''
    selectedPreset.value = null
  }

  function createRoom () {
    if (!name.value.trim() || !roomName.value.trim() || cards.value.length === 0) return

    const userNameValue = name.value.trim().slice(0, MAX_NAME_LENGTH) || 'Anonymous'
    configStore.setUserName(userNameValue)

    const targetSecs = targetDurationMinutes.value ? Number(targetDurationMinutes.value) * 60 : undefined
    const ceilingSecs = ceilingDurationMinutes.value ? Number(ceilingDurationMinutes.value) * 60 : undefined
    const roomId = roomStore.createRoom(roomName.value.trim(), cards.value, targetSecs, ceilingSecs)
    roomStore.joinRoom(roomId)

    router.push(`/rooms/${roomId}`)
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
