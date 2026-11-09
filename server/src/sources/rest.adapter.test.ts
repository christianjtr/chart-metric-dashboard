import { describe, it, expect, vi } from 'vitest'
import { RestAdapter } from './rest.adapter'

const PAYLOAD = {
  items: [
    { createdAt: '2026-01-03T10:00:00Z', count: 2, kind: 'a' },
    { createdAt: '2026-01-09T10:00:00Z', count: 3, kind: 'a' },
    { createdAt: '2026-02-05T10:00:00Z', count: 1, kind: 'b' }
  ]
}

const fetcher = vi.fn(async () => PAYLOAD)

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
      granularity: 'day'
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
})
