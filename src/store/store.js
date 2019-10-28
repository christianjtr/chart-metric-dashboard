import Vue from 'vue'
import Vuex from 'vuex'

// Modules...
import ErrorData from './modules/chart/_index'

Vue.use(Vuex)

const store = new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  modules: {
    ErrorData
  }
})

export default store
