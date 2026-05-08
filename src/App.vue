<template>
  <v-app class="p0-app">
    <header class="hdr">
      <router-link class="brand" to="/">
        <div class="brand-mark">P0</div>
        <div class="brand-name">poker<span>0</span>matic</div>
      </router-link>

      <nav class="nav">
        <router-link to="/">Home</router-link>

        <router-link
          v-if="appStore.currentRoomId"
          :to="`/rooms/${appStore.currentRoomId}`"
        >
          Room
        </router-link>

        <router-link to="/config">Config</router-link>
        <router-link to="/attributions">Attributions</router-link>
      </nav>

      <div class="hdr-right">
        <div v-if="appStore.roomName" class="room-pill">
          <span class="dot" />
          <span class="room-name">{{ appStore.roomName }}</span>
          <span class="room-meta">{{ appStore.playerCount }} online</span>
        </div>

        <button
          class="icon-btn"
          :title="`Theme: ${appStore.currentTheme}`"
          type="button"
          @click="appStore.cycleTheme()"
        >
          <svg fill="none" height="14" viewBox="0 0 16 16" width="14">
            <circle
              cx="8"
              cy="8"
              r="5.5"
              stroke="currentColor"
              stroke-width="1.4"
            />

            <path
              d="M8 2.5v11M2.5 8h11"
              opacity=".45"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.4"
            />

            <path
              d="M8 2.5A5.5 5.5 0 0 1 8 13.5z"
              fill="currentColor"
              opacity=".6"
            />
          </svg>
        </button>

        <UserMenu />
      </div>
    </header>

    <router-view />

    <Transition name="toast">
      <div
        v-if="appStore.toastVisible"
        class="p0-toast"
        :class="appStore.toastType"
      >
        <svg
          v-if="appStore.toastType === 'success'"
          fill="none"
          height="14"
          viewBox="0 0 16 16"
          width="14"
        >
          <path
            d="M3 8l3.5 3.5L13 4"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.2"
          />
        </svg>

        <svg
          v-else
          fill="none"
          height="14"
          viewBox="0 0 16 16"
          width="14"
        >
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="2.2"
          />
        </svg>
        {{ appStore.toastMessage }}
      </div>
    </Transition>
  </v-app>
</template>

<script lang="ts" setup>
  import UserMenu from '@/components/UserMenu.vue'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()
</script>
