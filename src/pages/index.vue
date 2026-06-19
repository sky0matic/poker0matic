<template>
  <v-container>
    <v-card class="mx-auto mt-8" max-width="440">
      <v-card-text>
        <v-btn block color="primary" size="large" to="/create">
          {{ t('index.createRoom') }}
        </v-btn>

        <v-divider class="my-5" />

        <v-form @submit.prevent="joinRoom">
          <v-text-field
            v-model="roomCode"
            autofocus
            :label="t('index.roomCode')"
            required
          />

          <v-btn block color="secondary" :disabled="!roomCode.trim()" type="submit">
            {{ t('index.joinRoom') }}
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>

    <v-card class="mx-auto mt-4" max-width="440">
      <v-card-title>{{ t('index.attributions.title') }}</v-card-title>

      <v-card-text>
        <div class="text-subtitle-1"><a href="https://www.flaticon.com/free-icons/casino-chip" title="casino chip icons">{{ t('index.attributions.casinoChip') }}</a></div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'

  const { t } = useI18n()

  const router = useRouter()
  const roomCode = ref('')

  function joinRoom () {
    if (!roomCode.value.trim()) return
    router.push(`/rooms/${roomCode.value.trim()}`)
  }
</script>
