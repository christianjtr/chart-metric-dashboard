import { initTRPC, TRPCError } from '@trpc/server'
import { loadConfig } from '../config/loadConfig'
import { DashboardSettingsSchema, loadSettings, saveSettings } from '../config/settings'
import { SeriesQuerySchema, SeriesResponseSchema } from '../schemas/series'
import { createAdapter } from '../sources/SourceAdapter'
import { metricsCollector } from '../metrics/collector'

const t = initTRPC.create()

const CONFIG_PATH = process.env.DASHBOARD_CONFIG ?? 'dashboard.config.json'

const timed = t.middleware(async ({ path, next }) => {
  const start = Date.now()
  try {
    return await next()
  } finally {
    metricsCollector.observeRequest(path, true, Date.now() - start)
  }
})

const publicProcedure = t.procedure.use(timed)

const getSource = (sourceId: string) => {
  const config = loadConfig(CONFIG_PATH)
  const source = config.sources.find((s) => s.id === sourceId)
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
      return { panels: config.panels }
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
        const adapter = createAdapter(getSource(input.source), { collector: metricsCollector })
        return adapter.getSeries(input)
      })
  })
})

export type AppRouter = typeof appRouter
