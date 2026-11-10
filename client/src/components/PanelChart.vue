<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  panel: Panel
  data?: NamedSeries[]
  loading?: boolean
  error?: string
}>()

const CHART_TYPES = {
  'area-step': 'line',
  bar: 'bar',
  line: 'line'
} as const

const chartEl = ref<HTMLDivElement>()
let chart: echarts.ECharts | undefined
let observer: ResizeObserver | undefined

const buildOption = (series: NamedSeries[]): EChartsOption => ({
  tooltip: { trigger: 'axis' },
  legend: { type: 'scroll', bottom: 0 },
  grid: { left: 48, right: 16, top: 24, bottom: 64 },
  xAxis: { type: 'time' },
  yAxis: { type: 'value', minInterval: 1 },
  series: series.map((s) => ({
    name: s.name,
    type: CHART_TYPES[props.panel.chart],
    stack: 'total',
    ...(props.panel.chart === 'area-step'
      ? { step: 'start', areaStyle: {}, symbol: 'none' }
      : props.panel.chart === 'line'
        ? { symbol: 'none' }
        : {}),
    data: s.points.map((p) => [p.x, p.y])
  }))
})

const render = () => {
  if (!chart) return
  chart.setOption(buildOption(props.data ?? []), { notMerge: true })
}

onMounted(() => {
  if (!chartEl.value) return
  chart = echarts.init(chartEl.value)
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(chartEl.value)
  render()
})

watch(() => props.data, render)

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
})
</script>

<template>
  <v-card>
    <v-progress-linear :active="props.loading" color="primary" indeterminate />
    <v-card-title>{{ props.panel.title }}</v-card-title>
    <v-alert v-if="props.error" type="error" variant="tonal" class="mx-4">
      {{ props.error }}
    </v-alert>
    <v-card-text>
      <div ref="chartEl" style="height: 320px" />
    </v-card-text>
  </v-card>
</template>
