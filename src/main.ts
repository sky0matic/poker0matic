/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Composables
import { createApp } from 'vue'

// Plugins
import { registerPlugins } from '@/plugins'
import router from '@/router'
import { mountWhenReady } from '@/utils/mountWhenReady'

// Components
import App from './App.vue'

// Styles
import 'unfonts.css'

const app = createApp(App)

registerPlugins(app)

// Wait for the initial navigation so the presenter window never flashes the toolbar.
mountWhenReady(app, router, '#app')
