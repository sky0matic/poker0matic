<template>
  <div class="page-container">
    <div class="page-card">
      <div class="page-card-head">
        <h2>Firebase Config</h2>
      </div>

      <div class="page-card-body">
        <div v-if="showError" class="cfg-alert error">
          No Firebase config found. Enter your project credentials below.
        </div>

        <div class="cfg-alert info">
          Config can also be loaded from a shared URL. Paste it in your address bar.
        </div>

        <form @submit.prevent="saveConfig">
          <div class="config-fields">
            <div class="field-group">
              <label class="field-label">apiKey</label>

              <input
                v-model="config.apiKey"
                autocomplete="off"
                class="field-input"
                type="password"
              >
            </div>

            <div class="field-group">
              <label class="field-label">authDomain</label>
              <input v-model="config.authDomain" class="field-input">
            </div>

            <div class="field-group">
              <label class="field-label">databaseUrl</label>
              <input v-model="config.databaseUrl" class="field-input">
            </div>

            <div class="field-group">
              <label class="field-label">projectId</label>
              <input v-model="config.projectId" class="field-input">
            </div>

            <div class="field-group">
              <label class="field-label">storageBucket</label>
              <input v-model="config.storageBucket" class="field-input">
            </div>

            <div class="field-group">
              <label class="field-label">messagingSenderId</label>
              <input v-model="config.messagingSenderId" class="field-input">
            </div>

            <div class="field-group">
              <label class="field-label">appId</label>
              <input v-model="config.appId" class="field-input">
            </div>
          </div>

          <div class="page-card-foot config-actions">
            <button class="btn btn-primary" type="submit">Save config</button>

            <button class="btn btn-ghost" type="button" @click="shareConfig">
              Share config
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
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
