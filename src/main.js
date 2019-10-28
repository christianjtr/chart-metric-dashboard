import Vue from 'vue'
import Vuetify from 'vuetify'
import * as c3 from 'c3'
import App from './App.vue'
import router from './router/router'
import store from './store/store'

import 'c3/c3.min.css'

Vue.config.productionTip = false

Vue.prototype.$c3 = c3

Vue.use(Vuetify)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
