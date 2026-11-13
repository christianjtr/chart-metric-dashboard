<script setup lang="ts">
import { computed } from 'vue'
import type { Panel, TableReference } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'
import { formatValue } from '../utils/format'
import PanelError from './PanelError.vue'
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

const refRows = computed(() => {
  const refs = props.panel.references
  if (!refs?.length) return null
  const byName = new Map((props.data ?? []).map((s) => [s.name, s.points.at(-1)?.y]))
  return refs.map((ref) => ({ ref, value: byName.get(ref.id) }))
})

const display = (value?: number) =>
  value === undefined
    ? '—'
    : formatValue(value, { unit: props.panel.unit, decimals: props.panel.decimals })

const formatMetric = (value: number, unit?: string) => {
  if (unit === 'ms') {
    return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`
  }
  if (unit === 's') return `${value.toFixed(2)} s`
  return String(Math.round(value * 100) / 100)
}

const statusOf = (ref: TableReference, value?: number): 'good' | 'warn' | 'poor' | null => {
  if (value === undefined) return null
  if (value <= ref.good) return 'good'
  if (value <= ref.poor) return 'warn'
  return 'poor'
}
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
    <v-card-text v-else-if="refRows">
      <v-table density="compact" class="panel-table">
        <thead>
          <tr>
            <th class="panel-table-head">Metric</th>
            <th class="panel-table-head panel-table-head-right">Detected</th>
            <th class="panel-table-head panel-table-head-right d-none d-sm-table-cell">Recommended</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in refRows" :key="row.ref.id">
            <td class="panel-table-name">{{ row.ref.label }}</td>
            <td class="panel-table-value">
              <span v-if="row.value !== undefined" :class="`vitals-${statusOf(row.ref, row.value)}`">
                {{ formatMetric(row.value, row.ref.unit) }}
              </span>
              <span v-else>&mdash;</span>
            </td>
            <td class="panel-table-recommended d-none d-sm-table-cell">
              <span class="panel-table-healthy">{{ row.ref.healthy }}</span>
              <a
                v-if="row.ref.url"
                :href="row.ref.url"
                target="_blank"
                rel="noopener"
                class="panel-table-source"
              >
                {{ row.ref.source }}
              </a>
              <span v-else class="panel-table-source">{{ row.ref.source }}</span>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
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
.panel-table-head {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.panel-table-head-right {
  text-align: right;
}

.panel-table-name {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
}

.panel-table-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  font-weight: 600;
}

.panel-table-recommended {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  white-space: nowrap;
}

.panel-table-healthy {
  font-weight: 600;
}

.panel-table-source {
  color: rgba(var(--v-theme-on-surface), 0.55);
  text-decoration: none;
  margin-left: 6px;
  font-size: 0.7rem;
}

.panel-table-source:hover {
  text-decoration: underline;
}

.vitals-good {
  color: rgb(var(--v-theme-success));
}

.vitals-warn {
  color: rgb(var(--v-theme-warning));
}

.vitals-poor {
  color: rgb(var(--v-theme-error));
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
