<template>
  <v-container>
    <v-card>
      <v-card-title>
        Config
      </v-card-title>

      <v-card-text>
        <v-alert v-if="showError" text="NO_CONFIG_FOUND" type="error" />
        <v-alert class="mt-4" text="CONFIG_CAN_BE_LOADED_FROM_URL" type="info" />

        <v-form class="mt-4" @submit.prevent="saveConfig">
          <v-text-field
            v-model="config.apiKey"
            label="apiKey"
            type="password"
          />

          <v-text-field
            v-model="config.authDomain"
            label="authDomain"
          />

          <v-text-field
            v-model="config.databaseUrl"
            label="databaseUrl"
          />

          <v-text-field
            v-model="config.projectId"
            label="projectId"
          />

          <v-text-field
            v-model="config.storageBucket"
            label="storageBucket"
          />

          <v-text-field
            v-model="config.messagingSenderId"
            label="messagingSenderId"
          />

          <v-text-field
            v-model="config.appId"
            label="appId"
          />

          <v-btn class="mt-4" color="primary" type="submit">
            Save
          </v-btn>

          <v-btn class="mt-4 ms-3" color="secondary" type="button" @click="shareConfig">
            Share config
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { type FirebaseConfig, useConfigStore } from '@/stores/config'

  defineProps<{
    showError?: boolean
  }>()

  const router = useRouter()
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
    configStore.saveFirebaseConfig({
      apiKey: config.value.apiKey,
      authDomain: config.value.authDomain,
      databaseUrl: config.value.databaseUrl,
      projectId: config.value.projectId,
      storageBucket: config.value.storageBucket,
      messagingSenderId: config.value.messagingSenderId,
      appId: config.value.appId,
    })
    router.push('/')
  }

  function shareConfig () {
    const encoded = btoa(JSON.stringify(config.value))
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?config=${encodeURIComponent(encoded)}`

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => window.alert('Config URL copied to clipboard'))
        .catch(() => window.prompt('Copy this link', url))
    } else {
      window.prompt('Copy this link', url)
    }
  }
</script>
