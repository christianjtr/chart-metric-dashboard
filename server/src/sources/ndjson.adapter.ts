import fs from 'node:fs'
import path from 'node:path'
import { aggregate, parseDate, type EventRow } from '../aggregate/aggregate'
import type { NdjsonSourceSchema } from '../schemas/config'
import type { SeriesQuery, SeriesResponse } from '../schemas/series'
import type { SourceAdapter } from './SourceAdapter'
import type { z } from 'zod'

type NdjsonSource = z.infer<typeof NdjsonSourceSchema>

export class NdjsonAdapter implements SourceAdapter {
  readonly source: NdjsonSource

  constructor(source: NdjsonSource) {
    this.source = source
  }

  async getSeries(query: SeriesQuery): Promise<SeriesResponse> {
    const { date, series, value, dateFormat } = this.source.mapping
    const absolutePath = path.resolve(this.source.path)

    const lines = fs.readFileSync(absolutePath, 'utf8').split('\n')
    const events: EventRow[] = []

    for (const line of lines) {
      if (!line.trim()) continue
      const record = JSON.parse(line)
      const timestamp = parseDate(String(record[date] ?? ''), dateFormat)
      if (Number.isNaN(timestamp)) continue
      if (query.from !== undefined && timestamp < query.from) continue
      if (query.to !== undefined && timestamp > query.to) continue

      events.push({
        date: timestamp,
        value: value ? Number(record[value]) || 0 : 1,
        series: series ? String(record[series] ?? 'unknown') : 'count'
      })
    }

    return {
      sourceId: this.source.id,
      metric: query.metric,
      granularity: query.granularity,
      series: aggregate(events, {
        granularity: query.granularity,
        groupBy: query.groupBy,
        reduce: query.reduce
      })
    }
  }
}
