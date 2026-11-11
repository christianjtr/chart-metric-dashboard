<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'
import PanelDescription from './PanelDescription.vue'

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  panel: Panel
  data?: NamedSeries[]
  loading?: boolean
  error?: string
}>()

const CHART_TYPES: Record<string, 'line' | 'bar'> = {
  'area-step': 'line',
  bar: 'bar',
  line: 'line',
  stat: 'line'
}

const SENTRY_PALETTE = [
  '#7a6ff0',
  '#3e8ff7',
  '#4fac6e',
  '#e0a12f',
  '#e5544b',
  '#8b8fa3',
  '#c65cc7',
  '#2fd8d0'
]

const chartEl = ref<HTMLDivElement>()
let chart: echarts.ECharts | undefined
let observer: ResizeObserver | undefined

const buildOption = (series: NamedSeries[]): EChartsOption => {
  const hasLegend = series.length > 1
  return {
    backgroundColor: 'transparent',
    color: SENTRY_PALETTE,
    tooltip: { trigger: 'axis' },
    ...(hasLegend
      ? { legend: { type: 'scroll', bottom: 0, textStyle: { color: '#9aa0a6', fontSize: 10 } } }
      : {}),
    grid: { left: 40, right: 12, top: 16, bottom: hasLegend ? 56 : 20 },
    xAxis: { type: 'time', axisLabel: { color: '#9aa0a6', fontSize: 10 } },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#9aa0a6', fontSize: 10 }
    },
    series: series.map((s, i) => ({
      name: s.name,
      type: CHART_TYPES[props.panel.chart],
      stack: props.panel.chart === 'line' ? undefined : 'total',
      ...(props.panel.chart === 'area-step'
        ? { step: 'start', areaStyle: { opacity: 0.85 }, symbol: 'none' }
        : props.panel.chart === 'line'
          ? { symbol: 'none', color: SENTRY_PALETTE[i % SENTRY_PALETTE.length] }
          : {}),
      data: s.points.map((p) => [p.x, p.y])
    }))
  }
}

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
  <v-card class="panel-card fill-height">
    <v-progress-linear :active="props.loading" color="primary" indeterminate />
    <v-card-title class="panel-card-header">
      <span class="panel-card-title">{{ props.panel.title }}</span>
      <v-spacer />
      <PanelDescription :description="props.panel.description" />
    </v-card-title>
    <v-alert v-if="props.error" type="error" variant="tonal" class="mx-4">
      {{ props.error }}
    </v-alert>
    <v-card-text>
      <div ref="chartEl" style="height: 180px" />
    </v-card-text>
  </v-card>
</template>
