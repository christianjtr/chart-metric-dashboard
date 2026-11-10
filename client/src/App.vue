<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useDashboardStore, type PanelState, type TimeRange } from './stores/dashboard'
import type { Panel } from '@server/schemas/config'
import PanelChart from './components/PanelChart.vue'
import StatPanel from './components/StatPanel.vue'
import GaugePanel from './components/GaugePanel.vue'

const store = useDashboardStore()

const panelAt = (index: number): Panel => store.panels[index]
const stateAt = (index: number): PanelState | undefined => store.panelState[index]

const TIME_RANGES: Array<{ label: string; value: TimeRange }> = [
  { label: 'All time', value: 'all' },
  { label: 'Last hour', value: '1h' },
  { label: 'Last 2 hours', value: '2h' }
]

const REFRESH_OPTIONS: Array<{ label: string; value?: number }> = [
  { label: 'Per panel', value: undefined },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 }
]

onMounted(() => void store.loadConfig())
onBeforeUnmount(() => store.stopPolling())
</script>

<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-title>Chart Dashboard</v-app-bar-title>
      <v-select
        :model-value="store.timeRange"
        :items="TIME_RANGES"
        item-title="label"
        item-value="value"
        label="Time range"
        hide-details
        density="compact"
        variant="outlined"
        max-width="160"
        class="mr-4"
        @update:model-value="store.setTimeRange($event as TimeRange)"
      />
      <v-select
        :model-value="store.globalRefresh"
        :items="REFRESH_OPTIONS"
        item-title="label"
        item-value="value"
        label="Refresh"
        hide-details
        density="compact"
        variant="outlined"
        max-width="140"
        class="mr-4"
        @update:model-value="store.setGlobalRefresh($event as number | undefined)"
      />
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <v-alert v-if="store.configError" type="error" variant="tonal" class="mt-4">
          {{ store.configError }}
        </v-alert>

        <template v-else>
          <template v-for="section in store.sections" :key="section.name ?? 'all'">
            <h2 v-if="section.name" class="text-h6 text-medium-emphasis mt-6 mb-2">
              {{ section.name }}
            </h2>
            <v-row dense>
              <v-col
                v-for="index in section.indices"
                :key="index"
                cols="12"
                :md="panelAt(index).span"
              >
                <StatPanel
                  v-if="panelAt(index).chart === 'stat'"
                  :panel="panelAt(index)"
                  :data="stateAt(index)?.series"
                  :loading="stateAt(index)?.loading"
                  :error="stateAt(index)?.error"
                />
                <GaugePanel
                  v-else-if="panelAt(index).chart === 'gauge'"
                  :panel="panelAt(index)"
                  :data="stateAt(index)?.series"
                  :loading="stateAt(index)?.loading"
                  :error="stateAt(index)?.error"
                />
                <PanelChart
                  v-else
                  :panel="panelAt(index)"
                  :data="stateAt(index)?.series"
                  :loading="stateAt(index)?.loading"
                  :error="stateAt(index)?.error"
                />
              </v-col>
            </v-row>
          </template>
        </template>
      </v-container>
    </v-main>
  </v-app>
</template>
