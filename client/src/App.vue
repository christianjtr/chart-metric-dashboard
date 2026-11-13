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
const settingsTab = ref('pagespeed')
const settingsUrl = ref('')
const settingsApiKey = ref('')
const ingestUrl = ref('')
const ingestTokenInput = ref('')
const aboutDialog = ref(false)
const savingSettings = ref(false)

function openSettings() {
  settingsUrl.value = store.psiTargetUrl ?? ''
  settingsApiKey.value = store.psiApiKey ?? ''
  ingestTokenInput.value = store.ingestToken ?? ''
  ingestUrl.value = window.location.origin
  settingsDialog.value = true
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await store.savePsiTargetUrl(settingsUrl.value, settingsApiKey.value)
    await store.saveIngestToken(ingestTokenInput.value.trim() || undefined)
    store.pushToast('Settings saved')
    settingsDialog.value = false
  } finally {
    savingSettings.value = false
  }
}

function generateToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  ingestTokenInput.value = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const browserSnippet = computed(() => {
  const url = ingestUrl.value.trim().replace(/\/+$/, '')
  const token = ingestTokenInput.value.trim()
  return `<script async src="${url}/agent/vitalscope.js" data-url="${url}" data-app="web" data-token="${token}"><\/script>`
})

const nodeSnippet = computed(() => {
  const url = ingestUrl.value.trim().replace(/\/+$/, '')
  const token = ingestTokenInput.value.trim()
  return `import { initVitalscope } from '${url}/agent/vitalscope-node.js'

const vitalscope = initVitalscope({ url: '${url}', app: 'my-api', token: '${token}' })

vitalscope.metric('checkout_latency_ms', 132)`
})

async function copySnippet(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    store.pushToast('Snippet copied to the clipboard')
  } catch {
    store.pushToast('Could not copy the snippet')
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
    <v-app-bar flat border class="app-header">
      <svg class="brand-mark mr-3" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="vitalscopeBrand" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stop-color="#9489ff" />
            <stop offset="1" stop-color="#6a5ce8" />
          </linearGradient>
        </defs>
        <rect width="28" height="28" rx="7" fill="url(#vitalscopeBrand)" />
        <path
          d="M5.5 15.5h3.3l2.5-6.3 4.4 11 2.5-6.3h4.3"
          stroke="#ffffff"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
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
      <v-menu v-if="store.failedCount > 0" location="bottom" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-badge
            :content="store.failedCount"
            :model-value="true"
            color="error"
            bordered
            class="mr-3"
          >
            <v-btn v-bind="menuProps" variant="text" aria-label="Metric errors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 4 2.5 20.5h19L12 4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                <rect x="11" y="10.2" width="2" height="5" rx="1" fill="currentColor" />
                <circle cx="12" cy="17.6" r="1.3" fill="currentColor" />
              </svg>
            </v-btn>
          </v-badge>
        </template>
        <v-card max-width="420">
          <v-card-title class="errors-popover-title">
            {{ store.failedCount }} of {{ store.panels.length }} metrics failed to load
          </v-card-title>
          <v-card-text class="pt-0">
            <div v-for="group in store.errorGroups" :key="group.message" class="errors-group mb-3">
              <div class="errors-group-message">{{ group.message }}</div>
              <div class="errors-group-panels">
                <v-chip v-for="panel in group.panels" :key="panel" size="x-small" variant="tonal">
                  {{ panel }}
                </v-chip>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-menu>
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
            <v-row class="panel-grid">
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

    <v-dialog v-model="settingsDialog" max-width="640">
      <v-card title="Settings">
        <v-tabs v-model="settingsTab" color="primary">
          <v-tab value="pagespeed">PageSpeed</v-tab>
          <v-tab value="ingest">Ingest</v-tab>
        </v-tabs>
        <v-card-text>
          <v-window v-model="settingsTab">
            <v-window-item value="pagespeed">
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
            </v-window-item>
            <v-window-item value="ingest">
              <div class="d-flex align-center">
                <v-text-field
                  v-model="ingestUrl"
                  label="Vitalscope URL (used in the snippets)"
                  placeholder="http://localhost:3000"
                  hide-details
                  variant="outlined"
                  density="compact"
                />
              </div>
              <div class="d-flex align-center mt-3">
                <v-text-field
                  v-model="ingestTokenInput"
                  label="Ingest token"
                  placeholder="Generate a token to enable /ingest"
                  type="password"
                  hide-details
                  variant="outlined"
                  density="compact"
                  class="flex-grow-1"
                />
                <v-btn variant="text" class="ml-2" @click="generateToken">Generate</v-btn>
              </div>
              <div class="text-caption text-medium-emphasis mt-2">
                Any app can report metrics with <code>POST /ingest</code> using this token. Panels for
                new pushed metrics appear automatically under "Connected apps".
              </div>
              <template v-if="ingestTokenInput.trim().length >= 16">
                <div class="text-subtitle-2 mt-4 mb-1">Browser snippet (RUM)</div>
                <div class="snippet-box">
                  <code class="snippet-code">{{ browserSnippet }}</code>
                  <v-btn icon size="x-small" variant="text" aria-label="Copy browser snippet" @click="copySnippet(browserSnippet)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2" />
                      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="2" />
                    </svg>
                  </v-btn>
                </div>
                <div class="text-subtitle-2 mt-3 mb-1">Node backend snippet</div>
                <div class="snippet-box">
                  <code class="snippet-code">{{ nodeSnippet }}</code>
                  <v-btn icon size="x-small" variant="text" aria-label="Copy Node snippet" @click="copySnippet(nodeSnippet)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2" />
                      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="2" />
                    </svg>
                  </v-btn>
                </div>
              </template>
            </v-window-item>
          </v-window>
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
.app-header {
  background-image: linear-gradient(180deg, #2a2a42 0%, #1f1f30 100%);
  border-bottom-color: rgba(122, 111, 240, 0.28) !important;
}

.brand-mark {
  margin-left: 4px;
  border-radius: 7px;
  box-shadow: 0 0 14px rgba(122, 111, 240, 0.45);
}

.app-title {
  font-weight: 700;
  letter-spacing: 0.02em;
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

.panel-grid {
  row-gap: 16px;
}

.errors-popover-title {
  font-size: 0.9rem;
  font-weight: 600;
}

.errors-group-message {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-error));
}

.errors-group-panels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.section-errors-list {
  margin: 4px 0 0;
  padding-left: 18px;
}

.snippet-box {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  background: rgba(var(--v-theme-surface-variant), 0.35);
  border-radius: 8px;
  padding: 8px 4px 8px 12px;
}

.snippet-code {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.72rem;
}
</style>
