import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createIngestHandler, type IngestDeps } from './ingest'
import { MetricsCollector, MAX_PUSHED_METRICS } from '../metrics/collector'

const fakeRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  }
  return res
}

const fakeReq = (overrides: { headers?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {}) =>
  ({ headers: overrides.headers ?? {}, query: overrides.query ?? {}, body: overrides.body }) as never

describe('ingest handler', () => {
  let collector: MetricsCollector
  let deps: IngestDeps

  beforeEach(() => {
    collector = new MetricsCollector({ autostart: false })
    deps = { collector, settings: () => ({ ingestToken: 's3cret-token-1234567890' }) }
  })

  it('rejects pushes with 403 when the token is missing or wrong', () => {
    const handler = createIngestHandler(deps)
    const res = fakeRes()
    handler(fakeReq({ headers: {} }), res as never)
    expect(res.status).toHaveBeenCalledWith(403)

    const res2 = fakeRes()
    handler(fakeReq({ headers: { authorization: 'Bearer wrong-token-1234567890' } }), res2 as never)
    expect(res2.status).toHaveBeenCalledWith(403)
  })

  it('responds 503 while no ingest token is configured', () => {
    const handler = createIngestHandler({ collector, settings: () => ({}) })
    const res = fakeRes()
    handler(fakeReq(), res as never)
    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('accepts metrics with the app prefix and stores them for querying', () => {
    const handler = createIngestHandler(deps)
    const res = fakeRes()
    handler(
      fakeReq({
        headers: { authorization: 'Bearer s3cret-token-1234567890' },
        body: { app: 'api', metrics: [{ name: 'checkout_latency_ms', value: 132 }, { name: 'queue_depth', value: 3 }] }
      }),
      res as never
    )
    expect(res.status).toHaveBeenCalledWith(202)
    expect(res.json).toHaveBeenCalledWith({ ok: true, accepted: 2, rejected: 0 })
    expect(collector.getMetric('api.checkout_latency_ms').at(-1)?.value).toBe(132)
    expect(collector.pushedMetricNames()).toContain('api.queue_depth')
  })

  it('accepts a token passed via query string', () => {
    const handler = createIngestHandler(deps)
    const res = fakeRes()
    handler(
      fakeReq({ query: { token: 's3cret-token-1234567890' }, body: { metrics: [{ name: 'hits', value: 1 }] } }),
      res as never
    )
    expect(res.status).toHaveBeenCalledWith(202)
  })

  it('rejects invalid payloads with 400', () => {
    const handler = createIngestHandler(deps)
    const res = fakeRes()
    handler(
      fakeReq({
        headers: { authorization: 'Bearer s3cret-token-1234567890' },
        body: { app: 'api', metrics: [{ name: 'bad name!', value: 1 }] }
      }),
      res as never
    )
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('caps the number of distinct pushed metrics', () => {
    const handler = createIngestHandler(deps)
    for (let i = 0; i < MAX_PUSHED_METRICS; i++) {
      handler(
        fakeReq({
          headers: { authorization: 'Bearer s3cret-token-1234567890' },
          body: { metrics: [{ name: `metric_${i}`, value: i }] }
        }),
        fakeRes() as never
      )
    }
    const res = fakeRes()
    handler(
      fakeReq({
        headers: { authorization: 'Bearer s3cret-token-1234567890' },
        body: { metrics: [{ name: 'over_cap', value: 1 }] }
      }),
      res as never
    )
    expect(res.json).toHaveBeenCalledWith({ ok: true, accepted: 0, rejected: 1 })
    expect(collector.pushedMetricNames()).not.toContain('over_cap')
  })
})
