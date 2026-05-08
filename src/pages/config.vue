<template>
  <v-container class="page-container" fluid>
    <v-card class="page-card" flat>
      <div class="page-card-head">
        <h2>Firebase Config</h2>
      </div>

      <div class="page-card-body">
        <v-alert
          v-if="showError"
          class="cfg-alert cfg-alert-error"
          type="error"
          variant="tonal"
        >
          No Firebase config found. Enter your project credentials below.
        </v-alert>

        <v-alert
          class="cfg-alert cfg-alert-info"
          type="info"
          variant="tonal"
        >
          Config can also be loaded from a shared URL. Paste it in your address bar.
        </v-alert>

        <v-form @submit.prevent="saveConfig">
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

          <div class="page-card-foot config-actions">
            <v-btn
              class="p0-btn p0-btn-primary"
              prepend-icon="mdi-content-save"
              type="submit"
              variant="flat"
            >
              Save config
            </v-btn>

            <v-btn
              class="p0-btn p0-btn-ghost"
              prepend-icon="mdi-share-variant"
              variant="flat"
              @click="shareConfig"
            >
              Share config
            </v-btn>
          </div>
        </v-form>
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app'
  import { type FirebaseConfig, useConfigStore } from '@/stores/config'
  import { copyText } from '@/utils/clipboard'

  defineProps<{
    showError?: boolean
  }>()

  const router = useRouter()
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

  configStore.initializeConfig()
  if (firebaseConfig?.value) {
    Object.assign(config.value, firebaseConfig.value)
  }

  function saveConfig () {
    configStore.saveFirebaseConfig({ ...config.value })
    appStore.setRoomInfo(null, '', 0)
    router.push('/')
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
