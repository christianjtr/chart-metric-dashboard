<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { GaugeChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'
import { formatValue } from '../utils/format'
import { colorFor, gaugeColorStops } from '../utils/thresholds'
import PanelDescription from './PanelDescription.vue'

echarts.use([GaugeChart, CanvasRenderer])

const props = defineProps<{
  panel: Panel
  data?: NamedSeries[]
  loading?: boolean
  error?: string
}>()

const chartEl = ref<HTMLDivElement>()
let chart: echarts.ECharts | undefined
let observer: ResizeObserver | undefined

const min = computed(() => props.panel.min ?? 0)
const max = computed(() => props.panel.max ?? 100)
const hasData = computed(() => (props.data?.[0]?.points.length ?? 0) > 0)
const current = computed(() => props.data?.[0]?.points.at(-1)?.y ?? min.value)

const buildOption = (): EChartsOption => ({
  backgroundColor: 'transparent',
  series: [
    {
      type: 'gauge',
      min: min.value,
      max: max.value,
      radius: '95%',
      center: ['50%', '62%'],
      startAngle: 210,
      endAngle: -30,
      axisLine: {
        lineStyle: {
          width: 14,
          color: gaugeColorStops(props.panel.thresholds, min.value, max.value)
        }
      },
      pointer: { itemStyle: { color: '#9aa0a6' } },
      axisTick: { distance: -14, length: 4, lineStyle: { color: '#585f6d' } },
      splitLine: { distance: -14, length: 14, lineStyle: { color: '#585f6d' } },
      axisLabel: { distance: 20, color: '#9aa0a6', fontSize: 10 },
      detail: {
        valueAnimation: true,
        fontSize: 28,
        color: colorFor(current.value, props.panel.thresholds),
        formatter: (v: number) =>
          formatValue(v, { unit: props.panel.unit, decimals: props.panel.decimals })
      },
      data: [{ value: current.value }]
    }
  ]
})

const render = () => {
  if (!hasData.value) return
  if (!chart && chartEl.value) {
    chart = echarts.init(chartEl.value)
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(chartEl.value)
  }
  chart?.setOption(buildOption(), { notMerge: true })
}

onMounted(render)
watch([current, hasData], render, { flush: 'post' })

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
      <div v-if="hasData" ref="chartEl" style="height: 320px" />
      <div v-else class="text-h4 text-medium-emphasis text-center" style="line-height: 320px">
        &mdash;
      </div>
    </v-card-text>
  </v-card>
</template>
