import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

config.global.plugins = [createVuetify({ components, directives })]

if (!window.visualViewport) {
  Object.defineProperty(window, 'visualViewport', {
    value: { width: 1024, height: 768, offsetLeft: 0, offsetTop: 0, pageLeft: 0, pageTop: 0, scale: 1, addEventListener: () => {}, removeEventListener: () => {} },
    writable: true,
    configurable: true,
  })
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe () {}
    unobserve () {}
    disconnect () {}
  }
}