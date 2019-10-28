import ChartServices from '@/services/chart/services.chart'
import CHART_MUTATIONS from './mutation_types'
import CHART_DATA_MODELS from '@/models/Models.ChartData'

const getErrorsByYear = async ({ commit }, year) => {
  const errorData = await ChartServices.getErrorsByYear(year)
  commit(CHART_MUTATIONS.SET_CHART_DATA, errorData.data)
}

const getYears = async ({ commit }) => {
  const yearsData = await ChartServices.getYears()
  commit(CHART_MUTATIONS.SET_YEARS, yearsData.data.years)
}

const setDataFrequency = ({ commit }, frequency) => {
  commit(CHART_MUTATIONS.SET_DATA_FREQUENCY, frequency)
}

const setDataMonth = ({ commit }, month) => {
  commit(CHART_MUTATIONS.SET_DATA_MONTH, month)
}

const getLastErrors = async ({ commit }, year) => {
  const errorData = await ChartServices.getLastErrors(year)
  const data = new CHART_DATA_MODELS.ChartDataInBars(errorData.data)
  commit(CHART_MUTATIONS.SET_LAST_ERRORS, data)
}

export default {
  getErrorsByYear,
  getYears,
  setDataFrequency,
  setDataMonth,
  getLastErrors
}
