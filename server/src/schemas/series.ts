import { z } from 'zod'
import { GranularitySchema, ReduceSchema } from './config.js'

export const SeriesPointSchema = z.object({
  x: z.number(),
  y: z.number()
})

export const NamedSeriesSchema = z.object({
  name: z.string(),
  points: z.array(SeriesPointSchema)
})

export const SeriesResponseSchema = z.object({
  sourceId: z.string(),
  metric: z.string(),
  granularity: GranularitySchema,
  sample: z.boolean().optional(),
  series: z.array(NamedSeriesSchema)
})

export type SeriesResponse = z.infer<typeof SeriesResponseSchema>
export type NamedSeries = z.infer<typeof NamedSeriesSchema>

export const SeriesQuerySchema = z.object({
  source: z.string().min(1),
  metric: z.string().min(1).default('count'),
  granularity: GranularitySchema.default('day'),
  from: z.number().optional(),
  to: z.number().optional(),
  groupBy: z.string().optional(),
  reduce: ReduceSchema.default('sum')
})

export type SeriesQuery = z.infer<typeof SeriesQuerySchema>
export type SeriesQueryInput = z.input<typeof SeriesQuerySchema>
