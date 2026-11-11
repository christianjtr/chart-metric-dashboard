<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
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

const settingsDialog = ref(false)
const settingsUrl = ref('')
const savingSettings = ref(false)

function openSettings() {
  settingsUrl.value = store.psiTargetUrl ?? ''
  settingsDialog.value = true
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await store.savePsiTargetUrl(settingsUrl.value)
    settingsDialog.value = false
  } finally {
    savingSettings.value = false
  }
}

onMounted(() => {
  void store.loadConfig()
  void store.loadSettings()
})
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
      <v-btn variant="text" aria-label="Settings" @click="openSettings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.93l-.37-2.65A.506.506 0 0 0 13 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.2-1.17.54-1.69.93l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.39 1.06.73 1.69.93l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.2 1.17-.54 1.69-.93l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"
          />
        </svg>
      </v-btn>
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

    <v-dialog v-model="settingsDialog" max-width="520">
      <v-card title="Settings">
        <v-card-text>
          <v-text-field
            v-model="settingsUrl"
            label="PageSpeed Insights target URL"
            placeholder="https://example.com"
            hide-details
            variant="outlined"
          />
          <div class="text-caption text-medium-emphasis mt-2">
            Used by the PSI panels. Requires PAGESPEED_API_KEY in the gateway environment.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="settingsDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingSettings"
            :disabled="settingsUrl.trim() !== '' && !/^https?:\/\//.test(settingsUrl.trim())"
            @click="saveSettings"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>
