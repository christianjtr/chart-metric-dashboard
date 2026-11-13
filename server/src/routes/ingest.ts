import crypto from 'node:crypto'
import express from 'express'
import { IngestPayloadSchema } from '../schemas/ingest.js'
import { loadSettings, type DashboardSettings } from '../config/settings.js'
import { metricsCollector, type MetricsCollector } from '../metrics/collector.js'

export interface IngestDeps {
  collector: MetricsCollector
  settings: () => DashboardSettings
}

const tokenMatches = (expected: string, presented: string): boolean => {
  if (expected.length !== presented.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(presented))
}

const presentedToken = (req: express.Request): string | undefined => {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length)
  if (typeof req.query.token === 'string' && req.query.token.length > 0) return req.query.token
  return undefined
}

export const createIngestHandler =
  ({ collector, settings }: IngestDeps) =>
  (req: express.Request, res: express.Response): void => {
    const token = settings().ingestToken
    if (!token) {
      res.status(503).json({ error: 'Ingest is disabled. Generate an ingest token in the dashboard Settings.' })
      return
    }
    const presented = presentedToken(req)
    if (!presented || !tokenMatches(token, presented)) {
      res.status(403).json({ error: 'Invalid or missing ingest token.' })
      return
    }
    const parsed = IngestPayloadSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid ingest payload.', issues: parsed.error.issues })
      return
    }
    const app = parsed.data.app ?? 'default'
    let accepted = 0
    for (const metric of parsed.data.metrics) {
      if (collector.observePushed(`${app}.${metric.name}`, metric.value, metric.t)) accepted++
    }
    res.status(202).json({
      ok: true,
      accepted,
      rejected: parsed.data.metrics.length - accepted
    })
  }

export const ingestRouter = (deps: IngestDeps = { collector: metricsCollector, settings: loadSettings }) => {
  const router = express.Router()
  router.post('/ingest', express.json({ limit: '16kb' }), createIngestHandler(deps))
  return router
}
