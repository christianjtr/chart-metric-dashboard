import {
  isValid,
  parse,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfMonth,
  startOfWeek,
  startOfYear
} from 'date-fns'
import { utc } from '@date-fns/utc'
import type { Granularity, Reduce } from '../schemas/config'
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
    case 'minute':
      return startOfMinute(timestamp, { in: utc }).getTime()
    case 'hour':
      return startOfHour(timestamp, { in: utc }).getTime()
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
  reduce?: Reduce
}

export const TOTAL_SERIES = 'total'

interface BucketAcc {
  sum: number
  count: number
  last: number
  lastAt: number
  min: number
  max: number
}

const REDUCERS: Record<Reduce, (acc: BucketAcc) => number> = {
  sum: (a) => a.sum,
  avg: (a) => (a.count === 0 ? 0 : a.sum / a.count),
  last: (a) => a.last,
  min: (a) => a.min,
  max: (a) => a.max
}

export const aggregate = (
  events: EventRow[],
  { granularity, groupBy, reduce = 'sum' }: AggregateOptions
): NamedSeries[] => {
  const buckets = new Map<string, Map<number, BucketAcc>>()

  for (const event of events) {
    const seriesName = groupBy ? event.series : TOTAL_SERIES
    const x = bucketStart(event.date, granularity)
    if (Number.isNaN(x)) continue

    const seriesBuckets = buckets.get(seriesName) ?? new Map<number, BucketAcc>()
    const acc = seriesBuckets.get(x) ?? { sum: 0, count: 0, last: 0, lastAt: 0, min: Infinity, max: -Infinity }
    acc.sum += event.value
    acc.count += 1
    if (event.date >= acc.lastAt) {
      acc.last = event.value
      acc.lastAt = event.date
    }
    acc.min = Math.min(acc.min, event.value)
    acc.max = Math.max(acc.max, event.value)
    seriesBuckets.set(x, acc)
    buckets.set(seriesName, seriesBuckets)
  }

  const reducer = REDUCERS[reduce]
  return [...buckets.entries()]
    .map(([name, seriesBuckets]) => ({
      name,
      points: [...seriesBuckets.entries()]
        .sort(([a], [b]) => a - b)
        .map(([x, acc]) => ({ x, y: reducer(acc) }))
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
