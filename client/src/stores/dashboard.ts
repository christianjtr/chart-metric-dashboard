import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { trpc } from '../api/trpc'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'
import { friendlyError } from '../utils/errors'

export interface PanelState {
  series?: NamedSeries[]
  error?: string
  loading: boolean
  sample?: boolean
}

export type TimeRange = 'all' | '1h' | '2h'

export type StatusLevel = 'ok' | 'degraded' | 'outage' | 'unknown'

const RANGE_MS: Record<Exclude<TimeRange, 'all'>, number> = {
  '1h': 3_600_000,
  '2h': 7_200_000
}

const TOAST_TTL_MS = 30_000

export const useDashboardStore = defineStore('dashboard', () => {
  const panels = ref<Panel[]>([])
  const sectionDescriptions = ref<Record<string, string>>({})
  const panelState = ref<Record<number, PanelState>>({})
  const configError = ref<string>()
  const timeRange = ref<TimeRange>('all')
  const globalRefresh = ref<number | undefined>(undefined)
  const psiTargetUrl = ref<string | undefined>(undefined)
  const psiApiKey = ref<string | undefined>(undefined)
  const toast = ref<string>()
  const sampleBannerDismissed = ref(localStorage.getItem('vitalscope.sampleBannerDismissed') === '1')
  const timers = new Map<number, ReturnType<typeof setInterval>>()
  const recentToasts = new Map<string, number>()

  const from = computed(() =>
    timeRange.value === 'all' ? undefined : Date.now() - RANGE_MS[timeRange.value]
  )

  const sections = computed(() => {
    const groups: Array<{ name?: string; description?: string; indices: number[] }> = []
    panels.value.forEach((panel, index) => {
      const last = groups[groups.length - 1]
      if (last?.name === panel.section) {
        last.indices.push(index)
      } else {
        groups.push({
          name: panel.section,
          description: panel.section ? sectionDescriptions.value[panel.section] : undefined,
          indices: [index]
        })
      }
    })
    return groups
  })

  const hasSampleData = computed(() => Object.values(panelState.value).some((s) => s.sample))
  const showSampleBanner = computed(() => hasSampleData.value && !sampleBannerDismissed.value)

  const failedPanels = computed(() =>
    panels.value
      .map((panel, index) => ({ title: panel.title, message: panelState.value[index]?.error }))
      .filter((item): item is { title: string; message: string } => item.message !== undefined)
  )

  const failedCount = computed(() => failedPanels.value.length)

  const errorGroups = computed(() => {
    const groups: Array<{ message: string; panels: string[] }> = []
    for (const { title, message } of failedPanels.value) {
      const group = groups.find((g) => g.message === message)
      if (group) group.panels.push(title)
      else groups.push({ message, panels: [title] })
    }
    return groups
  })

  const statusOverall = computed<StatusLevel>(() => {
    const strips = panels.value
      .map((panel, index) => ({ panel, state: panelState.value[index] }))
      .filter(({ panel }) => panel.chart === 'statusbar')
    if (!strips.length) return 'unknown'
    let worst = 100
    let anyError = false
    for (const { state } of strips) {
      if (state?.error) anyError = true
      const points = state?.series?.[0]?.points ?? []
      if (points.length === 0) return 'unknown'
      const window = points.slice(-10)
      const avg = window.reduce((sum, p) => sum + p.y, 0) / window.length
      worst = Math.min(worst, avg)
    }
    if (anyError && worst >= 95) return 'degraded'
    if (worst >= 99) return 'ok'
    if (worst >= 95) return 'degraded'
    return 'outage'
  })

  function pushToast(message: string) {
    const now = Date.now()
    const last = recentToasts.get(message)
    if (last && now - last < TOAST_TTL_MS) return
    recentToasts.set(message, now)
    if (recentToasts.size > 50) {
      for (const [key, at] of recentToasts) if (now - at > TOAST_TTL_MS) recentToasts.delete(key)
    }
    toast.value = message
  }

  function dismissSampleBanner() {
    sampleBannerDismissed.value = true
    localStorage.setItem('vitalscope.sampleBannerDismissed', '1')
  }

  const ensureState = (index: number): PanelState => {
    panelState.value[index] ??= { loading: false }
    return panelState.value[index]
  }

  async function loadConfig() {
    try {
      configError.value = undefined
      const config = await trpc.dashboard.config.query()
      panels.value = config.panels
      sectionDescriptions.value = Object.fromEntries(
        (config.sections ?? []).map((section) => [section.name, section.description])
      )
      await Promise.all(config.panels.map((_, index) => fetchPanel(index)))
      startPolling()
    } catch (e) {
      const message = friendlyError(e instanceof Error ? e.message : String(e))
      console.warn('[vitalscope] config load failed', e)
      pushToast(message)
      configError.value = message
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
      state.sample = response.sample ?? false
      state.error = undefined
    } catch (e) {
      const message = friendlyError(e instanceof Error ? e.message : String(e))
      console.warn(`[vitalscope] panel "${panel.title}" failed:`, e)
      state.error = message
      pushToast(message)
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
      psiApiKey.value = settings.PAGESPEED_API_KEY
    } catch {
      psiTargetUrl.value = undefined
      psiApiKey.value = undefined
    }
  }

  async function savePsiTargetUrl(url: string, apiKey?: string) {
    const value = url.trim() || undefined
    const key = apiKey?.trim() || undefined
    psiTargetUrl.value = value
    psiApiKey.value = key
    await trpc.dashboard.setSettings.mutate({ psiTargetUrl: value, PAGESPEED_API_KEY: key })
    await refetchAll()
  }

  return {
    panels,
    panelState,
    configError,
    timeRange,
    globalRefresh,
    psiTargetUrl,
    psiApiKey,
    toast,
    pushToast,
    sections,
    hasSampleData,
    showSampleBanner,
    dismissSampleBanner,
    statusOverall,
    failedCount,
    errorGroups,
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
