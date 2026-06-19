<template>
  <v-app>
    <v-toolbar height="48" rounded tile>
      <v-app-bar-title>
        <v-btn :active="false" text="poker0matic" to="/" />
      </v-app-bar-title>

      <v-toolbar-items>
        <v-btn :text="t('app.nav.home')" to="/" />

        <v-btn
          v-if="activeRoomId"
          :text="activeRoomName ? t('app.nav.roomWithName', { name: activeRoomName }) : t('app.nav.room')"
          :to="`/rooms/${activeRoomId}`"
        />

        <v-btn :text="t('app.nav.config')" to="/config" />

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
        <v-icon end icon="mdi-github" />
      </v-btn>

      <LocaleSwitcher />

      <UserMenu />
    </v-toolbar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
  import UserMenu from '@/components/UserMenu.vue'
  import { useConfigStore } from '@/stores/config'

  const { t } = useI18n()

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
