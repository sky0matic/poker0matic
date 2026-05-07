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

      <UserMenu />
    </v-toolbar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import UserMenu from '@/components/UserMenu.vue'
  import { useConfigStore } from '@/stores/config'

  const configStore = useConfigStore()
  const { activeRoomId, activeRoomName } = storeToRefs(configStore)
</script>
