<template>
  <v-app>
    <v-toolbar height="48" rounded tile>
      <v-app-bar-title>
        <v-btn :active="false" text="poker0matic" to="/" />
      </v-app-bar-title>

      <v-toolbar-items>
        <v-btn text="Home" to="/" />

        <v-btn
          v-if="activeRoomId"
          :text="activeRoomName ? `Room - ${activeRoomName}` : 'Room'"
          :to="`/rooms/${activeRoomId}`"
        />

        <v-btn text="Config" to="/config" />

      </v-toolbar-items>

      <v-spacer />

      <v-btn
        class="me-1"
        density="compact"
        href="https://github.com/sky0matic/poker0matic"
        target="_blank"
        variant="text"
      >
        <v-icon icon="mdi-star-outline" start />
        {{ starCount !== null ? starCount : '—' }}
        <v-icon icon="mdi-github" end />
      </v-btn>

      <UserMenu />
    </v-toolbar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import UserMenu from '@/components/UserMenu.vue'
  import { useConfigStore } from '@/stores/config'

  const configStore = useConfigStore()
  const { activeRoomId, activeRoomName } = storeToRefs(configStore)

  const starCount = ref<number | null>(null)

  onMounted(async () => {
    try {
      const res = await fetch('https://api.github.com/repos/sky0matic/poker0matic', { cache: 'no-cache' })
      const data = await res.json()
      starCount.value = data.stargazers_count ?? null
    } catch {
      // silently fail — non-critical
    }
  })
</script>
