import { z } from 'zod'

export const IngestMetricSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/, 'metric name must be alphanumeric with . _ : - separators'),
  value: z.number().finite(),
  t: z.number().int().nonnegative().optional()
})

export const IngestPayloadSchema = z.object({
  app: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
    .optional(),
  metrics: z.array(IngestMetricSchema).min(1).max(50)
})

export type IngestMetric = z.infer<typeof IngestMetricSchema>
export type IngestPayload = z.infer<typeof IngestPayloadSchema>
