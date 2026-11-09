import type { Source } from '../schemas/config'
import type { SeriesQuery, SeriesResponse } from '../schemas/series'
import { NdjsonAdapter } from './ndjson.adapter'
import { RestAdapter } from './rest.adapter'

export type Fetcher = (url: string, headers: Record<string, string>) => Promise<unknown>

export interface SourceAdapter {
  readonly source: Source
  getSeries(query: SeriesQuery): Promise<SeriesResponse>
}

export const createAdapter = (source: Source): SourceAdapter => {
  switch (source.adapter) {
    case 'ndjson':
      return new NdjsonAdapter(source)
    case 'rest':
      return new RestAdapter(source)
  }
}

export { NdjsonAdapter, RestAdapter }
