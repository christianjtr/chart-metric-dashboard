import { initTRPC, TRPCError } from '@trpc/server'
import { loadConfig } from '../config/loadConfig'
import { SeriesQuerySchema, SeriesResponseSchema } from '../schemas/series'

const t = initTRPC.create()

const CONFIG_PATH = process.env.DASHBOARD_CONFIG ?? 'dashboard.config.json'

export const appRouter = t.router({
  health: t.procedure.query(() => ({ ok: true })),
  sources: t.router({
    list: t.procedure.query(() => {
      const config = loadConfig(CONFIG_PATH)
      return config.sources.map(({ id, label, adapter }) => ({ id, label, adapter }))
    }),
    series: t.procedure
      .input(SeriesQuerySchema)
      .output(SeriesResponseSchema)
      .query(async ({ input }) => {
        const config = loadConfig(CONFIG_PATH)
        const source = config.sources.find((s) => s.id === input.source)
        if (!source) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Unknown source: ${input.source}` })
        }
        throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Adapters arrive in feat/02' })
      })
  })
})

export type AppRouter = typeof appRouter
