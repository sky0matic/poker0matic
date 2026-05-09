<template>
  <v-menu content-class="p0-user-menu" location="bottom end" origin="top end">
    <template #activator="{ props }">
      <v-btn v-bind="props" class="user-menu-btn" variant="text">
        <PlayerAvatar :name="displayName" :size="32" square />
        <span class="user-menu-name">{{ displayName }}</span>
      </v-btn>
    </template>

    <v-list class="p0-menu-list" density="compact" min-width="200">
      <v-list-item class="p0-menu-item" prepend-icon="mdi-pencil" title="Change name" @click="nameDialog = true" />
      <v-list-item class="p0-menu-item" prepend-icon="mdi-palette" title="Theme" @click="themeDialog = true" />
      <v-list-item class="p0-menu-item" prepend-icon="mdi-account-circle" title="Avatar style" @click="avatarDialog = true" />

      <v-list-item
        class="p0-menu-item"
        :prepend-icon="configStore.viewMode === 'table' ? 'mdi-table' : 'mdi-cards-playing'"
        :title="configStore.viewMode === 'table' ? 'Results: table view' : 'Results: grid view'"
        @click="configStore.setViewMode(configStore.viewMode === 'table' ? 'grid' : 'table')"
      />

      <v-divider class="p0-menu-divider" />

      <v-list-item class="p0-menu-item" prepend-icon="mdi-cog" title="Configuration" @click="configModalOpen = true" />
      <v-list-item class="p0-menu-item" prepend-icon="mdi-information-outline" title="About" @click="aboutModalOpen = true" />
    </v-list>
  </v-menu>

  <!-- ── Change name ─────────────────────────────────────────────────── -->
  <v-dialog v-model="nameDialog" max-width="400">
    <v-card class="p0-modal" flat>
      <div class="p0-modal-head">
        <h2>Change name</h2>
        <p>This is how you appear in planning rooms.</p>
      </div>

      <div class="p0-modal-body">
        <v-form @submit.prevent="saveName">
          <v-text-field
            v-model="localName"
            autofocus
            class="p0-field"
            :counter="MAX_NAME_LENGTH"
            hide-details="auto"
            label="Your name"
            :maxlength="MAX_NAME_LENGTH"
            variant="outlined"
          />
        </v-form>
      </div>

      <div class="p0-modal-foot">
        <v-btn class="p0-btn p0-btn-ghost" variant="flat" @click="nameDialog = false">Cancel</v-btn>
        <v-btn class="p0-btn p0-btn-primary" :disabled="!localName.trim()" variant="flat" @click="saveName">Save</v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- ── Theme picker ────────────────────────────────────────────────── -->
  <v-dialog v-model="themeDialog" max-width="420">
    <v-card class="p0-modal" flat>
      <div class="p0-modal-head">
        <h2>Theme</h2>
        <p>Choose the colour scheme for your interface.</p>
      </div>

      <div class="p0-modal-body">
        <div class="theme-grid">
          <button
            v-for="theme in THEME_OPTIONS"
            :key="theme.id"
            class="theme-card"
            :class="{ active: appStore.currentTheme === theme.id }"
            type="button"
            @click="appStore.setTheme(theme.id)"
          >
            <span class="theme-swatch" :style="{ background: theme.bg }">
              <span class="theme-dot" :style="{ background: theme.accent }" />
            </span>

            <span class="theme-label">{{ theme.label }}</span>
            <v-icon v-if="appStore.currentTheme === theme.id" class="theme-check" icon="mdi-check-circle" size="14" />
          </button>
        </div>
      </div>

      <div class="p0-modal-foot">
        <v-btn class="p0-btn p0-btn-primary" variant="flat" @click="themeDialog = false">Done</v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- ── Avatar style picker ─────────────────────────────────────────── -->
  <v-dialog v-model="avatarDialog" max-width="560">
    <v-card class="p0-modal" flat>
      <div class="p0-modal-head">
        <h2>Avatar style</h2>
        <p>Choose how avatars look for you. Only you see this change.</p>
      </div>

      <div class="p0-modal-body">
        <div class="avatar-style-grid">
          <button
            v-for="style in AVATAR_STYLES"
            :key="style.id"
            class="avatar-style-card"
            :class="{ active: configStore.avatarStyle === style.id }"
            type="button"
            @click="configStore.setAvatarStyle(style.id)"
          >
            <img
              :alt="style.label"
              class="avatar-style-preview"
              :src="buildAvatarUrl(style.id, displayName)"
            >

            <span class="avatar-style-label">{{ style.label }}</span>
          </button>
        </div>
      </div>

      <div class="p0-modal-foot">
        <v-btn class="p0-btn p0-btn-primary" variant="flat" @click="avatarDialog = false">Done</v-btn>
      </div>
    </v-card>
  </v-dialog>

  <ConfigModal v-model="configModalOpen" />
  <AboutModal v-model="aboutModalOpen" />
</template>

<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import AboutModal from '@/components/AboutModal.vue'
  import ConfigModal from '@/components/ConfigModal.vue'
  import PlayerAvatar from '@/components/PlayerAvatar.vue'
  import { useAppStore } from '@/stores/app'
  import { useConfigStore } from '@/stores/config'
  import { AVATAR_STYLES, buildAvatarUrl } from '@/utils/avatarStyles'

  const THEME_OPTIONS = [
    { id: 'midnight' as const, label: 'Midnight', bg: '#0a0c10', accent: '#4f8cff' },
    { id: 'slate' as const, label: 'Slate', bg: '#0d1015', accent: '#7c8cff' },
    { id: 'forest' as const, label: 'Forest', bg: '#0a1110', accent: '#3ecf8e' },
    { id: 'amber' as const, label: 'Amber', bg: '#0d0b08', accent: '#f5b14d' },
    { id: 'rose' as const, label: 'Rose', bg: '#0f0810', accent: '#f472b6' },
    { id: 'violet' as const, label: 'Violet', bg: '#090810', accent: '#a78bfa' },
    { id: 'ocean' as const, label: 'Ocean', bg: '#070f12', accent: '#22d3ee' },
    { id: 'neon' as const, label: 'Neon', bg: '#030505', accent: '#4ade80' },
    { id: 'candy' as const, label: 'Candy', bg: '#0d0614', accent: '#e879f9' },
  ]

  const appStore = useAppStore()
  const configStore = useConfigStore()
  const { userName } = storeToRefs(configStore)

  const MAX_NAME_LENGTH = 20
  const nameDialog = ref(false)
  const themeDialog = ref(false)
  const avatarDialog = ref(false)
  const configModalOpen = ref(false)
  const aboutModalOpen = ref(false)
  const localName = ref(userName.value)

  const displayName = computed(() => userName.value || 'Guest')

  watch(nameDialog, open => {
    if (open) localName.value = userName.value
  })

  function saveName () {
    const trimmed = localName.value.trim().slice(0, MAX_NAME_LENGTH)
    if (!trimmed) return
    configStore.setUserName(trimmed)
    nameDialog.value = false
  }
</script>
