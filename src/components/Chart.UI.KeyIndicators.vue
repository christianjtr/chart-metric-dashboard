<template>
  <div>
    <v-container>
      <v-layout
        column
        wrap>
        <span class="subtitle mb-3 text-xs-left text-color--orange">
          <strong>{{ `Errors on the 30 last days of ${this.Year}` }}</strong>
        </span>
        <template v-if="ErrorTypes && LastErrors">
          <v-flex
            v-for="(errorType, index) in ErrorTypes"
            :key="index"
            xs12
            class="mb-3">
            <v-card>
              <v-card-title primary-title>
                <div>
                  <v-icon class="mr-2">{{ errorType.icon }}</v-icon>
                  <span class="mr-2"><strong>{{ errorType.error }}:</strong></span>
                  <span
                    v-if="LastErrors"
                    class="title">
                    <strong>{{ getTotals(errorType.error) }}</strong>
                  </span>
                </div>
              </v-card-title>
              <v-card-text>
                <bar-chart
                  :chart-id="`bar-chart-${index}`"
                  :ref="`bar-chart-${index}`"
                  :data-error-type="errorType.error"/>
              </v-card-text>
            </v-card>
          </v-flex>
        </template>
      </v-layout>
    </v-container>
  </div>
</template>

<script>

import { mapState } from 'vuex'

import BarChart from '@/components/chart/Chart.Bars'

export default {
  name: 'ChartKeyIndicator',
  components: {
    BarChart
  },
  data () {
    return {
    }
  },
  computed: {
    ...mapState('ErrorData', {
      ErrorTypes: state => state.Errors.types,
      LastErrors: state => state.LastErrors.data,
      Year: state => state.SelectedYear
    })
  },
  updated () {
    this.renderKeyIndicators()
  },
  methods: {
    renderKeyIndicators () {
      const charts = Object.keys(this.$refs)
      charts.forEach((chart) => {
        const data = this.LastErrors
          .find(lastError =>
            lastError.errorType === this.$refs[chart][0].$el.dataset.errorType)

        this.$refs[chart][0].renderChart(data)
      })
    },
    getTotals (errorType) {
      const data = this.LastErrors.find(lastError => lastError.errorType === errorType)
      return data.total || 0
    }
  }
}
</script>

<style lang="css" scoped>
  .text-color--orange {
    color:  orange !important;
  }
</style>
