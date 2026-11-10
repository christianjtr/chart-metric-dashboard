import { initTRPC, TRPCError } from '@trpc/server'
import { loadConfig } from '../config/loadConfig'
import { SeriesQuerySchema, SeriesResponseSchema } from '../schemas/series'
import { createAdapter } from '../sources/SourceAdapter'

const t = initTRPC.create()

const CONFIG_PATH = process.env.DASHBOARD_CONFIG ?? 'dashboard.config.json'

const getSource = (sourceId: string) => {
  const config = loadConfig(CONFIG_PATH)
  const source = config.sources.find((s) => s.id === sourceId)
  if (!source) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Unknown source: ${sourceId}` })
  }
  return source
}

export const appRouter = t.router({
  health: t.procedure.query(() => ({ ok: true })),
  dashboard: t.router({
    config: t.procedure.query(() => {
      const config = loadConfig(CONFIG_PATH)
      return { panels: config.panels }
    })
  }),
  sources: t.router({
    list: t.procedure.query(() => {
      const config = loadConfig(CONFIG_PATH)
      return config.sources.map(({ id, label, adapter }) => ({ id, label, adapter }))
    }),
    series: t.procedure
      .input(SeriesQuerySchema)
      .output(SeriesResponseSchema)
      .query(async ({ input }) => {
        const adapter = createAdapter(getSource(input.source))
        return adapter.getSeries(input)
      })
  })
})

export type AppRouter = typeof appRouter
