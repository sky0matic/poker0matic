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
        <img
          v-if="currentLocale?.flagSvg"
          :alt="currentLocale.nativeName"
          class="locale-flag me-2"
          :src="currentLocale.flagSvg"
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
        <template #prepend>
          <img
            v-if="loc.flagSvg"
            :alt="loc.nativeName"
            class="locale-flag me-3"
            :src="loc.flagSvg"
          >
        </template>

        {{ loc.nativeName }}
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { availableLocales, setLocale } from '@/plugins/i18n'

  const { t, locale } = useI18n()

  const currentLocale = computed(() => availableLocales.find(l => l.code === locale.value))

  function selectLocale (code: string) {
    setLocale(code)
  }
</script>

<style scoped>
  .locale-flag {
    height: 1em;
    aspect-ratio: 4 / 3;
    object-fit: contain;
    vertical-align: middle;
  }
</style>
