# ADR 0005: Grafana-style panel display types

- Status: accepted
- Date: 2026-11-10

## Context

The dashboard renders every panel as a stacked time chart (`area-step`, `bar`,
`line`). The product goal is a Grafana-like board for application health checks
(frontend web vitals, backend uptime/latency/error-rate/throughput/CPU/RAM),
which requires single-value tiles, radial gauges with threshold coloring, and a
dark board look. Health metrics also need sub-daily buckets (minute/hour) and
non-sum reductions (CPU% and latency must average; uptime must take the last
value).

## Decision

- Extend `ChartType` with `stat` and `gauge`; extend `Granularity` with
  `minute` and `hour`.
- Add optional, defaulted panel fields: `unit`, `decimals`, `min`, `max`,
  `thresholds` (max 4 `{color, value}` entries), `span` (Vuetify 12-column grid,
  default 6), `section` (row grouping title), and `reduce`
  (`sum | avg | last | min | max`, default `sum`).
- `reduce` becomes a `SeriesQuery` field; `aggregate()` tracks
  `{sum, count, last, lastAt, min, max}` per bucket and applies the reducer.
  `last` uses the latest event date inside the bucket, not iteration order.
- Threshold semantics follow Grafana: colors sorted ascending; the color of the
  highest threshold whose `value` is <= the current value wins.
- Client: fixed dark "grafanaDark" Vuetify theme; `StatPanel.vue` (big number,
  threshold color); `GaugePanel.vue` (ECharts gauge with threshold color stops);
  `App.vue` groups panels by `section`, sizes columns by `span`, and adds a
  header with a time-range selector (All / 1h / 2h) and a global refresh
  override. Time series stop being always-stacked (`line` overlays).
- Time range is global and defaults to `All time`; panels whose data falls
  outside the selected window simply show no data (Grafana behavior).

## Consequences

- The two pre-existing panels parse and render unchanged (all new fields default).
- Stat/gauge panels consume the same `SeriesResponse` contract — they take the
  last point of the first series; no new API endpoints.
- `max` on thresholds is capped at 4 to keep configs readable; more granular
  coloring is rarely meaningful on a gauge.
- The demo panels added to `dashboard.config.json` ("Display demos" section)
  exercise stat and gauge against the legacy dataset and are expected to be
  replaced by real health panels in ADR 0006's implementation. Note that
  `reduce` collapses events WITHIN each time bucket; a stat tile then reads the
  latest bucket's reduced value — cross-bucket extremes (e.g. "busiest month")
  are a different operation and intentionally not supported yet.
