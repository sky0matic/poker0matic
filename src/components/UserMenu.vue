<template>
  <v-menu location="bottom end" origin="top end">
    <template #activator="{ props }">
      <v-btn v-bind="props" class="text-none" variant="text">
        <v-avatar class="mr-2" color="primary" size="32">
          <span class="text-caption font-weight-bold">{{ initials }}</span>
        </v-avatar>

        <span class="text-body-2">{{ displayName }}</span>
      </v-btn>
    </template>

    <v-list density="compact" min-width="180">
      <v-list-item prepend-icon="mdi-pencil" title="Change name" @click="nameDialog = true" />

      <v-list-item
        prepend-icon="mdi-palette"
        :title="`Theme: ${appStore.currentTheme}`"
        @click="appStore.cycleTheme()"
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
  import { useAppStore } from '@/stores/app'
  import { useConfigStore } from '@/stores/config'

  const appStore = useAppStore()
  const configStore = useConfigStore()
  const { userName } = storeToRefs(configStore)

  const MAX_NAME_LENGTH = 20
  const nameDialog = ref(false)
  const localName = ref(userName.value)

  const displayName = computed(() => userName.value || 'Guest')
  const initials = computed(() =>
    displayName.value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
  )

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
