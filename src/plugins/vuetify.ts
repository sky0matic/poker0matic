import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export default createVuetify({
  theme: {
    defaultTheme: 'midnight',
    themes: {
      midnight: {
        dark: true,
        colors: {
          background: '#0a0c10',
          surface: '#0f131a',
          primary: '#4f8cff',
          secondary: '#3ecf8e',
          error: '#f05a5a',
          warning: '#f5b14d',
          success: '#3ecf8e',
          info: '#4f8cff',
        },
      },
    },
  },
})
