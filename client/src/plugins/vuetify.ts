import { createVuetify } from 'vuetify'
import 'vuetify/styles'

export default createVuetify({
  theme: {
    defaultTheme: 'sentryDark',
    themes: {
      sentryDark: {
        dark: true,
        colors: {
          background: '#12121a',
          surface: '#1c1c26',
          primary: '#7a6ff0',
          secondary: '#8b8fa3',
          error: '#e5544b',
          success: '#4fac6e',
          warning: '#e0a12f',
          info: '#3e8ff7'
        }
      }
    }
  }
})
