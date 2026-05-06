<template>
  <v-app>
    <v-toolbar height="48" rounded tile>
      <v-app-bar-title>
        <v-btn :active="false" text="poker0matic" to="/" />
      </v-app-bar-title>

      <v-toolbar-items>
        <v-btn text="Home" to="/" />
        <v-btn text="Config" to="/config" />
      </v-toolbar-items>
    </v-toolbar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  //
</script>
