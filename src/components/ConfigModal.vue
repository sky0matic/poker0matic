<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { ref, watch } from 'vue'
  import { useAppStore } from '@/stores/app'
  import { type FirebaseConfig, useConfigStore } from '@/stores/config'
  import { copyText } from '@/utils/clipboard'

  const props = defineProps<{
    modelValue: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
  }>()

  const appStore = useAppStore()
  const configStore = useConfigStore()
  const { firebaseConfig } = storeToRefs(configStore)

  const config = ref<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    databaseUrl: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  })

  // Sync form fields whenever the dialog opens
  watch(() => props.modelValue, open => {
    if (open) {
      configStore.initializeConfig()
      if (firebaseConfig.value) {
        Object.assign(config.value, firebaseConfig.value)
      }
    }
  }, { immediate: true })

  function saveConfig () {
    configStore.saveFirebaseConfig({ ...config.value })
    appStore.setRoomInfo(null, '', 0)
    appStore.showToast('Firebase config saved.', 'success')
    emit('update:modelValue', false)
  }

  async function shareConfig () {
    const encoded = btoa(JSON.stringify(config.value))
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?config=${encodeURIComponent(encoded)}`
    const ok = await copyText(url)

    appStore.showToast(
      ok ? 'Config link copied.' : 'Copy failed. Your browser blocked clipboard access.',
      ok ? 'success' : 'error',
    )
  }
</script>

<template>
  <v-dialog
    max-width="500"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="p0-modal" flat>
      <div class="p0-modal-head">
        <h2>Firebase Config</h2>
        <p>Connect the app to your own Firebase Realtime Database project.</p>
      </div>

      <v-form @submit.prevent="saveConfig">
        <div class="p0-modal-body">
          <div class="config-fields">
            <v-text-field
              v-model="config.apiKey"
              autocomplete="off"
              class="p0-field"
              hide-details="auto"
              label="apiKey"
              type="password"
              variant="outlined"
            />

            <v-text-field
              v-model="config.authDomain"
              class="p0-field"
              hide-details="auto"
              label="authDomain"
              variant="outlined"
            />

            <v-text-field
              v-model="config.databaseUrl"
              class="p0-field"
              hide-details="auto"
              label="databaseUrl"
              variant="outlined"
            />

            <v-text-field
              v-model="config.projectId"
              class="p0-field"
              hide-details="auto"
              label="projectId"
              variant="outlined"
            />

            <v-text-field
              v-model="config.storageBucket"
              class="p0-field"
              hide-details="auto"
              label="storageBucket"
              variant="outlined"
            />

            <v-text-field
              v-model="config.messagingSenderId"
              class="p0-field"
              hide-details="auto"
              label="messagingSenderId"
              variant="outlined"
            />

            <v-text-field
              v-model="config.appId"
              class="p0-field"
              hide-details="auto"
              label="appId"
              variant="outlined"
            />
          </div>
        </div>

        <div class="p0-modal-foot">
          <v-btn
            class="p0-btn p0-btn-ghost"
            prepend-icon="mdi-share-variant"
            variant="flat"
            @click="shareConfig"
          >
            Share config
          </v-btn>

          <v-btn
            class="p0-btn p0-btn-primary"
            prepend-icon="mdi-content-save"
            type="submit"
            variant="flat"
          >
            Save config
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
