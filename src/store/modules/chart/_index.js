import getters from './getters'
import mutations from './mutations'
import actions from './actions'

// This should be retrived from a service... is just a dummy example...

const state = {
  ChartData: null,
  Errors: {
    types: [
      { id: 1, error: 'In Page Errors', icon: 'error' },
      { id: 2, error: 'Connection Errors', icon: 'router' },
      { id: 3, error: 'Page Load Errors', icon: 'restore_page' }
    ]
  },
  DataFrequency: [
    { id: 1, frequency: 'MONTHLY', description: 'Monthly', default: true, selected: true },
    { id: 2, frequency: 'WEEKLY', description: 'Weekly', default: false, selected: false },
    { id: 3, frequency: 'DAILY', description: 'Daily', default: false, selected: false }
  ],
  Years: [],
  SelectedYear: null,
  LastErrors: {
    data: null
  },
  Months: [
    { id: 1, month: 'JANUARY', description: 'January', selected: false },
    { id: 2, month: 'FEBRUARY', description: 'February', selected: false },
    { id: 3, month: 'MARCH', description: 'March', selected: false },
    { id: 4, month: 'APRIL', description: 'April', selected: false },
    { id: 5, month: 'MAY', description: 'May', selected: false },
    { id: 6, month: 'JUNE', description: 'June', selected: false },
    { id: 7, month: 'JULY', description: 'July', selected: false },
    { id: 8, month: 'AUGUST', description: 'August', selected: false },
    { id: 9, month: 'SEPTEMBER', description: 'September', selected: false },
    { id: 10, month: 'OCTOBER', description: 'October', selected: false },
    { id: 11, month: 'NOVEMBER', description: 'November', selected: false },
    { id: 12, month: 'DECEMBER', description: 'December', selected: false }
  ]
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
