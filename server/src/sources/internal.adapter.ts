import { aggregate, type EventRow } from '../aggregate/aggregate.js'
import type { InternalSourceSchema } from '../schemas/config.js'
import type { SeriesQueryInput, SeriesResponse } from '../schemas/series.js'
import type { SourceAdapter } from './SourceAdapter.js'
import type { MetricsCollector } from '../metrics/collector.js'
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
    const metric = query.metric ?? 'count'
    let events: EventRow[] = this.collector.getMetric(metric)
      .map(({ t, value }) => ({ date: t, value, series: 'value' }))

    const probeMatch = metric.match(/^probe:([a-z0-9-]+):/)
    if (events.length === 0 && probeMatch) {
      this.collector.seedProbe(probeMatch[1])
      events = this.collector.getMetric(metric)
        .map(({ t, value }) => ({ date: t, value, series: 'value' }))
    }

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
