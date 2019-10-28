const isChartDataRetrieved = state => !!state.ChartData
const getSelectedDataFrequency = state => state.DataFrequency.find(f => f.selected)
const getSelectedMonth = state => state.Months.find(m => m.selected)
const getSelectedYear = state => state.SelectedYear
const getLastErrors = state => state.LastErrors

export default {
  isChartDataRetrieved,
  getSelectedDataFrequency,
  getSelectedMonth,
  getSelectedYear,
  getLastErrors
}
