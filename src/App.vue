<template>
  <v-app class="p0-app">
    <v-app-bar class="hdr" flat height="57">
      <v-btn
        class="brand"
        :ripple="false"
        to="/"
        variant="text"
      >
        <div class="brand-mark">
          <img alt="Poker0matic logo" src="/images/logo.png">
        </div>

        <div class="brand-name">poker<span>0</span>matic</div>
      </v-btn>

      <v-spacer />

      <div class="hdr-right">
        <router-link
          v-if="appStore.currentRoomId"
          class="room-pill"
          :class="{ 'room-pill-away': !isInRoom }"
          :to="`/rooms/${appStore.currentRoomId}`"
        >
          <span class="dot" />
          <span class="room-name">{{ appStore.roomName }}</span>
          <span class="room-meta">{{ appStore.playerCount }} online</span>
        </router-link>

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
      location="bottom right"
      variant="flat"
    >
      <v-icon
        :icon="appStore.toastType === 'success' ? 'mdi-check' : 'mdi-close'"
        size="16"
      />
      {{ appStore.toastMessage }}
    </v-snackbar>

    <!-- ── Global username setup (shown once on first visit) ───────────── -->
    <v-dialog v-model="nameSetupOpen" max-width="400" persistent>
      <v-card class="p0-modal" flat>
        <div class="p0-modal-head">
          <h2>What's your name?</h2>
          <p>This is how you'll appear in planning rooms. You can change it anytime from the user menu.</p>
        </div>

        <v-form @submit.prevent="submitSetupName">
          <div class="p0-modal-body">
            <v-text-field
              v-model="setupName"
              autofocus
              class="p0-field"
              :counter="20"
              hide-details="auto"
              label="Your name"
              maxlength="20"
              placeholder="e.g. Alex"
              variant="outlined"
            />
          </div>

          <div class="p0-modal-foot">
            <v-btn
              class="p0-btn p0-btn-primary"
              :disabled="!setupName.trim()"
              type="submit"
              variant="flat"
            >
              Continue
            </v-btn>
          </div>
        </v-form>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import UserMenu from '@/components/UserMenu.vue'
  import { useAppStore } from '@/stores/app'
  import { useConfigStore } from '@/stores/config'

  const route = useRoute()
  const appStore = useAppStore()
  const configStore = useConfigStore()

  // true when the user is actively viewing the room they last joined
  const isInRoom = computed(() => route.path.startsWith('/rooms/'))

  const nameSetupOpen = ref(false)
  const setupName = ref('')

  onMounted(() => {
    configStore.initializeConfig()
    if (!configStore.userName.trim()) {
      nameSetupOpen.value = true
    }
  })

  function submitSetupName () {
    const trimmed = setupName.value.trim().slice(0, 20)
    configStore.setUserName(trimmed || 'Guest')
    nameSetupOpen.value = false
  }
</script>
