<script setup lang="ts">
import { computed } from 'vue'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'
import { formatValue } from '../utils/format'
import { colorFor } from '../utils/thresholds'
import { deltaInfo } from '../utils/delta'
import PanelDescription from './PanelDescription.vue'
import DeltaChip from './DeltaChip.vue'

const props = defineProps<{
  panel: Panel
  data?: NamedSeries[]
  loading?: boolean
  error?: string
}>()

const current = computed(() => props.data?.[0]?.points.at(-1)?.y)

const display = computed(() =>
  current.value === undefined
    ? '—'
    : formatValue(current.value, { unit: props.panel.unit, decimals: props.panel.decimals })
)

const color = computed(() =>
  current.value === undefined ? undefined : colorFor(current.value, props.panel.thresholds)
)

const delta = computed(() => {
  const points = props.data?.[0]?.points
  if (!points) return undefined
  return deltaInfo(points, {
    unit: props.panel.unit,
    title: props.panel.title,
    lowerIsBetter: props.panel.lowerIsBetter
  })
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
    <v-card-text class="panel-card-text">
      <span class="stat-value" :style="{ color }">{{ display }}</span>
      <DeltaChip v-if="delta" :delta="delta" class="mt-2" />
    </v-card-text>
  </v-card>
</template>

<style scoped>
.stat-value {
  font-size: 2.2rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
</style>
