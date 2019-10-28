<template>
  <div>
    <v-layout
      row
      wrap>
      <v-flex
        xs12
        md12
        class="px-0 py-0">
        <v-card class="card__container">
          <v-card-title class="card__title">
            <span class="headline title--white">{{ chartTitle }}</span>
            <v-spacer/>
            <more-actions-menu/>
          </v-card-title>
          <v-card-text class="card__chart-container">
            <v-container
              fluid
              class="px-0 py-0">
              <v-layout
                row
                wrap>
                <v-flex
                  xs9
                  md9
                  class="px-0 py-0 elevation-1">
                  <v-container fluid>
                    <v-layout
                      wrap
                      column>
                      <v-flex
                        xs12
                        md12>
                        <chart-actions
                          @get-data="getErrorsByYear"
                          @set-data="setData"/>
                      </v-flex>
                      <v-flex
                        xs12
                        fill-height>
                        <div class="card__chart-area">
                          <line-series-chart
                            v-if="isChartDataRetrieved"
                            ref="lineSeriesChart"
                            :chart-data="Errors.ChartData"/>
                          <v-btn
                            v-else
                            fab
                            loading
                            small
                            dark/>
                        </div>
                      </v-flex>
                    </v-layout>
                  </v-container>
                </v-flex>
                <v-flex
                  xs3
                  md3
                  class="px-0 py-0">
                  <template v-if="getSelectedYear">
                    <key-indicators
                      ref="keyIndicators"
                      :data-year="getSelectedYear"/>
                  </template>
                  <v-btn
                    dark
                    @click="viewReports">
                    {{ buttonTitle }}
                  </v-btn>
                </v-flex>
              </v-layout>
            </v-container>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </div>
</template>

<script>

import { mapState } from 'vuex'

// Charts...
import LineSeriesChart from '@/components/chart/Chart.LineSeries'
// UI...
import ChartActions from '@/components/Chart.UI.Actions'
import MoreActionsMenu from '@/components/Chart.UI.MoreActionsMenu'
import KeyIndicators from '@/components/Chart.UI.KeyIndicators.vue'

export default {
  name: 'ChartContainer',
  components: {
    LineSeriesChart,
    ChartActions,
    MoreActionsMenu,
    KeyIndicators
  },
  data () {
    return {
      chartTitle: 'Errors Overview',
      buttonTitle: 'View reports'
    }
  },
  computed: {
    ...mapState('ErrorData', {
      Errors: state => state
    }),
    isChartDataRetrieved () {
      return this.$store.getters['ErrorData/isChartDataRetrieved']
    },
    getSelectedYear () {
      return this.$store.getters['ErrorData/getSelectedYear']
    }
  },
  mounted () {

  },
  methods: {
    async getErrorsByYear (year) {
      if (this.$refs.lineSeriesChart) {
        this.$refs.lineSeriesChart.clearChartData()
      }

      const getErrorsByYearPromise = await this.$store.dispatch('ErrorData/getErrorsByYear', year)
      const getLastErrorsPromise = await this.$store.dispatch('ErrorData/getLastErrors', year)

      this.$refs.lineSeriesChart.renderChart()
      this.$refs.keyIndicators.renderKeyIndicators()
    },
    setData () {
      this.$refs.lineSeriesChart.clearChartData()
      this.$refs.lineSeriesChart.renderChart()
    },
    viewReports () {
      console.log('Dummy action: View reports...')
    }
  }
}

</script>

<style lang="scss" scoped>
  .card__container {
    .card__title {
      background-color: darkslateblue;
      .title--white {
        color: white !important;
      }
    }
    .card__chart-container {
      .card__chart-area {
      }
    }
    button {
      background-color: darkslateblue !important;
    }
  }
</style>
