import { defineStore } from 'pinia'
import { ref } from 'vue'
import { trpc } from '../api/trpc'
import type { Panel } from '@server/schemas/config'
import type { NamedSeries } from '@server/schemas/series'

interface PanelState {
  series?: NamedSeries[]
  error?: string
  loading: boolean
}

export type { PanelState }

export const useDashboardStore = defineStore('dashboard', () => {
  const panels = ref<Panel[]>([])
  const panelState = ref<Record<number, PanelState>>({})
  const configError = ref<string>()
  const timers = new Map<number, ReturnType<typeof setInterval>>()

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
        groupBy: panel.groupBy
      })
      state.series = response.series
      state.error = undefined
    } catch (e) {
      state.error = e instanceof Error ? e.message : 'Failed to fetch series'
    } finally {
      state.loading = false
    }
  }

  function startPolling() {
    stopPolling()
    panels.value.forEach((panel, index) => {
      timers.set(index, setInterval(() => void fetchPanel(index), panel.refresh * 1000))
    })
  }

  function stopPolling() {
    for (const timer of timers.values()) clearInterval(timer)
    timers.clear()
  }

  return { panels, panelState, configError, loadConfig, fetchPanel, startPolling, stopPolling }
})
