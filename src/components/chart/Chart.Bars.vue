<template>
  <div>
    <div v-if="chartDataObj">
      <div
        :id="chartId"
        class="chart"/>
    </div>
  </div>
</template>

<script>

import { mapState } from 'vuex'
import ModelChartData from '@/models/Models.ChartData'

export default {
  name: 'BarChart',
  props: {
    chartId: {
      type: String
    }
  },
  data () {
    return {
      chartDataObj: null
    }
  },
  methods: {
    renderChart (data) {
      this.chartDataObj = data
      this.$c3.generate({
        bindto: `#${this.chartId}`,
        data: {
          columns: [
            [this.chartDataObj.errorType, ...this.chartDataObj.columns]
          ],
          types: {
            [this.chartDataObj.errorType]: this.chartDataObj.type
          }
        },
        size: {
          height: 50,
          width: 200
        },
        axis: {
          x: this.chartDataObj.x,
          y: {
            show: false
          }
        },
        legend: {
          show: false
        }
      })
    }
  }

}

</script>

<style lang="scss" scoped>
  .chart {
    width: 100%;
    height: 50%;
  }
</style>
