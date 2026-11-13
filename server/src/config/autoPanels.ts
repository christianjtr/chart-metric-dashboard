import { metricsCollector, type MetricsCollector } from '../metrics/collector.js'
import type { Panel, Source } from '../schemas/config.js'

export const PUSHED_SOURCE_ID = 'pushed'
export const CONNECTED_APPS_SECTION = 'Connected apps'

export const PUSHED_SOURCE: Source = {
  adapter: 'internal',
  id: PUSHED_SOURCE_ID,
  label: 'Pushed metrics (ingest)'
}

const humanize = (name: string): string =>
  name
    .split(/[._:-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const titleFor = (metric: string): string =>
  humanize(metric.replace(/(_)?(ms|percent|pct|count|total|seconds)$/i, '').replace(/_+$/, ''))

const autoPanel = (metric: string): Panel => {
  const core = metric.slice(metric.indexOf('.') + 1)
  const app = metric.slice(0, metric.indexOf('.')) || 'default'
  const base = {
    title: titleFor(metric) || humanize(core),
    description: `Auto-created for the metric \`${metric}\` reported by the connected app "${app}". Declare it in dashboard.config.json to customize or pin this panel.`,
    source: PUSHED_SOURCE_ID,
    metric,
    granularity: 'minute' as const,
    refresh: 60,
    span: 3 as const,
    section: CONNECTED_APPS_SECTION,
    auto: true
  }
  if (/(^|[._-])(percent|pct)$/i.test(core)) {
    return { ...base, chart: 'sparkstat', reduce: 'avg', unit: '%', min: 0, max: 100, lowerIsBetter: true }
  }
  if (/ms$/i.test(core)) {
    return { ...base, chart: 'stat', reduce: 'avg', unit: 'ms', lowerIsBetter: true }
  }
  if (/(count|total|requests)$/i.test(core)) {
    return { ...base, chart: 'sparkstat', reduce: 'sum' }
  }
  return { ...base, chart: 'sparkstat', reduce: 'last' }
}

export const autoPanelsFor = (declaredPanels: Panel[], collector: MetricsCollector = metricsCollector): Panel[] => {
  const declared = new Set(declaredPanels.map((panel) => panel.metric))
  return collector
    .pushedMetricNames()
    .filter((name) => !declared.has(name))
    .map(autoPanel)
}
