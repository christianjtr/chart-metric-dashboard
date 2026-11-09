import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import App from './App.vue'

const vuetify = createVuetify({})

createApp(App).use(createPinia()).use(vuetify).mount('#app')
