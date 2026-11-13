import { aggregate, parseDate, type EventRow } from '../aggregate/aggregate.js'
import { extractCollection, extractPath } from './extract.js'
import { loadSettings, type DashboardSettings } from '../config/settings.js'
import type { RestSourceSchema } from '../schemas/config.js'
import type { SeriesQueryInput, SeriesResponse } from '../schemas/series.js'
import type { Fetcher, SourceAdapter } from './SourceAdapter.js'
import type { z } from 'zod'

type RestSource = z.infer<typeof RestSourceSchema>

const WILDCARD = '[]'

const hashSeed = (input: string): number => {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const mulberry32 = (seed: number): (() => number) => {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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
  if (value.startsWith('setting:')) {
    const name = value.slice('setting:'.length)
    return loadSettings()[name as keyof DashboardSettings] ?? process.env[name]
  }
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

  private isPsiSource(): boolean {
    return this.source.url.includes('pagespeedonline')
  }

  private psiKey(): string | undefined {
    const raw = this.source.params?.key
    if (!raw) return undefined
    if (raw.startsWith('setting:') || raw.startsWith('env:')) return resolveParamValue(raw)
    return raw
  }

  private syntheticVitals(query: SeriesQueryInput): SeriesResponse {
    const metric = query.metric ?? 'count'
    const rng = mulberry32(hashSeed(`${this.source.id}:${metric}:${new Date().toISOString().slice(0, 10)}`))
    const now = Date.now()
    const from = query.from ?? now - 24 * 3_600_000
    const step = 3_600_000
    const first = Math.ceil(from / step) * step

    const pointsFor = (min: number, max: number): Array<{ x: number; y: number }> => {
      const points: Array<{ x: number; y: number }> = []
      for (let t = first; t <= now; t += step) {
        points.push({ x: t, y: Math.round((min + rng() * (max - min)) * 1000) / 1000 })
      }
      points.push({ x: now, y: Math.round((min + rng() * (max - min)) * 1000) / 1000 })
      return points
    }

    const auditRanges: Record<string, [number, number]> = {
      'first-contentful-paint': [900, 1600],
      'largest-contentful-paint': [1300, 2400],
      'total-blocking-time': [90, 280],
      'cumulative-layout-shift': [0.01, 0.09],
      'speed-index': [1300, 2800],
      interactive: [1900, 3600],
      'server-response-time': [180, 420]
    }

    const fieldRanges: Record<string, [number, number]> = {
      FCP: [900, 1500],
      INP: [120, 260],
      LCP: [1400, 2300],
      CLS: [0.01, 0.08],
      TTFB: [250, 550]
    }

    let series
    if (metric === 'audits') {
      series = Object.entries(auditRanges).map(([name, [min, max]]) => ({
        name,
        points: pointsFor(min, max)
      }))
    } else if (metric === 'field') {
      series = Object.entries(fieldRanges).map(([name, [min, max]]) => ({
        name,
        points: pointsFor(min, max)
      }))
    } else if (/^probe:.+:uptime$/.test(metric)) {
      const step = 60_000
      const startOfMinute = Math.floor(now / step) * step
      const points: Array<{ x: number; y: number }> = []
      for (let i = 120; i >= 1; i--) {
        const t = startOfMinute - i * step
        const uptime = rng() > 0.94 ? 90 + rng() * 8 : 99 + rng()
        points.push({ x: t, y: Math.round(Math.min(100, uptime) * 1000) / 1000 })
      }
      series = [{ name: metric, points }]
    } else {
      const [min, max] = auditRanges[metric] ?? (metric === 'performance' ? [86, 96] : [40, 80])
      series = [{ name: metric, points: pointsFor(min, max) }]
    }

    return {
      sourceId: this.source.id,
      metric,
      granularity: query.granularity ?? 'day',
      sample: true,
      series
    }
  }

  async getSeries(query: SeriesQueryInput): Promise<SeriesResponse> {
    if (this.isPsiSource() && !this.psiKey()) {
      return this.syntheticVitals(query)
    }

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
