import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { NdjsonAdapter } from './ndjson.adapter'

const adapter = new NdjsonAdapter({
  adapter: 'ndjson',
  id: 'test-errors',
  label: 'Test Errors',
  path: path.resolve(__dirname, '__fixtures__/events.ndjson'),
  mapping: {
    date: 'date',
    series: 'typeOfError',
    dateFormat: 'DD-MM-YYYY'
  }
})

describe('NdjsonAdapter', () => {
  it('aggregates events by month grouped by the series field', async () => {
    const result = await adapter.getSeries({
      source: 'test-errors',
      metric: 'count',
      granularity: 'month',
      groupBy: 'typeOfError'
    })

    expect(result.sourceId).toBe('test-errors')
    expect(result.granularity).toBe('month')
    expect(result.series).toEqual([
      {
        name: 'In Page Errors',
        points: [
          { x: Date.UTC(2017, 0, 1), y: 2 },
          { x: Date.UTC(2017, 1, 1), y: 1 }
        ]
      },
      {
        name: 'JS Errors',
        points: [
          { x: Date.UTC(2016, 2, 1), y: 1 },
          { x: Date.UTC(2017, 1, 1), y: 2 }
        ]
      }
    ])
  })

  it('aggregates by year with a single total series when no groupBy', async () => {
    const result = await adapter.getSeries({
      source: 'test-errors',
      metric: 'count',
      granularity: 'year', reduce: 'sum'
    })

    expect(result.series).toEqual([
      {
        name: 'total',
        points: [
          { x: Date.UTC(2016, 0, 1), y: 1 },
          { x: Date.UTC(2017, 0, 1), y: 5 }
        ]
      }
    ])
  })

  it('honors from/to filters', async () => {
    const result = await adapter.getSeries({
      source: 'test-errors',
      metric: 'count',
      granularity: 'year',
      from: Date.UTC(2017, 0, 1)
    })

    expect(result.series[0].points).toEqual([{ x: Date.UTC(2017, 0, 1), y: 5 }])
  })
})
