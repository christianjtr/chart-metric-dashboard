<script setup lang="ts">
import { computed } from 'vue'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'
import { formatValue } from '../utils/format'
import { colorFor } from '../utils/thresholds'

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
</script>

<template>
  <v-card class="fill-height">
    <v-progress-linear :active="props.loading" color="primary" indeterminate />
    <v-card-title>{{ props.panel.title }}</v-card-title>
    <v-alert v-if="props.error" type="error" variant="tonal" class="mx-4">
      {{ props.error }}
    </v-alert>
    <v-card-text class="d-flex align-center justify-center" style="height: 320px">
      <span class="stat-value" :style="{ color }">{{ display }}</span>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.stat-value {
  font-size: 4rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
