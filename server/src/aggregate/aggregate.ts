import { isValid, parse, startOfDay, startOfMonth, startOfWeek, startOfYear } from 'date-fns'
import { utc } from '@date-fns/utc'
import type { Granularity } from '../schemas/config'
import type { NamedSeries } from '../schemas/series'

const DATE_FNS_TOKENS: Record<string, string> = { YYYY: 'yyyy', MM: 'MM', DD: 'dd' }

const DAY_ONE = new Date(1970, 0, 1)

const toDateFormat = (format: string): string =>
  format.replace(/YYYY|MM|DD/g, (token) => DATE_FNS_TOKENS[token] ?? token)

export const parseDate = (input: string, format?: string): number => {
  if (!format) {
    const native = Date.parse(input)
    return Number.isNaN(native) ? NaN : native
  }

  try {
    const parsed = parse(input, toDateFormat(format), DAY_ONE, { in: utc })
    return isValid(parsed) ? parsed.getTime() : NaN
  } catch {
    return NaN
  }
}

export const bucketStart = (timestamp: number, granularity: Granularity): number => {
  switch (granularity) {
    case 'day':
      return startOfDay(timestamp, { in: utc }).getTime()
    case 'week':
      return startOfWeek(timestamp, { in: utc, weekStartsOn: 1 }).getTime()
    case 'month':
      return startOfMonth(timestamp, { in: utc }).getTime()
    case 'year':
      return startOfYear(timestamp, { in: utc }).getTime()
  }
}

export interface EventRow {
  date: number
  value: number
  series: string
}

export interface AggregateOptions {
  granularity: Granularity
  groupBy?: string
}

export const TOTAL_SERIES = 'total'

export const aggregate = (
  events: EventRow[],
  { granularity, groupBy }: AggregateOptions
): NamedSeries[] => {
  const buckets = new Map<string, Map<number, number>>()

  for (const event of events) {
    const seriesName = groupBy ? event.series : TOTAL_SERIES
    const x = bucketStart(event.date, granularity)
    if (Number.isNaN(x)) continue

    const seriesBuckets = buckets.get(seriesName) ?? new Map<number, number>()
    seriesBuckets.set(x, (seriesBuckets.get(x) ?? 0) + event.value)
    buckets.set(seriesName, seriesBuckets)
  }

  return [...buckets.entries()]
    .map(([name, seriesBuckets]) => ({
      name,
      points: [...seriesBuckets.entries()]
        .sort(([a], [b]) => a - b)
        .map(([x, y]) => ({ x, y }))
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
