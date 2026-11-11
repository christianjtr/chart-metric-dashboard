import { aggregate, type EventRow } from '../aggregate/aggregate'
import type { InternalSourceSchema } from '../schemas/config'
import type { SeriesQueryInput, SeriesResponse } from '../schemas/series'
import type { SourceAdapter } from './SourceAdapter'
import type { MetricsCollector } from '../metrics/collector'
import type { z } from 'zod'

type InternalSource = z.infer<typeof InternalSourceSchema>

export class InternalAdapter implements SourceAdapter {
  readonly source: InternalSource
  private readonly collector: MetricsCollector

  constructor(source: InternalSource, collector: MetricsCollector) {
    this.source = source
    this.collector = collector
  }

  async getSeries(query: SeriesQueryInput): Promise<SeriesResponse> {
    const events: EventRow[] = (query.metric ? this.collector.getMetric(query.metric) : [])
      .map(({ t, value }) => ({ date: t, value, series: 'value' }))

    return {
      sourceId: this.source.id,
      metric: query.metric ?? 'count',
      granularity: query.granularity ?? 'day',
      series: aggregate(events, {
        granularity: query.granularity ?? 'day',
        groupBy: query.groupBy,
        reduce: query.reduce ?? 'sum'
      })
    }
  }
}
