import type { Source } from '../schemas/config'
import type { SeriesQueryInput, SeriesResponse } from '../schemas/series'
import { NdjsonAdapter } from './ndjson.adapter'
import { RestAdapter } from './rest.adapter'
import { InternalAdapter } from './internal.adapter'
import type { MetricsCollector } from '../metrics/collector'

export type Fetcher = (url: string, headers: Record<string, string>) => Promise<unknown>

export interface SourceAdapter {
  readonly source: Source
  getSeries(query: SeriesQueryInput): Promise<SeriesResponse>
}

export const createAdapter = (
  source: Source,
  deps: { collector?: MetricsCollector } = {}
): SourceAdapter => {
  switch (source.adapter) {
    case 'ndjson':
      return new NdjsonAdapter(source)
    case 'rest':
      return new RestAdapter(source)
    case 'internal': {
      if (!deps.collector) throw new Error(`Internal source "${source.id}" requires a metrics collector`)
      return new InternalAdapter(source, deps.collector)
    }
  }
}

export { NdjsonAdapter, RestAdapter, InternalAdapter }
