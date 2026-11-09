import { aggregate, parseDate, type EventRow } from '../aggregate/aggregate'
import { extractCollection, extractPath } from './extract'
import type { RestSourceSchema } from '../schemas/config'
import type { SeriesQuery, SeriesResponse } from '../schemas/series'
import type { Fetcher, SourceAdapter } from './SourceAdapter'
import type { z } from 'zod'

type RestSource = z.infer<typeof RestSourceSchema>

const WILDCARD = '[]'

const splitMapping = (
  mapping: RestSource['mapping']
): { collectionPath: string | null; fields: { date: string; value?: string; series?: string; dateFormat?: string } } => {
  const paths = [mapping.date, mapping.value, mapping.series].filter(Boolean) as string[]
  const wildcardPath = paths.find((p) => p.includes(WILDCARD))

  if (!wildcardPath) {
    return { collectionPath: null, fields: { ...mapping, date: mapping.date } }
  }

  const wildcardIndex = wildcardPath.indexOf(WILDCARD)
  const collectionPath = wildcardPath.slice(0, wildcardIndex)
  const strip = (p?: string) => {
    if (!p) return undefined
    if (!p.includes(WILDCARD)) return p
    if (!p.startsWith(collectionPath)) {
      throw new Error(`Mapping paths must share the same collection: "${p}" vs "${wildcardPath}"`)
    }
    return p.slice(collectionPath.length + WILDCARD.length + 1) || p
  }

  return {
    collectionPath: collectionPath || WILDCARD,
    fields: {
      date: strip(mapping.date) as string,
      value: strip(mapping.value),
      series: strip(mapping.series),
      dateFormat: mapping.dateFormat
    }
  }
}

export class RestAdapter implements SourceAdapter {
  readonly source: RestSource
  private readonly fetcher: Fetcher

  constructor(source: RestSource, fetcher: Fetcher = RestAdapter.defaultFetcher) {
    this.source = source
    this.fetcher = fetcher
  }

  static defaultFetcher: Fetcher = async (url, headers) => {
    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(`Source ${url} responded ${response.status}`)
    }
    return response.json()
  }

  async getSeries(query: SeriesQuery): Promise<SeriesResponse> {
    const payload = await this.fetcher(this.source.url, this.source.headers ?? {})
    const { collectionPath, fields } = splitMapping(this.source.mapping)

    const records = collectionPath ? extractCollection(payload, collectionPath) : [payload]
    const events: EventRow[] = []

    for (const record of records) {
      const rawDate = extractPath(record, fields.date)
      const timestamp = parseDate(String(rawDate ?? ''), fields.dateFormat)
      if (Number.isNaN(timestamp)) continue
      if (query.from !== undefined && timestamp < query.from) continue
      if (query.to !== undefined && timestamp > query.to) continue

      const rawValue = fields.value ? extractPath(record, fields.value) : undefined
      const rawSeries = fields.series ? extractPath(record, fields.series) : undefined

      events.push({
        date: timestamp,
        value: rawValue === undefined ? 1 : Number(rawValue) || 0,
        series: rawSeries === undefined ? 'count' : String(rawSeries)
      })
    }

    return {
      sourceId: this.source.id,
      metric: query.metric,
      granularity: query.granularity,
      series: aggregate(events, {
        granularity: query.granularity,
        groupBy: query.groupBy ?? fields.series
      })
    }
  }
}
