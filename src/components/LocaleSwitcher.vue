<template>
  <v-menu location="bottom end" origin="top end">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        append-icon="mdi-menu-down"
        :aria-label="t('app.selectLanguage')"
        class="me-1 text-none"
        density="compact"
        variant="text"
      >
        <span class="text-body-2">{{ locale.split('-')[0].toUpperCase() }}</span>
      </v-btn>
    </template>

    <v-list density="compact" min-width="160">
      <v-list-item
        v-for="loc in availableLocales"
        :key="loc.code"
        :active="locale === loc.code"
        color="primary"
        @click="selectLocale(loc.code)"
      >
        {{ loc.nativeName }}
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
  import { useI18n } from 'vue-i18n'
  import { availableLocales, setLocale } from '@/plugins/i18n'

  const { t, locale } = useI18n()

  function selectLocale (code: string) {
    setLocale(code)
  }
</script>
