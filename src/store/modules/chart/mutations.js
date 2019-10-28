/* eslint no-param-reassign: ["error", { "props": false }] */

const SET_CHART_DATA = (state, data) => {
  state.ChartData = data
}

const SET_YEARS = (state, data) => {
  state.Years = data
}

const SET_DATA_FREQUENCY = (state, selectedFrecuency) => {
  state.DataFrequency.forEach((f) => {
    f.selected = f.frequency === selectedFrecuency.frequency
  })
}

const SET_DATA_MONTH = (state, selectedMonth) => {
  state.Months.forEach((month) => {
    month.selected = selectedMonth && month.id === selectedMonth.id
  })
}

const SET_SELECTED_YEAR = (state, selectedYear) => {
  state.SelectedYear = selectedYear
}

const SET_LAST_ERRORS = (state, lastErrors) => {
  state.LastErrors = lastErrors
}

export default {
  SET_CHART_DATA,
  SET_YEARS,
  SET_DATA_FREQUENCY,
  SET_DATA_MONTH,
  SET_SELECTED_YEAR,
  SET_LAST_ERRORS
}
