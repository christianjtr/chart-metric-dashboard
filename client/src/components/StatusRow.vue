<script setup lang="ts">
import { computed } from 'vue'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'
import PanelError from './PanelError.vue'
import PanelDescription from './PanelDescription.vue'

const props = defineProps<{
  panel: Panel
  data?: NamedSeries[]
  loading?: boolean
  error?: string
  sample?: boolean
}>()

const points = computed(() => props.data?.[0]?.points ?? [])

const colorFor = (value: number): string => {
  if (value >= 99) return '#4fac6e'
  if (value >= 95) return '#e0a12f'
  return '#e5544b'
}

const uptime = computed(() => {
  if (points.value.length === 0) return undefined
  const sum = points.value.reduce((acc, p) => acc + p.y, 0)
  return sum / points.value.length
})

const uptimeLabel = computed(() =>
  uptime.value === undefined ? '—' : `${uptime.value.toFixed(uptime.value >= 99 ? 2 : 1)}%`
)

const statusColor = computed(() => (uptime.value === undefined ? undefined : colorFor(uptime.value)))
</script>

<template>
  <v-card class="panel-card fill-height">
    <v-progress-linear :active="props.loading" color="primary" indeterminate />
    <v-card-title class="panel-card-header">
      <span class="panel-card-title">{{ props.panel.title }}</span>
      <v-chip v-if="props.sample" size="x-small" color="info" variant="tonal" class="ml-2">Sample</v-chip>
      <v-spacer />
      <PanelError :error="props.error" />
      <PanelDescription :description="props.panel.description" />
    </v-card-title>
    <div v-if="props.error" class="panel-unavailable mx-4">
      <span>—</span>
    </div>
    <v-card-text v-else class="statusrow-text">
      <div class="statusrow-strip" role="img" :aria-label="`${props.panel.title} uptime ${uptimeLabel}`">
        <div
          v-for="(point, index) in points"
          :key="index"
          class="statusrow-segment"
          :style="{ background: colorFor(point.y) }"
          :title="`${new Date(point.x).toLocaleTimeString()} — ${point.y.toFixed(1)}%`"
        />
        <div v-if="points.length === 0" class="statusrow-empty">No probe data yet</div>
      </div>
      <div class="statusrow-footer">
        <span class="statusrow-uptime" :style="{ color: statusColor }">{{ uptimeLabel }}</span>
        <span class="statusrow-caption">uptime</span>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.statusrow-text {
  padding-top: 10px;
}

.statusrow-strip {
  display: flex;
  gap: 2px;
  height: 22px;
  align-items: stretch;
}

.statusrow-segment {
  flex: 1 1 0;
  min-width: 2px;
  border-radius: 2px;
}

.statusrow-empty {
  align-self: center;
  width: 100%;
  text-align: center;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.statusrow-footer {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 8px;
}

.statusrow-uptime {
  font-size: 1.1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.statusrow-caption {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
</style>
