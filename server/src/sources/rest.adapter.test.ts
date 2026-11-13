import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { RestAdapter, clearFetchCache } from './rest.adapter'
import { metricsCollector, MetricsCollector } from '../metrics/collector'
import { InternalAdapter } from './internal.adapter'

vi.mock('../config/settings', () => ({
  loadSettings: vi.fn(() => ({ psiTargetUrl: 'https://site.example.com' }))
}))

const PAYLOAD = {
  items: [
    { createdAt: '2026-01-03T10:00:00Z', count: 2, kind: 'a' },
    { createdAt: '2026-01-09T10:00:00Z', count: 3, kind: 'a' },
    { createdAt: '2026-02-05T10:00:00Z', count: 1, kind: 'b' }
  ]
}

const fetcher = vi.fn(async (_url: string, _headers: Record<string, string>) => PAYLOAD)

const source = {
  adapter: 'rest' as const,
  id: 'ext',
  label: 'External',
  url: 'https://api.example.com/events',
  headers: { Authorization: 'token-123' },
  mapping: {
    date: 'items[].createdAt',
    value: 'items[].count',
    series: 'items[].kind'
  }
}

describe('RestAdapter', () => {
  it('fetches with configured headers and aggregates the mapped collection', async () => {
    const adapter = new RestAdapter(source, fetcher)
    const result = await adapter.getSeries({
      source: 'ext',
      metric: 'count',
      granularity: 'month',
      groupBy: 'kind'
    })

    expect(fetcher).toHaveBeenCalledWith('https://api.example.com/events', {
      Authorization: 'token-123'
    })
    expect(result.series).toEqual([
      { name: 'a', points: [{ x: Date.UTC(2026, 0, 1), y: 5 }] },
      { name: 'b', points: [{ x: Date.UTC(2026, 1, 1), y: 1 }] }
    ])
  })

  it('counts events when no value mapping is set', async () => {
    const adapter = new RestAdapter(
      { ...source, mapping: { date: 'items[].createdAt', series: 'items[].kind' } },
      fetcher
    )
    const result = await adapter.getSeries({
      source: 'ext',
      metric: 'count',
      granularity: 'month',
      groupBy: 'kind'
    })
    expect(result.series[0].points[0].y).toBe(2)
  })

  it('supports flat payloads without a collection', async () => {
    const adapter = new RestAdapter(
      {
        ...source,
        url: 'https://api.example.com/summary',
        mapping: { date: 'summary.date', value: 'summary.total' }
      },
      async () => ({ summary: { date: '2026-05-01T00:00:00Z', total: 9 } })
    )
    const result = await adapter.getSeries({
      source: 'ext',
      metric: 'count',
      granularity: 'day', reduce: 'sum'
    })
    expect(result.series).toEqual([{ name: 'total', points: [{ x: Date.UTC(2026, 4, 1), y: 9 }] }])
  })

  it('rejects mappings that mix collections', () => {
    const mixed = new RestAdapter(
      {
        ...source,
        mapping: { date: 'items[].createdAt', series: 'others[].kind' }
      },
      fetcher
    )
    return expect(
      mixed.getSeries({ source: 'ext', metric: 'count', granularity: 'day' })
    ).rejects.toThrow(/same collection/i)
  })

  describe('params', () => {
    beforeEach(() => clearFetchCache())

    it('appends plain, env and setting params to the URL', async () => {
      process.env.MY_TOKEN = 'tok-1'
      const adapter = new RestAdapter(
        {
          ...source,
          params: { url: 'setting:psiTargetUrl', key: 'env:MY_TOKEN', strategy: 'mobile' }
        },
        fetcher
      )
      await adapter.getSeries({ source: 'ext', metric: 'count', granularity: 'day' })
      const calledUrl = String(fetcher.mock.lastCall?.[0])
      expect(calledUrl).toContain('url=https%3A%2F%2Fsite.example.com')
      expect(calledUrl).toContain('key=tok-1')
      expect(calledUrl).toContain('strategy=mobile')
    })

    it('throws when a setting param is not configured', () => {
      const adapter = new RestAdapter(
        { ...source, params: { url: 'setting:missingKey' } },
        fetcher
      )
      return expect(
        adapter.getSeries({ source: 'ext', metric: 'count', granularity: 'day' })
      ).rejects.toThrow(/Unresolved parameter "url"/)
    })

    it('falls back to the env var when the setting key is not configured', async () => {
      process.env.PAGESPEED_API_KEY = 'env-key-1'
      try {
        const adapter = new RestAdapter(
          { ...source, params: { key: 'setting:PAGESPEED_API_KEY' } },
          fetcher
        )
        await adapter.getSeries({ source: 'ext', metric: 'count', granularity: 'day' })
        expect(String(fetcher.mock.lastCall?.[0])).toContain('key=env-key-1')
      } finally {
        delete process.env.PAGESPEED_API_KEY
      }
    })

    it('serves synthetic sample data for PSI sources without an API key', async () => {
      const psiFetcher = vi.fn(async () => ({}))
      const psi = new RestAdapter(
        {
          ...source,
          id: 'psi-vitals',
          url: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
          params: { key: 'setting:PAGESPEED_API_KEY' },
          mapping: { date: 'now', value: 'x' }
        },
        psiFetcher
      )
      const result = await psi.getSeries({
        source: 'psi-vitals',
        metric: 'largest-contentful-paint',
        granularity: 'hour',
        reduce: 'last'
      })
      expect(result.sample).toBe(true)
      expect(result.series[0].name).toBe('largest-contentful-paint')
      expect(result.series[0].points.length).toBeGreaterThan(0)
      expect(psiFetcher).not.toHaveBeenCalled()
    })

    it('serves synthetic field metrics (INP, LCP, CLS, FCP, TTFB) for CrUX panels without an API key', async () => {
      const psiFetcher = vi.fn(async () => ({}))
      const psi = new RestAdapter(
        {
          ...source,
          id: 'psi-field',
          url: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
          params: { key: 'setting:PAGESPEED_API_KEY' },
          mapping: { date: 'now', value: 'x' }
        },
        psiFetcher
      )
      const result = await psi.getSeries({
        source: 'psi-field',
        metric: 'field',
        granularity: 'hour',
        reduce: 'last'
      })
      expect(result.sample).toBe(true)
      expect(result.series.map((s) => s.name).sort()).toEqual(['CLS', 'FCP', 'INP', 'LCP', 'TTFB'])
      expect(result.series[0].points.length).toBeGreaterThan(0)
      expect(psiFetcher).not.toHaveBeenCalled()
    })

    it('serves a healthy synthetic uptime probe for statusbar panels without an API key', async () => {
      const psiFetcher = vi.fn(async () => ({}))
      const psi = new RestAdapter(
        {
          ...source,
          id: 'psi-vitals',
          url: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
          params: { key: 'setting:PAGESPEED_API_KEY' },
          mapping: { date: 'now', value: 'x' }
        },
        psiFetcher
      )
      const result = await psi.getSeries({
        source: 'psi-vitals',
        metric: 'probe:psi-vitals:uptime',
        granularity: 'minute',
        reduce: 'avg'
      })
      expect(result.sample).toBe(true)
      const points = result.series[0].points
      expect(points.length).toBe(120)
      const avg = points.reduce((sum, p) => sum + p.y, 0) / points.length
      expect(avg).toBeGreaterThan(95)
      expect(psiFetcher).not.toHaveBeenCalled()
    })
  })

  describe('cacheTtl', () => {
    beforeEach(() => {
      clearFetchCache()
      vi.useFakeTimers()
    })
    afterEach(() => vi.useRealTimers())

    it('coalesces repeated fetches within the TTL and refetches after expiry', async () => {
      vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
      const lazyFetcher = vi.fn(async () => PAYLOAD)
      const makeAdapter = () =>
        new RestAdapter({ ...source, url: 'https://api.example.com/cached', cacheTtl: 60 }, lazyFetcher)

      await makeAdapter().getSeries({ source: 'ext', metric: 'count', granularity: 'day' })
      await makeAdapter().getSeries({ source: 'ext', metric: 'count', granularity: 'month' })
      expect(lazyFetcher).toHaveBeenCalledTimes(1)

      vi.setSystemTime(new Date('2026-06-01T00:02:00Z'))
      await makeAdapter().getSeries({ source: 'ext', metric: 'count', granularity: 'day' })
      expect(lazyFetcher).toHaveBeenCalledTimes(2)
    })
  })

  it('scales mapped values (score 0-1 to 0-100)', async () => {
    const adapter = new RestAdapter(
      {
        ...source,
        url: 'https://api.example.com/score',
        mapping: { date: 'summary.date', value: 'summary.score', scale: 100 }
      },
      async () => ({ summary: { date: '2026-05-01T00:00:00Z', score: 0.87 } })
    )
    const result = await adapter.getSeries({ source: 'ext', metric: 'score', granularity: 'hour' })
    expect(result.series).toEqual([{ name: 'total', points: [{ x: Date.UTC(2026, 4, 1), y: 87 }] }])
  })

  it('dates "now" snapshots with the fetch time', async () => {
    const adapter = new RestAdapter(
      {
        ...source,
        url: 'https://api.example.com/snapshot',
        mapping: { date: 'now', value: 'summary.score' }
      },
      async () => ({ summary: { score: 5 } })
    )
    const withoutFilter = await adapter.getSeries({ source: 'ext', metric: 'score', granularity: 'minute' })
    expect(withoutFilter.series).toHaveLength(1)

    const excludedByFutureFrom = await adapter.getSeries({
      source: 'ext',
      metric: 'score',
      granularity: 'minute',
      from: Date.now() + 60_000
    })
    expect(excludedByFutureFrom.series).toEqual([])
  })
})

