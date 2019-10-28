<template>
  <div>
    <div v-if="chart">
      <div
        id="line-series-chart"
        class="chart"/>
    </div>
  </div>
</template>
2
<script>

import ModelChartData from '@/models/Models.ChartData'

export default {
  name: 'LineSeriesChart',
  props: {
    chartData: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      chart: null
    }
  },
  computed: {
    getSelectedDataFrequency () {
      return this.$store.getters['ErrorData/getSelectedDataFrequency']
    },
    getSelectedMonth () {
      return this.$store.getters['ErrorData/getSelectedMonth']
    }

  },
  created () {
    this.renderChart()
  },
  methods: {
    async modelizeData () {
      const chart = await new ModelChartData.ChartData(this.chartData,
        this.getSelectedDataFrequency,
        this.getSelectedMonth)

      this.chart = chart
    },
    renderChart () {
      if (!this.chart) {
        this.modelizeData().then(() => {
          this.$c3.generate({
            bindto: '#line-series-chart',
            data: this.chart.data,
            axis: this.chart.axis,
            padding: this.chart.padding,
            legend: {
              position: 'bottom'
            }
          })
        })
      }
    },
    clearChartData () {
      this.chart = null
    }
  }

}

</script>

<style lang="scss" scoped>
  .chart {
    width: 100%;
    height: 100%;
  }
</style>
