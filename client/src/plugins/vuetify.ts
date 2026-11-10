import { createVuetify } from 'vuetify'
import 'vuetify/styles'

export default createVuetify({
  theme: {
    defaultTheme: 'grafanaDark',
    themes: {
      grafanaDark: {
        dark: true,
        colors: {
          background: '#111217',
          surface: '#181b1f',
          primary: '#3274d9',
          secondary: '#585f6d',
          error: '#f2495c',
          success: '#73bf69',
          warning: '#f2cc0c'
        }
      }
    }
  }
})