describe('MetricsCollector', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:05Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('buffers requests into windows and flushes latency/error/throughput on sample', () => {
    const collector = new MetricsCollector({ autostart: false })
    collector.observeRequest('sources.series', true, 100)
    collector.observeRequest('sources.series', false, 300)
    vi.setSystemTime(new Date('2026-06-01T00:00:15Z'))
    collector.sample()
    const latency = collector.getMetric('latency_ms')
    expect(latency).toHaveLength(1)
    expect(latency[0].value).toBe(200)
    expect(collector.getMetric('error_rate')[0].value).toBe(50)
    expect(collector.getMetric('requests_per_minute')[0].value).toBe(2)
  })

  it('flushes only closed windows and samples system metrics', () => {
    const collector = new MetricsCollector({ autostart: false })
    collector.observeRequest('sources.series', true, 50)
    collector.sample()
    expect(collector.getMetric('requests_per_minute')).toHaveLength(0)
    expect(collector.getMetric('ram_percent')[0].value).toBeGreaterThan(0)
    expect(collector.getMetric('uptime_seconds')[0].value).toBeGreaterThan(0)
    expect(collector.getMetric('cpu_percent')[0].value).toBeGreaterThanOrEqual(0)
  })

  it('keeps a bounded ring buffer per metric', () => {
    const collector = new MetricsCollector({ autostart: false, capacity: 3 })
    for (let i = 0; i < 5; i++) collector.push('cpu_percent', i)
    expect(collector.getMetric('cpu_percent').map((s) => s.value)).toEqual([2, 3, 4])
  })
})

