<script setup lang="ts">
import { computed } from 'vue'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'
import { formatValue } from '../utils/format'
import PanelDescription from './PanelDescription.vue'

const props = defineProps<{
  panel: Panel
  data?: NamedSeries[]
  loading?: boolean
  error?: string
  sample?: boolean
}>()

const MAX_ROWS = 10

const rows = computed(() =>
  (props.data ?? [])
    .map((s) => ({ name: s.name, value: s.points.at(-1)?.y }))
    .sort((a, b) => {
      const av = a.value ?? Number.NEGATIVE_INFINITY
      const bv = b.value ?? Number.NEGATIVE_INFINITY
      return bv - av
    })
)

const visibleRows = computed(() => rows.value.slice(0, MAX_ROWS))
const overflow = computed(() => Math.max(0, rows.value.length - MAX_ROWS))

const display = (value?: number) =>
  value === undefined
    ? '—'
    : formatValue(value, { unit: props.panel.unit, decimals: props.panel.decimals })
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
      <span>{{ props.error }}</span>
    </div>
    <v-card-text v-else>
      <v-table density="compact" class="panel-table">
        <tbody>
          <tr v-for="row in visibleRows" :key="row.name">
            <td class="panel-table-name" :title="row.name">{{ row.name }}</td>
            <td class="panel-table-value">{{ display(row.value) }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="2" class="panel-table-empty">&mdash;</td>
          </tr>
        </tbody>
        <tfoot v-if="overflow > 0">
          <tr>
            <td colspan="2" class="panel-table-more">+{{ overflow }} more audits</td>
          </tr>
        </tfoot>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.panel-table-name {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
}

.panel-table-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
}

.panel-table-more {
  text-align: right;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.panel-table-empty {
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
