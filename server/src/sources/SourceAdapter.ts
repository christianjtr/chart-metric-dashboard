import type { Source } from '../schemas/config.js'
import type { SeriesQueryInput, SeriesResponse } from '../schemas/series.js'
import { NdjsonAdapter } from './ndjson.adapter.js'
import { RestAdapter } from './rest.adapter.js'
import { InternalAdapter } from './internal.adapter.js'
import type { MetricsCollector } from '../metrics/collector.js'

export type Fetcher = (url: string, headers: Record<string, string>) => Promise<unknown>

export interface SourceAdapter {
  readonly source: Source
  getSeries(query: SeriesQueryInput): Promise<SeriesResponse>
}

export const createAdapter = (
  source: Source,
  deps: { collector?: MetricsCollector; baseDir?: string } = {}
): SourceAdapter => {
  switch (source.adapter) {
    case 'ndjson':
      return new NdjsonAdapter(source, deps.baseDir)
    case 'rest':
      return new RestAdapter(source)
    case 'internal': {
      if (!deps.collector) throw new Error(`Internal source "${source.id}" requires a metrics collector`)
      return new InternalAdapter(source, deps.collector)
    }
  }
}

export { NdjsonAdapter, RestAdapter, InternalAdapter }
