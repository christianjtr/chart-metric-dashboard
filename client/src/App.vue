<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDashboardStore, type PanelState, type StatusLevel, type TimeRange } from './stores/dashboard'
import type { Panel } from '@server/schemas/config'
import PanelChart from './components/PanelChart.vue'
import StatPanel from './components/StatPanel.vue'
import SparkStatPanel from './components/SparkStatPanel.vue'
import TablePanel from './components/TablePanel.vue'
import SectionPanel from './components/SectionPanel.vue'
import StatusRow from './components/StatusRow.vue'

const store = useDashboardStore()

const panelAt = (index: number): Panel => store.panels[index]
const stateAt = (index: number): PanelState | undefined => store.panelState[index]

const setRefresh = (value: string | number) => {
  store.setGlobalRefresh(value === 'panel' ? undefined : Number(value))
}

const STATUS_TEXT: Record<Exclude<StatusLevel, 'unknown'>, string> = {
  ok: 'All systems operational',
  degraded: 'Degraded performance',
  outage: 'Service outage'
}

const STATUS_COLOR = {
  ok: 'success',
  degraded: 'warning',
  outage: 'error'
} as const

const overall = computed(() => {
  const level = store.statusOverall
  if (level === 'unknown') return undefined
  return { level, text: STATUS_TEXT[level], color: STATUS_COLOR[level] }
})

const toastVisible = ref(false)
const toastText = computed(() => store.toast)
watch(
  () => store.toast,
  (message) => {
    if (message) toastVisible.value = true
  }
)

const settingsDialog = ref(false)
const settingsUrl = ref('')
const settingsApiKey = ref('')
const aboutDialog = ref(false)
const savingSettings = ref(false)

function openSettings() {
  settingsUrl.value = store.psiTargetUrl ?? ''
  settingsApiKey.value = store.psiApiKey ?? ''
  settingsDialog.value = true
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await store.savePsiTargetUrl(settingsUrl.value, settingsApiKey.value)
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
    <v-app-bar flat border>
      <v-app-bar-title class="app-title">Vitalscope</v-app-bar-title>
      <v-btn-toggle
        :model-value="store.timeRange"
        mandatory
        density="compact"
        variant="outlined"
        divided
        class="mr-3"
        @update:model-value="store.setTimeRange($event as TimeRange)"
      >
        <v-btn value="all" size="small">All</v-btn>
        <v-btn value="1h" size="small">1H</v-btn>
        <v-btn value="2h" size="small">2H</v-btn>
      </v-btn-toggle>
      <v-btn-toggle
        :model-value="store.globalRefresh ?? 'panel'"
        mandatory
        density="compact"
        variant="outlined"
        divided
        class="mr-3"
        @update:model-value="setRefresh($event as string | number)"
      >
        <v-btn value="panel" size="small">Panel</v-btn>
        <v-btn :value="10" size="small">10s</v-btn>
        <v-btn :value="30" size="small">30s</v-btn>
        <v-btn :value="60" size="small">60s</v-btn>
      </v-btn-toggle>
      <v-btn variant="text" aria-label="About Vitalscope" @click="aboutDialog = true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
          <rect x="11" y="10.5" width="2" height="6" rx="1" fill="currentColor" />
          <circle cx="12" cy="7.6" r="1.3" fill="currentColor" />
        </svg>
      </v-btn>
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
        <template v-if="store.configError">
          <div class="empty-state">
            <p class="empty-state-title">Vitalscope couldn't load its configuration</p>
            <p class="empty-state-text">{{ store.configError }}</p>
          </div>
        </template>

        <template v-else>
          <v-banner
            v-if="store.showSampleBanner"
            color="info"
            variant="tonal"
            class="sample-banner mt-4"
          >
            You're viewing sample data — connect your data source to see live metrics. Add your PageSpeed API key in&nbsp;<strong>Settings</strong>&nbsp;and data sources in&nbsp;<code>dashboard.config.json</code>.
            <template #actions>
              <v-btn variant="text" @click="store.dismissSampleBanner">Dismiss</v-btn>
            </template>
          </v-banner>

          <v-banner
            v-if="overall"
            :color="overall.color"
            variant="tonal"
            class="mt-4"
          >
            {{ overall.text }}
          </v-banner>

          <SectionPanel
            v-for="section in store.sections"
            :key="section.name ?? 'all'"
            :name="section.name"
            :description="section.description"
            class="mt-4"
          >
            <v-row density="compact">
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
                  :sample="stateAt(index)?.sample"
                />
                <SparkStatPanel
                  v-else-if="panelAt(index).chart === 'sparkstat'"
                  :panel="panelAt(index)"
                  :data="stateAt(index)?.series"
                  :loading="stateAt(index)?.loading"
                  :error="stateAt(index)?.error"
                  :sample="stateAt(index)?.sample"
                />
                <TablePanel
                  v-else-if="panelAt(index).chart === 'table'"
                  :panel="panelAt(index)"
                  :data="stateAt(index)?.series"
                  :loading="stateAt(index)?.loading"
                  :error="stateAt(index)?.error"
                  :sample="stateAt(index)?.sample"
                />
                <StatusRow
                  v-else-if="panelAt(index).chart === 'statusbar'"
                  :panel="panelAt(index)"
                  :data="stateAt(index)?.series"
                  :loading="stateAt(index)?.loading"
                  :error="stateAt(index)?.error"
                  :sample="stateAt(index)?.sample"
                />
                <PanelChart
                  v-else
                  :panel="panelAt(index)"
                  :data="stateAt(index)?.series"
                  :loading="stateAt(index)?.loading"
                  :error="stateAt(index)?.error"
                  :sample="stateAt(index)?.sample"
                />
              </v-col>
            </v-row>
          </SectionPanel>
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
          <v-text-field
            v-model="settingsApiKey"
            label="PageSpeed Insights API key"
            placeholder="PAGESPEED_API_KEY"
            type="password"
            hide-details
            variant="outlined"
            class="mt-3"
          />
          <div class="text-caption text-medium-emphasis mt-2">
            Used by the PSI panels. The key is applied immediately — panels switch from sample to
            live data without a restart.
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

    <v-dialog v-model="aboutDialog" max-width="480">
      <v-card title="Vitalscope">
        <v-card-text>
          <p class="mb-2">
            <strong>Vitalscope</strong> — Web Vitals &amp; Gateway Health
          </p>
          <p class="text-body-2 text-medium-emphasis">
            A config-driven dashboard for Core Web Vitals and gateway health. Panels, sections and
            data sources are defined in <code>dashboard.config.json</code>; uptime strips are
            built from in-gateway probes. When no API key is configured, panels fall back to
            clearly-marked sample data.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" text @click="aboutDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="toastVisible" :timeout="5000" color="error" location="bottom right">
      {{ toastText }}
    </v-snackbar>
  </v-app>
</template>

<style scoped>
.app-title {
  font-weight: 600;
}

.empty-state {
  margin-top: 48px;
  text-align: center;
}

.empty-state-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.empty-state-text {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
