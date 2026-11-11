import { aggregate, parseDate, type EventRow } from '../aggregate/aggregate'
import { extractCollection, extractPath } from './extract'
import { loadSettings } from '../config/settings'
import type { RestSourceSchema } from '../schemas/config'
import type { SeriesQueryInput, SeriesResponse } from '../schemas/series'
import type { Fetcher, SourceAdapter } from './SourceAdapter'
import type { z } from 'zod'

type RestSource = z.infer<typeof RestSourceSchema>

const WILDCARD = '[]'

interface FetchCacheEntry {
  at: number
  promise: Promise<unknown>
}

const fetchCache = new Map<string, FetchCacheEntry>()

export const clearFetchCache = (): void => {
  fetchCache.clear()
}

const splitMapping = (
  mapping: RestSource['mapping']
): { collectionPath: string | null; fields: { date: string; value?: string; series?: string; dateFormat?: string; scale?: number } } => {
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
      dateFormat: mapping.dateFormat,
      scale: mapping.scale
    }
  }
}

const resolveParamValue = (value: string): string | undefined => {
  if (value.startsWith('setting:')) return loadSettings()[value.slice('setting:'.length) as 'psiTargetUrl']
  if (value.startsWith('env:')) return process.env[value.slice('env:'.length)]
  return value
}

const buildUrl = (source: RestSource): string => {
  const url = new URL(source.url)
  for (const [key, rawValue] of Object.entries(source.params ?? {})) {
    const resolved = resolveParamValue(rawValue)
    if (resolved === undefined || resolved === '') {
      throw new Error(`Unresolved parameter "${key}" (${rawValue}). Configure the missing env var or setting.`)
    }
    url.searchParams.set(key, resolved)
  }
  return url.toString()
}

const fetchWithCache = (source: RestSource, fetcher: Fetcher): Promise<unknown> => {
  const url = buildUrl(source)
  if (!source.cacheTtl) return fetcher(url, source.headers ?? {})

  const hit = fetchCache.get(url)
  const now = Date.now()
  if (hit && hit.at + source.cacheTtl * 1000 > now) return hit.promise

  const promise = fetcher(url, source.headers ?? {})
  fetchCache.set(url, { at: now, promise })
  promise.catch(() => fetchCache.delete(url))
  return promise
}

export class RestAdapter implements SourceAdapter {
  readonly source: RestSource
  private readonly fetcher: Fetcher

  constructor(source: RestSource, fetcher: Fetcher = RestAdapter.defaultFetcher) {
    this.source = source
    this.fetcher = fetcher
  }

  static defaultFetcher: Fetcher = async (url, headers) => {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
    if (!response.ok) {
      throw new Error(`Source ${url} responded ${response.status}`)
    }
    return response.json()
  }

  async getSeries(query: SeriesQueryInput): Promise<SeriesResponse> {
    const payload = await fetchWithCache(this.source, this.fetcher)
    const { collectionPath, fields } = splitMapping(this.source.mapping)

    const records = collectionPath ? extractCollection(payload, collectionPath) : [payload]
    const events: EventRow[] = []

    for (const record of records) {
      const timestamp = fields.date === 'now' ? Date.now() : parseDate(String(extractPath(record, fields.date) ?? ''), fields.dateFormat)
      if (Number.isNaN(timestamp)) continue
      if (query.from !== undefined && timestamp < query.from) continue
      if (query.to !== undefined && timestamp > query.to) continue

      const rawValue = fields.value ? extractPath(record, fields.value) : undefined
      const rawSeries = fields.series ? extractPath(record, fields.series) : undefined

      events.push({
        date: timestamp,
        value: rawValue === undefined ? 1 : (Number(rawValue) || 0) * (fields.scale ?? 1),
        series: rawSeries === undefined ? 'count' : String(rawSeries)
      })
    }

    return {
      sourceId: this.source.id,
      metric: query.metric ?? 'count',
      granularity: query.granularity ?? 'day',
      series: aggregate(events, {
        granularity: query.granularity ?? 'day',
        groupBy: query.groupBy ?? fields.series,
        reduce: query.reduce ?? 'sum'
      })
    }
  }
}
