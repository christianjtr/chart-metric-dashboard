const moment = require('moment')
const DATA_FREQUENCY = require('../../config/_variables').DATA_FREQUENCY

const getMonthNames = () => {
  const monthNames = []
  const monthNumbers = Array.from(Array(12).keys())
  for (var i = 0; i < monthNumbers.length; i++) {
    monthNames.push(moment().month(i).format('MMMM'))
  }
  return monthNames
}

const MONTH_NAMES = getMonthNames()

export default {
  moment,
  DATA_FREQUENCY,
  MONTH_NAMES
}
