<template>
  <v-container>
    <v-card>
      <v-card-title>
        {{ t('config.title') }}
      </v-card-title>

      <v-card-text>
        <v-alert v-if="showError" :text="t('config.noConfigAlert')" type="error" />
        <v-alert class="mt-4" :text="t('config.shareUrlAlert')" type="info" />

        <v-alert v-if="showError" class="mt-4" type="info" variant="tonal">
          <i18n-t keypath="config.newTeamAlert">
            <template #link>
              <a href="https://github.com/sky0matic/poker0matic/blob/main/CONFIG.md" rel="noopener noreferrer" target="_blank">{{ t('config.setupGuide') }}</a>
            </template>
          </i18n-t>
        </v-alert>

        <v-form class="mt-4" @submit.prevent="saveConfig">
          <v-text-field
            v-model="config.apiKey"
            :label="t('config.fields.apiKey')"
            type="password"
          />

          <v-text-field
            v-model="config.authDomain"
            :label="t('config.fields.authDomain')"
          />

          <v-text-field
            v-model="config.databaseUrl"
            :label="t('config.fields.databaseUrl')"
          />

          <v-text-field
            v-model="config.projectId"
            :label="t('config.fields.projectId')"
          />

          <v-text-field
            v-model="config.storageBucket"
            :label="t('config.fields.storageBucket')"
          />

          <v-text-field
            v-model="config.messagingSenderId"
            :label="t('config.fields.messagingSenderId')"
          />

          <v-text-field
            v-model="config.appId"
            :label="t('config.fields.appId')"
          />

          <v-btn class="mt-4" color="primary" type="submit">
            {{ t('config.save') }}
          </v-btn>

          <v-btn class="mt-4 ms-3" color="secondary" type="button" @click="shareConfig">
            {{ t('config.shareConfig') }}
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { type FirebaseConfig, useConfigStore } from '@/stores/config'

  const { t } = useI18n()

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
        .then(() => window.alert(t('config.copiedToClipboard')))
        .catch(() => window.prompt(t('config.copyThisLink'), url))
    } else {
      window.prompt(t('config.copyThisLink'), url)
    }
  }
</script>
