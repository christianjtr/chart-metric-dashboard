<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'
import { formatValue } from '../utils/format'
import { colorFor } from '../utils/thresholds'
import { deltaInfo } from '../utils/delta'
import PanelDescription from './PanelDescription.vue'
import PanelReference from './PanelReference.vue'
import DeltaChip from './DeltaChip.vue'

echarts.use([LineChart, CanvasRenderer])

const props = defineProps<{
  panel: Panel
  data?: NamedSeries[]
  loading?: boolean
  error?: string
  sample?: boolean
}>()

const chartEl = ref<HTMLDivElement>()
let chart: echarts.ECharts | undefined
let observer: ResizeObserver | undefined

const series = computed(() => props.data?.[0])
const points = computed(() => series.value?.points ?? [])
const hasData = computed(() => points.value.length > 0)
const current = computed(() => series.value?.points.at(-1)?.y)

const display = computed(() =>
  current.value === undefined
    ? '—'
    : formatValue(current.value, { unit: props.panel.unit, decimals: props.panel.decimals })
)

const color = computed(() =>
  current.value === undefined ? undefined : colorFor(current.value, props.panel.thresholds)
)

const delta = computed(() => {
  if (!series.value) return undefined
  return deltaInfo(series.value.points, {
    unit: props.panel.unit,
    title: props.panel.title,
    lowerIsBetter: props.panel.lowerIsBetter
  })
})

const withAlpha = (hex: string, alpha: number): string => {
  const raw = hex.replace('#', '')
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const buildOption = (): EChartsOption => ({
  backgroundColor: 'transparent',
  grid: { left: 0, right: 0, top: 4, bottom: 0 },
  xAxis: { type: 'time', show: false },
  yAxis: { type: 'value', show: false },
  series: [
    {
      type: 'line',
      symbol: 'none',
      lineStyle: { width: 1.5, color: color.value },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: withAlpha(color.value ?? '', 0.18) },
          { offset: 1, color: withAlpha(color.value ?? '', 0) }
        ])
      },
      data: points.value.map((p) => [p.x, p.y])
    }
  ]
})

const render = () => {
  if (!hasData.value || !chartEl.value) return
  if (!chart) {
    chart = echarts.init(chartEl.value)
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(chartEl.value)
  }
  chart.setOption(buildOption(), { notMerge: true })
}

onMounted(render)
watch([points, hasData], render, { flush: 'post' })

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
      <v-chip v-if="props.sample" size="x-small" color="info" variant="tonal" class="ml-2">Sample</v-chip>
      <v-spacer />
      <PanelDescription :description="props.panel.description" />
    </v-card-title>
    <div v-if="props.error" class="panel-unavailable mx-4">
      <span>Unavailable</span>
    </div>
    <v-card-text v-else class="panel-card-text">
      <span class="sparkstat-value" :style="{ color }">{{ display }}</span>
      <DeltaChip v-if="delta" :delta="delta" class="mt-2" />
      <PanelReference :reference="props.panel.reference" />
      <div v-if="hasData" ref="chartEl" class="sparkstat-spark" />
    </v-card-text>
  </v-card>
</template>

<style scoped>
.sparkstat-value {
  font-size: 2.2rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.sparkstat-spark {
  width: 100%;
  height: 56px;
}
</style>
