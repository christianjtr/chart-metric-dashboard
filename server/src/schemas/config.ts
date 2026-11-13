import { z } from 'zod'

const MappingSchema = z.object({
  date: z.string().min(1),
  value: z.string().optional(),
  series: z.string().optional(),
  dateFormat: z.string().optional(),
  scale: z.number().optional()
})

export const NdjsonSourceSchema = z.object({
  adapter: z.literal('ndjson'),
  id: z.string().min(1),
  label: z.string().min(1),
  path: z.string().min(1),
  mapping: MappingSchema
})

export const RestSourceSchema = z.object({
  adapter: z.literal('rest'),
  id: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
  refresh: z.number().int().positive().optional(),
  headers: z.record(z.string()).optional(),
  params: z.record(z.string()).optional(),
  cacheTtl: z.number().int().positive().optional(),
  mapping: MappingSchema
})

export const InternalSourceSchema = z.object({
  adapter: z.literal('internal'),
  id: z.string().min(1),
  label: z.string().min(1)
})

export const SourceSchema = z.discriminatedUnion('adapter', [
  NdjsonSourceSchema,
  RestSourceSchema,
  InternalSourceSchema
])

export type Source = z.infer<typeof SourceSchema>

export const ChartTypeSchema = z.enum(['area-step', 'bar', 'line', 'stat', 'sparkstat', 'table', 'statusbar'])
export type ChartType = z.infer<typeof ChartTypeSchema>

export const GranularitySchema = z.enum(['minute', 'hour', 'day', 'week', 'month', 'year'])
export type Granularity = z.infer<typeof GranularitySchema>

export const ReduceSchema = z.enum(['sum', 'avg', 'last', 'min', 'max'])
export type Reduce = z.infer<typeof ReduceSchema>

const ThresholdSchema = z.object({
  color: z.string().min(1),
  value: z.number()
})

export const ReferenceSchema = z.object({
  healthy: z.string().min(1),
  source: z.string().min(1),
  url: z.string().url().optional()
})

export type PanelReference = z.infer<typeof ReferenceSchema>

export const TableReferenceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().optional(),
  healthy: z.string().min(1),
  good: z.number(),
  poor: z.number(),
  source: z.string().min(1),
  url: z.string().url().optional()
})

export type TableReference = z.infer<typeof TableReferenceSchema>

export const PanelSchema = z.object({
  title: z.string().min(1),
  description: z.string().max(400).optional(),
  lowerIsBetter: z.boolean().optional(),
  reference: ReferenceSchema.optional(),
  references: z.array(TableReferenceSchema).max(12).optional(),
  source: z.string().min(1),
  metric: z.string().min(1).default('count'),
  chart: ChartTypeSchema,
  granularity: GranularitySchema.default('day'),
  groupBy: z.string().optional(),
  refresh: z.number().int().positive().default(60),
  unit: z.string().optional(),
  decimals: z.number().int().min(0).max(4).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  thresholds: z.array(ThresholdSchema).max(4).optional(),
  span: z.number().int().min(1).max(12).default(6),
  section: z.string().optional(),
  reduce: ReduceSchema.default('sum')
})

export type Panel = z.infer<typeof PanelSchema>

export const SectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1)
})

export type Section = z.infer<typeof SectionSchema>

export const DashboardConfigSchema = z.object({
  sections: z.array(SectionSchema).optional(),
  sources: z.array(SourceSchema).min(1),
  panels: z.array(PanelSchema).min(1)
})

export type DashboardConfig = z.infer<typeof DashboardConfigSchema>
