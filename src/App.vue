<template>
  <v-app class="p0-app">
    <v-app-bar class="hdr" flat height="57">
      <v-btn
        class="brand"
        :ripple="false"
        to="/"
        variant="text"
      >
        <div class="brand-mark">P0</div>
        <div class="brand-name">poker<span>0</span>matic</div>
      </v-btn>

      <nav class="nav">
        <v-btn class="nav-link" to="/" variant="text">Home</v-btn>

        <v-btn
          v-if="appStore.currentRoomId"
          class="nav-link"
          :to="`/rooms/${appStore.currentRoomId}`"
          variant="text"
        >
          Room
        </v-btn>

        <v-btn class="nav-link" to="/config" variant="text">Config</v-btn>
        <v-btn class="nav-link" to="/attributions" variant="text">Attributions</v-btn>
      </nav>

      <v-spacer />

      <div class="hdr-right">
        <div v-if="appStore.roomName" class="room-pill">
          <span class="dot" />
          <span class="room-name">{{ appStore.roomName }}</span>
          <span class="room-meta">{{ appStore.playerCount }} online</span>
        </div>

        <UserMenu />
      </div>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <v-snackbar
      v-model="appStore.toastVisible"
      class="p0-snackbar"
      :color="appStore.toastType === 'success' ? 'success' : 'error'"
      location="top right"
      variant="flat"
    >
      <v-icon
        :icon="appStore.toastType === 'success' ? 'mdi-check' : 'mdi-close'"
        size="16"
      />
      {{ appStore.toastMessage }}
    </v-snackbar>
  </v-app>
</template>

<script lang="ts" setup>
  import UserMenu from '@/components/UserMenu.vue'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()
</script>
