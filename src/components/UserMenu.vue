<template>
  <v-menu location="bottom end" origin="top end">
    <template #activator="{ props }">
      <v-btn v-bind="props" class="text-none" variant="text">
        <v-avatar class="mr-2" color="primary" size="32">
          <span class="text-caption font-weight-bold">{{ initials }}</span>
        </v-avatar>

        <span class="text-body-2">{{ userName }}</span>
      </v-btn>
    </template>

    <v-list density="compact" min-width="180">
      <v-list-item prepend-icon="mdi-pencil" title="Change name" @click="nameDialog = true" />

      <v-list-item
        :prepend-icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        :title="isDark ? 'Light mode' : 'Dark mode'"
        @click="toggleTheme"
      />

      <v-list-item
        :prepend-icon="preferencesStore.reducedMotion ? 'mdi-motion-pause' : 'mdi-motion-play'"
        :title="preferencesStore.reducedMotion ? 'Enable animations' : 'Reduce motion'"
        @click="preferencesStore.toggleReducedMotion"
      />
    </v-list>
  </v-menu>

  <v-dialog v-model="nameDialog" max-width="400">
    <v-card>
      <v-card-title>Change name</v-card-title>

      <v-card-text class="pt-4">
        <v-form @submit.prevent="saveName">
          <v-text-field
            v-model="localName"
            autofocus
            :counter="MAX_NAME_LENGTH"
            label="Your name"
            :maxlength="MAX_NAME_LENGTH"
          />
        </v-form>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn @click="nameDialog = false">Cancel</v-btn>
        <v-btn color="primary" :disabled="!localName.trim()" @click="saveName">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import { useTheme } from 'vuetify'
  import { useConfigStore } from '@/stores/config'
  import { usePreferencesStore } from '@/stores/preferences'

  const configStore = useConfigStore()
  const { userName } = storeToRefs(configStore)
  const theme = useTheme()
  const preferencesStore = usePreferencesStore()

  const MAX_NAME_LENGTH = 20
  const nameDialog = ref(false)
  const localName = ref(userName.value)

  const initials = computed(() =>
    userName.value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
  )

  const isDark = computed(() => theme.global.current.value.dark)

  function toggleTheme () {
    theme.change(isDark.value ? 'light' : 'dark')
  }

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
