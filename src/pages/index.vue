<template>
  <v-container>
    <v-card class="mx-auto mt-8" max-width="440">
      <v-card-text>
        <v-btn block color="primary" size="large" to="/create">
          Create a room
        </v-btn>

        <v-divider class="my-5" />

        <v-form @submit.prevent="joinRoom">
          <v-text-field
            v-model="roomCode"
            autofocus
            label="Room code"
            required
          />

          <v-btn block color="secondary" :disabled="!roomCode.trim()" type="submit">
            Join room
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>

    <v-card class="mx-auto mt-4" max-width="440">
      <v-card-title>Attributions</v-card-title>

      <v-card-text>
        <div class="text-subtitle-1"><a href="https://www.flaticon.com/free-icons/casino-chip" title="casino chip icons">Casino chip icons created by POD Gladiator - Flaticon</a></div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()
  const roomCode = ref('')

  function joinRoom () {
    if (!roomCode.value.trim()) return
    router.push(`/rooms/${roomCode.value.trim()}`)
  }
</script>
