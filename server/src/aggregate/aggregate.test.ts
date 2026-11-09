import { describe, it, expect } from 'vitest'
import { aggregate, bucketStart, parseDate, type EventRow } from './aggregate'

describe('parseDate', () => {
  it('parses ISO strings natively when no format is given', () => {
    expect(parseDate('2026-03-05T10:00:00Z')).toBe(Date.UTC(2026, 2, 5, 10))
  })

  it('parses token formats as UTC', () => {
    expect(parseDate('05-03-2026', 'DD-MM-YYYY')).toBe(Date.UTC(2026, 2, 5))
    expect(parseDate('2026-03-05', 'YYYY-MM-DD')).toBe(Date.UTC(2026, 2, 5))
    expect(parseDate('03/2026', 'MM/YYYY')).toBe(Date.UTC(2026, 2, 1))
  })

  it('returns NaN for unparseable input', () => {
    expect(parseDate('not-a-date')).toBeNaN()
    expect(parseDate('not-a-date', 'DD-MM-YYYY')).toBeNaN()
  })

  it('rejects out-of-range values instead of rolling over', () => {
    expect(parseDate('32-13-2026', 'DD-MM-YYYY')).toBeNaN()
    expect(parseDate('31-02-2026', 'DD-MM-YYYY')).toBeNaN()
  })
})

describe('bucketStart', () => {
  const ts = Date.UTC(2026, 2, 5, 15, 30) // Thursday 2026-03-05

  it('buckets to start of day', () => {
    expect(bucketStart(ts, 'day')).toBe(Date.UTC(2026, 2, 5))
  })

  it('buckets weeks to Monday', () => {
    expect(bucketStart(ts, 'week')).toBe(Date.UTC(2026, 2, 2))
  })

  it('buckets months and years to their first day', () => {
    expect(bucketStart(ts, 'month')).toBe(Date.UTC(2026, 2, 1))
    expect(bucketStart(ts, 'year')).toBe(Date.UTC(2026, 0, 1))
  })
})

describe('aggregate', () => {
  const events: EventRow[] = [
    { date: Date.UTC(2026, 0, 3), value: 2, series: 'a' },
    { date: Date.UTC(2026, 0, 9), value: 3, series: 'a' },
    { date: Date.UTC(2026, 0, 5), value: 1, series: 'b' }
  ]

  it('counts events grouped by series, points sorted by x', () => {
    const result = aggregate(events, { granularity: 'week', groupBy: 'kind' })
    expect(result).toEqual([
      {
        name: 'a',
        points: [
          { x: Date.UTC(2025, 11, 29), y: 2 },
          { x: Date.UTC(2026, 0, 5), y: 3 }
        ]
      },
      { name: 'b', points: [{ x: Date.UTC(2026, 0, 5), y: 1 }] }
    ])
  })

  it('uses a single total series when no groupBy', () => {
    const result = aggregate(events, { granularity: 'month' })
    expect(result).toEqual([{ name: 'total', points: [{ x: Date.UTC(2026, 0, 1), y: 6 }] }])
  })

  it('splits buckets across months', () => {
    const result = aggregate(events, { granularity: 'month', groupBy: 'kind' })
    expect(result[0].points).toEqual([
      { x: Date.UTC(2026, 0, 1), y: 5 }
    ])
  })

  it('splits buckets across years', () => {
    const byYear = aggregate(
      [...events, { date: Date.UTC(2025, 5, 1), value: 4, series: 'a' }],
      { granularity: 'year', groupBy: 'kind' }
    )
    expect(byYear.find((s) => s.name === 'a')?.points).toEqual([
      { x: Date.UTC(2025, 0, 1), y: 4 },
      { x: Date.UTC(2026, 0, 1), y: 5 }
    ])
  })
})
