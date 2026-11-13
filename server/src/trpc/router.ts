import path from 'node:path'
import { initTRPC, TRPCError } from '@trpc/server'
import { loadConfig } from '../config/loadConfig.js'
import { autoPanelsFor, CONNECTED_APPS_SECTION, PUSHED_SOURCE, PUSHED_SOURCE_ID } from '../config/autoPanels.js'
import { resolveRootFile } from '../config/paths.js'
import { DashboardSettingsSchema, loadSettings, saveSettings } from '../config/settings.js'
import { SeriesQuerySchema, SeriesResponseSchema } from '../schemas/series.js'
import { createAdapter } from '../sources/SourceAdapter.js'
import { metricsCollector } from '../metrics/collector.js'

const t = initTRPC.create()

const CONFIG_PATH = resolveRootFile('DASHBOARD_CONFIG', 'dashboard.config.json')
const CONFIG_DIR = path.dirname(CONFIG_PATH)

const timed = t.middleware(async ({ path, next }) => {
  const start = Date.now()
  try {
    return await next()
  } finally {
    const duration = Date.now() - start
    metricsCollector.observeRequest(path, true, duration)
    metricsCollector.observeProbe('gateway', true, duration)
  }
})

const publicProcedure = t.procedure.use(timed)

const getSource = (sourceId: string) => {
  const config = loadConfig(CONFIG_PATH)
  const source =
    sourceId === PUSHED_SOURCE_ID
      ? PUSHED_SOURCE
      : config.sources.find((s) => s.id === sourceId)
  if (!source) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Unknown source: ${sourceId}` })
  }
  return source
}

export const appRouter = t.router({
  health: publicProcedure.query(() => ({ ok: true })),
  dashboard: t.router({
    config: publicProcedure.query(() => {
      const config = loadConfig(CONFIG_PATH)
      const auto = autoPanelsFor(config.panels)
      const sections = [...(config.sections ?? [])]
      if (auto.length > 0 && !sections.some((s) => s.name === CONNECTED_APPS_SECTION)) {
        sections.push({
          name: CONNECTED_APPS_SECTION,
          description:
            'Panels auto-created from metrics reported by connected apps through the ingest endpoint. Declare a panel in dashboard.config.json to customize or pin it.'
        })
      }
      return { sections, panels: [...config.panels, ...auto] }
    }),
    settings: publicProcedure.query(() => loadSettings()),
    setSettings: publicProcedure.input(DashboardSettingsSchema).mutation(({ input }) => saveSettings(input))
  }),
  sources: t.router({
    list: publicProcedure.query(() => {
      const config = loadConfig(CONFIG_PATH)
      return config.sources.map(({ id, label, adapter }) => ({ id, label, adapter }))
    }),
    series: publicProcedure
      .input(SeriesQuerySchema)
      .output(SeriesResponseSchema)
      .query(async ({ input }) => {
        const adapter = createAdapter(getSource(input.source), { collector: metricsCollector, baseDir: CONFIG_DIR })
        const start = Date.now()
        try {
          const response = await adapter.getSeries(input)
          metricsCollector.observeProbe(input.source, true, Date.now() - start)
          return response
        } catch (error) {
          metricsCollector.observeProbe(input.source, false, Date.now() - start)
          throw error
        }
      })
  })
})

export type AppRouter = typeof appRouter
