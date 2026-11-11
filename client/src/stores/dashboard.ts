import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { trpc } from '../api/trpc'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'

export interface PanelState {
  series?: NamedSeries[]
  error?: string
  loading: boolean
}

export type TimeRange = 'all' | '1h' | '2h'

const RANGE_MS: Record<Exclude<TimeRange, 'all'>, number> = {
  '1h': 3_600_000,
  '2h': 7_200_000
}

export const useDashboardStore = defineStore('dashboard', () => {
  const panels = ref<Panel[]>([])
  const panelState = ref<Record<number, PanelState>>({})
  const configError = ref<string>()
  const timeRange = ref<TimeRange>('all')
  const globalRefresh = ref<number | undefined>(undefined)
  const psiTargetUrl = ref<string | undefined>(undefined)
  const timers = new Map<number, ReturnType<typeof setInterval>>()

  const from = computed(() =>
    timeRange.value === 'all' ? undefined : Date.now() - RANGE_MS[timeRange.value]
  )

  const sections = computed(() => {
    const groups: Array<{ name?: string; indices: number[] }> = []
    panels.value.forEach((panel, index) => {
      const last = groups[groups.length - 1]
      if (last?.name === panel.section) {
        last.indices.push(index)
      } else {
        groups.push({ name: panel.section, indices: [index] })
      }
    })
    return groups
  })

  const ensureState = (index: number): PanelState => {
    panelState.value[index] ??= { loading: false }
    return panelState.value[index]
  }

  async function loadConfig() {
    try {
      configError.value = undefined
      const config = await trpc.dashboard.config.query()
      panels.value = config.panels
      await Promise.all(config.panels.map((_, index) => fetchPanel(index)))
      startPolling()
    } catch (e) {
      configError.value = e instanceof Error ? e.message : 'Failed to load dashboard config'
    }
  }

  async function fetchPanel(index: number) {
    const panel = panels.value[index]
    if (!panel) return

    const state = ensureState(index)
    state.loading = true

    try {
      const response = await trpc.sources.series.query({
        source: panel.source,
        metric: panel.metric,
        granularity: panel.granularity,
        groupBy: panel.groupBy,
        reduce: panel.reduce,
        from: from.value
      })
      state.series = response.series
      state.error = undefined
    } catch (e) {
      state.error = e instanceof Error ? e.message : 'Failed to fetch series'
    } finally {
      state.loading = false
    }
  }

  async function refetchAll() {
    await Promise.all(panels.value.map((_, index) => fetchPanel(index)))
  }

  function startPolling() {
    stopPolling()
    panels.value.forEach((panel, index) => {
      const seconds = globalRefresh.value ?? panel.refresh
      timers.set(index, setInterval(() => void fetchPanel(index), seconds * 1000))
    })
  }

  function setGlobalRefresh(seconds?: number) {
    globalRefresh.value = seconds
    startPolling()
  }

  function setTimeRange(range: TimeRange) {
    timeRange.value = range
    void refetchAll()
  }

  function stopPolling() {
    for (const timer of timers.values()) clearInterval(timer)
    timers.clear()
  }

  async function loadSettings() {
    try {
      const settings = await trpc.dashboard.settings.query()
      psiTargetUrl.value = settings.psiTargetUrl
    } catch {
      psiTargetUrl.value = undefined
    }
  }

  async function savePsiTargetUrl(url: string) {
    const value = url.trim() || undefined
    psiTargetUrl.value = value
    await trpc.dashboard.setSettings.mutate({ psiTargetUrl: value })
    await refetchAll()
  }

  return {
    panels,
    panelState,
    configError,
    timeRange,
    globalRefresh,
    psiTargetUrl,
    sections,
    loadConfig,
    fetchPanel,
    refetchAll,
    startPolling,
    setGlobalRefresh,
    setTimeRange,
    stopPolling,
    loadSettings,
    savePsiTargetUrl
  }
})
