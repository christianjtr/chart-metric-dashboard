const _ = require('underscore');
const moment = require('moment');

const DATA_FREQUENCY = require('../../config/_variables').DATA_FREQUENCY;
const TOTAL_DAYS_IN_YEAR = require('../../config/_variables').TOTAL_DAYS_IN_YEAR;

//AVAILABLE YEARS...

const Years = class Years {
  constructor(errors) {
    this.years = _(errors).chain()
      .groupBy('date')
      .map((errorList, errorType) => {
        // Hey: This format must be provided by the service... it is just a test...
        return Number(moment(errorType, 'DD-MM-YYYY').format('YYYY'));
      })
      .uniq()
      .value();
  }
};

// TOTAL OF ERRORS BY YEAR...

const Errors = class Errors {
  constructor(errors, year) {
    this.data = errorsByYear(errors, year);
    this.year = year;
  }
};

const errorsByYear = (errors, year) => {
  const data = {
    totalErrorsByYear: _(errors).chain() 
    .groupBy('typeOfError')
    .map((errorList, errorType) => {
      return {
        errorType,
        totalMonthlyErrors: errorsByFrequency(errorList, DATA_FREQUENCY.MONTHLY, year),
        totalWeeklyErrors: errorsByFrequency(errorList, DATA_FREQUENCY.WEEKLY, year),
        totalDailyErrors: errorsByFrequency(errorList, DATA_FREQUENCY.DAILY, year),
        total: errorList.length,
      };
    })
    .sortBy('errorType')
    .value(),
    totals: {
      totalByYear: errors.length,
    },
  };
  return data;
};

const errorsByFrequency = (errors, frequency, year) => {
  let data = null;
  const dataFrequencyCalcs = {
    [DATA_FREQUENCY.MONTHLY]: () => {
      const data = _(errors)
        .chain() 
        .groupBy(error => Number(moment(error.date).month()))
        .map((errorList, monthNumber) => {
          return {
            monthID: Number(monthNumber) + 1, 
            month: moment().month(Number(monthNumber)).format('MMMM'),
            total: errorList.length,
            year
          };
        })
        .sortBy('monthID')
        .value();

      return data;
    },
    [DATA_FREQUENCY.WEEKLY]: () => {
      const arrayOfWeeksInYear = getArrayOfWeeksInYear()
      data = _(errors)
        .chain() 
        .groupBy(error => `${moment(error.date).week()}/${Number(moment(error.date).month())}`)
        .map((errorList, dateData) => {
          return {
            monthID: Number(dateData.split('/')[1]) + 1,
            week: Number(dateData.split('/')[0]),
            total: errorList.length,
            year
          };
      })
      .value();

      //Hey: Integrity of the data...
      /*
      _(arrayOfWeeksInYear).each((weekNumber) => {
          const isInArray = data.find(element => element.week === weekNumber)
          if(typeof isInArray === 'undefined') {
            data.push({
              week: weekNumber,
              total: 0
            })
          }
        });
      */
        
      data = _(data).sortBy('week');
      return data;
    },
    [DATA_FREQUENCY.DAILY]: () => {
      data = _(errors)
        .chain() 
        .groupBy(error => error.date)
        .map((errorList, date) => {
          return {
            monthID: Number(moment(moment(date).format('DD-MM-YYYY')).month()) + 1,
            day: Number(date.split('-')[0]),
            date,
            total: errorList.length,
            year
          };
      })
      .sortBy('day')
      .value();

      return data;
    }
  };

  data = dataFrequencyCalcs[frequency]();
  return data;
};

const getArrayOfWeeksInYear = () => {
  return [...Array(moment().weeksInYear() - 1 + 1).fill().map((item, index) => 1 + index)];
}

//LAST 30 ERRORS BY YEAR...

const LastErrorsByYear = class LastErrorsByYear {
  constructor(errors, year) {
    this.data = lastErrorsByYear(errors);
    this.year = year;
  }
}

const lastErrorsByYear = (errors, year) => {
  const data = {
    totalErrorsByYear: _(errors)
      .chain()
      .groupBy('typeOfError')
      .map((errorList, errorType) => {
        return {
          errorType,
          errorList: getLastErrors(errorList),
        }
      })
      .sortBy('errorType')
      .value(),
  }

  return  data;
}

const getLastErrors = (errorList) => {
  let errors = errorList
    .filter(error => Number(error.date.split('-')[1]) === 12)
    .map(error => ({
      date: error.date,
      typeOfError: error.typeOfError,
      dateFormat: moment(error.date)
    }));

  errors = _(errors)
    .chain()
    .sortBy('dateFormat')
    .groupBy('date')
    .value();
  
  return  errors;
}

//Exporting modules...

module.exports = {
  Errors,
  Years,
  LastErrorsByYear
};
