<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useDashboardStore, type PanelState } from './stores/dashboard'
import type { Panel } from '@server/schemas/config'
import PanelChart from './components/PanelChart.vue'

const store = useDashboardStore()

const panels = computed<Panel[]>(() => store.panels)
const stateAt = (index: number): PanelState | undefined => store.panelState[index]

onMounted(() => void store.loadConfig())
onBeforeUnmount(() => store.stopPolling())
</script>

<template>
  <v-app>
    <v-app-bar color="primary" title="Chart Dashboard" />

    <v-main>
      <v-container fluid>
        <v-alert v-if="store.configError" type="error" variant="tonal" class="mt-4">
          {{ store.configError }}
        </v-alert>

        <v-row v-else>
          <v-col v-for="(panel, index) in panels" :key="index" cols="12" md="6">
            <PanelChart
              :panel="panel"
              :data="stateAt(index)?.series"
              :loading="stateAt(index)?.loading"
              :error="stateAt(index)?.error"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>
