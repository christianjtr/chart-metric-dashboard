import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vuetify from './plugins/vuetify'
import './styles/panels.css'
import App from './App.vue'

createApp(App).use(createPinia()).use(vuetify).mount('#app')