describe('InternalAdapter', () => {
  it('turns collector samples into aggregated series', async () => {
    const collector = new MetricsCollector({ autostart: false })
    collector.push('latency_ms', 10, Date.UTC(2026, 5, 1, 0, 0, 10))
    collector.push('latency_ms', 30, Date.UTC(2026, 5, 1, 0, 0, 40))
    const adapter = new InternalAdapter({ adapter: 'internal', id: 'gateway', label: 'Gateway' }, collector)

    const result = await adapter.getSeries({
      source: 'gateway',
      metric: 'latency_ms',
      granularity: 'minute',
      reduce: 'avg'
    })
    expect(result.series).toEqual([{ name: 'total', points: [{ x: Date.UTC(2026, 5, 1, 0, 0), y: 20 }] }])
  })

  it('returns empty series for unknown metrics', async () => {
    const adapter = new InternalAdapter(
      { adapter: 'internal', id: 'gateway', label: 'Gateway' },
      metricsCollector
    )
    const result = await adapter.getSeries({ source: 'gateway', metric: 'nope', granularity: 'minute' })
    expect(result.series).toEqual([])
  })

  it('seeds synthetic probe history on first query without duplicating it', async () => {
    const collector = new MetricsCollector({ autostart: false })
    const adapter = new InternalAdapter({ adapter: 'internal', id: 'gateway', label: 'Gateway' }, collector)
    const query = { source: 'gateway', metric: 'probe:gateway:uptime', granularity: 'minute' as const, reduce: 'avg' as const }

    const first = await adapter.getSeries(query)
    expect(first.series).toHaveLength(1)
    expect(first.series[0].points.length).toBeGreaterThan(0)
    expect(first.series[0].points.every((p) => p.y >= 0 && p.y <= 100)).toBe(true)

    const second = await adapter.getSeries(query)
    expect(second.series[0].points).toHaveLength(first.series[0].points.length)
  })
})
