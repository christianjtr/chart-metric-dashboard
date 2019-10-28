import API from '../api'

// Service::: Get all errors by year...
const getErrorsByYear = async (year) => {
  try {
    const data = await API().get(`/errors/year/${year}`)
    return data
  } catch (error) {
    throw error
  }
}

const getYears = async () => {
  try {
    const years = await API().get('/errors/data/years')
    return years
  } catch (error) {
    throw error
  }
}

const getLastErrors = async (year) => {
  try {
    const data = await API().get(`/errors/year/${year}/last-days`)
    return data
  } catch (error) {
    throw error
  }
}

export default {
  getErrorsByYear,
  getYears,
  getLastErrors
}
