<template>
  <v-app>
    <v-toolbar height="48" rounded tile>
      <v-app-bar-title>
        <v-btn :active="false" text="poker0matic" to="/" />
      </v-app-bar-title>

      <v-toolbar-items>
        <v-btn text="Home" to="/" />
        <v-btn text="Config" to="/config" />
        <v-btn text="Attributions" to="/attributions" />
      </v-toolbar-items>

      <v-spacer />

      <v-btn icon @click="toggleTheme">
        <v-icon>{{ themeIcon }}</v-icon>
      </v-btn>
    </v-toolbar>

    <v-main>
      <router-view />
    </v-main>

  </v-app>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useTheme } from 'vuetify'

  const theme = useTheme()

  const themeIcon = computed(() => {
    return theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'
  })

  function toggleTheme () {
    theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
  }
</script>
