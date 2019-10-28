import VARIABLES from './_Utils.Variables'

const CATEGORIES = []

const ChartData = class ChartData {
  constructor (chartData, frequency, month) {
    this.data = parseChartData(chartData.data, frequency, month)
    this.axis = parseChartAxis(frequency, month)
    this.padding = {
      left: 30,
      right: 30
    }
  }
}

const ChartDataInBars = class ChartDataInBars {
  constructor (data) {
    this.data = barChartData(data.data.totalErrorsByYear)
  }
}

const barChartData = (data) => {
  const modelizedData = []
  data.forEach((dataSet) => {
    modelizedData.push({
      errorType: dataSet.errorType,
      total: [...totalErrorsByDay(dataSet.errorList)].reduce((a, b) => a + b, 0),
      columns: [dataSet.errorType, ...totalErrorsByDay(dataSet.errorList)],
      type: 'area-step',
      x: {
        type: 'category',
        categories: [...totalCategoryErrors(dataSet.errorList)],
        label: 'Days'
      }
    })
  })

  return modelizedData
}

const totalErrorsByDay = (errorList) => {
  const totals = []
  const keys = Object.keys(errorList)
  keys.forEach(key => {
    totals.push(errorList[key].length)
  })

  return totals
}

const totalCategoryErrors = (errorList) => {
  const totalsCategoryErrors = []
  const keys = Object.keys(errorList)
  keys.forEach(key => {
    totalsCategoryErrors.push(Number(key.split('-')[0]))
  })

  return totalsCategoryErrors
}

// It could be improved... it's just a test...

const parseChartData = (chartData, frequency, month) => {
  const data = []
  const dataNames = {}

  const parsingData = {
    // Montlhy frequency...
    [VARIABLES.DATA_FREQUENCY.MONTHLY]: () => {
      chartData.totalErrorsByYear.forEach((error, index) => {
        const monthlyTotals = []
        Object.assign(dataNames, { [`data_${index}`]: error.errorType })
        error.totalMonthlyErrors.forEach(monthlyErrors => {
          if (isMonthDefined(month)) {
            if (month.id === monthlyErrors.monthID) {
              monthlyTotals.push(monthlyErrors.total)
            } else {

            }
          } else {
            monthlyTotals.push(monthlyErrors.total)
          }
        })
        data.push([`data_${index}`, ...monthlyTotals])
      })
    },
    // Weekly frequency...
    [VARIABLES.DATA_FREQUENCY.WEEKLY]: () => {
      chartData.totalErrorsByYear.forEach((error, index) => {
        const weeklyTotals = []
        Object.assign(dataNames, { [`data_${index}`]: error.errorType })
        error.totalWeeklyErrors.forEach((weeklyErrors, index) => {
          if (isMonthDefined(month)) {
            if (month.id === weeklyErrors.monthID) {
              weeklyTotals.push(weeklyErrors.total)
            } else {

            }
          } else {
            weeklyTotals.push(weeklyErrors.total)
          }
        })
        data.push([`data_${index}`, ...weeklyTotals])
      })
    },
    // Daily frequency...
    [VARIABLES.DATA_FREQUENCY.DAILY]: () => {
      chartData.totalErrorsByYear.forEach((error, index) => {
        const dailyTotals = []
        Object.assign(dataNames, { [`data_${index}`]: error.errorType })
        error.totalDailyErrors.forEach((dailyErrors, index) => {
          if (isMonthDefined(month)) {
            if (month.id === dailyErrors.monthID) {
              dailyTotals.push(dailyErrors.total)
            } else {

            }
          } else {
            dailyTotals.push(dailyErrors.total)
          }
        })
        data.push([`data_${index}`, ...dailyTotals])
      })
    }
  }

  parsingData[frequency.frequency]()

  return {
    columns: [...data],
    names: dataNames
  }
}

const parseChartAxis = (frequency, data, month) => {
  const parsingAxis = {
    [VARIABLES.DATA_FREQUENCY.MONTHLY]: () => {
      return month ? [month.description] : [...VARIABLES.MONTH_NAMES]
    },
    [VARIABLES.DATA_FREQUENCY.WEEKLY]: () => {
      return [...Array.from(new Array(VARIABLES.moment().weeksInYear()), (val, index) => `Week ${index + 1}`)]
    },
    [VARIABLES.DATA_FREQUENCY.DAILY]: () => {
      return [...Array.from(new Array(31), (val, index) => `Day ${index + 1}`)]
    }
  }

  return {
    x: {
      type: 'category',
      categories: parsingAxis[frequency.frequency](),
      label: xAxisTitle(frequency.frequency)
    },
    y: {
      label: 'No. Errors'
    }
  }
}

const xAxisTitle = (frequency) => {
  const titlesByFrequency = {
    [VARIABLES.DATA_FREQUENCY.MONTHLY]: () => {
      return 'Months'
    },
    [VARIABLES.DATA_FREQUENCY.WEEKLY]: () => {
      return 'Weeks'
    },
    [VARIABLES.DATA_FREQUENCY.DAILY]: () => {
      return 'Days'
    }
  }
  return titlesByFrequency[frequency]()
}

const isMonthDefined = month => typeof month !== 'undefined' && month

export default {
  ChartData,
  ChartDataInBars
}
