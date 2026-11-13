# Chart Dashboard

A dashboard that renders chart panels from a declarative configuration, connecting to interchangeable data sources through a gateway with adapters.

## Language

**Source**:
A data origin declared in the configuration (ndjson, REST) with its declarative mapping.
_Avoid_: provider, datasource, connection

**Adapter**:
Implementation that materializes a Source according to its kind and exposes its data as Series.
_Avoid_: driver, connector, provider

**Mapping**:
Declaration of where to extract date, value, and series from a Source's raw payload.
_Avoid_: schema, transform, selector

**Gateway**:
The Express/tRPC layer that exposes the single Series contract and shields the client from each Source's specifics.
_Avoid_: backend, API, server (ambiguous)

**Series**:
A named set of (x, y) points produced by applying a Granularity and a grouping to a Source's data.
_Avoid_: dataset, curve, line

**Granularity**:
The temporal bucket size used for aggregation: day, week, month, or year. Aggregation happens in the Gateway.
_Avoid_: frequency, period, interval

**Panel**:
The visual unit of the dashboard: combines a Source, a metric, a chart type, filters, and a Refresh.
_Avoid_: card, widget, chart (a chart is only the render type)

**Refresh**:
The interval in seconds at which a Panel re-requests its Series from the Gateway (polling).
_Avoid_: polling, interval, auto-update

**Reduce**:
How each time bucket collapses its events into one y value: sum, avg, last, min, or max. Defaults to sum.
_Avoid_: aggregation function, reducer, rollup

**Threshold**:
A `{color, value}` bound on a Panel; the color of the highest threshold at or below the current value wins (Grafana semantics).
_Avoid_: alert rule, limit, budget

**Span**:
How many of the 12 grid columns a Panel occupies on desktop. Defaults to 6 (two panels per row).
_Avoid_: width, size, columns

**Section**:
A named row group that orders Panels in declaration order and renders a header.
_Avoid_: row, group, category

**Dashboard Config**:
The single shared file (`dashboard.config.json`) declaring Sources and Panels; both layers consume it.
_Avoid_: settings, manifest, app config

**Metrics Collector**:
The gateway component that samples its own health (latency, error rate, throughput, CPU, RAM, uptime) into bounded ring buffers, exposed to Panels through the internal Adapter.
_Avoid_: telemetry, instrumentation, Prometheus

**Internal Source**:
A Source kind backed by the Metrics Collector instead of external data; its metrics are queried like any other Source's Series.
_Avoid_: self-metrics source, system source

**Settings**:
Runtime values the dashboard user edits from the UI (e.g. the PSI target URL), persisted to a git-ignored file and referenced from Config with a `setting:key` prefix.
_Avoid_: preferences, options, runtime config

**Cache TTL**:
Seconds a REST Source reuses the last successful fetch for an identical final URL before hitting the origin again.
_Avoid_: cache time, expiry, memoization

**Sparkstat**:
A Panel type combining a threshold-colored value with a minimal sparkline of its Series and a delta chip comparing the last two points. Replaced the gauge.
_Avoid_: gauge, speedometer, kpi card

**Delta Chip**:
The ▲/▼ badge showing percent change between the last two points of a Series, colored by whether the metric improved according to Lower Is Better.
_Avoid_: trend badge, variation chip

**Lower Is Better**:
Optional Panel flag declaring that decreasing values are an improvement (latency, error rate, CPU). Defaults to true except for score-like units and request counts.
_Avoid_: direction, trend direction

**Table Panel**:
A Panel type rendering one dense row per named Series instead of a chart; used for the PSI audits list.
_Avoid_: data table, grid

**Statusbar**:
A Panel type rendering a BetterStack-style uptime strip: one colored segment per minute bucket of the last 2 hours, plus a headline uptime percentage. Green (≥99), amber (≥95), red otherwise.
_Avoid_: uptime bar, availability strip

**Status Overall**:
The worst status across all statusbar Panels (ok, degraded, outage), computed client-side and shown as the global status banner. Unknown when no probe data exists yet.
_Avoid_: health score, system status

**Probe**:
A synthetic gateway uptime sample recorded into the minute-bucket ring for a statusbar Panel. Seeded for 2 hours at startup and advanced live; not persisted.
_Avoid_: ping, heartbeat, check

**Sample Data**:
Clearly flagged synthetic series the Gateway returns when real data is unavailable (no PSI key, empty collector buffers at startup). Marked with `sample: true` on the response and a "Sample" chip on the Panel.
_Avoid_: mock data, fake data, demo data

**Sample Banner**:
The dismissible banner shown while any Panel renders Sample Data, pointing to Settings for the API key and to the Dashboard Config for data sources. Dismissal persists in localStorage.
_Avoid_: onboarding banner, warning

**Sample Fallback**:
The PSI behavior of returning day-seeded synthetic vitals with `sample: true` when `PAGESPEED_API_KEY` is not configured, instead of failing the request.
_Avoid_: mock mode, demo mode

**Healthy Reference**:
The official healthy value or range for a Panel's metric (e.g. LCP ≤ 2.5 s), displayed under the current value and cited with its source link (web.dev, Lighthouse, SRE Workbook). Declared in Config via the `reference` field.
_Avoid_: target, SLO, benchmark

**Field Data (CrUX)**:
Real-user performance metrics (75th percentiles from the Chrome UX Report: LCP, INP, CLS, FCP, TTFB) exposed by PageSpeed Insights through `loadingExperience`, as opposed to the lab metrics Lighthouse synthesizes on every run. Rendered by a curated Table Panel with one row per metric; empty when the target URL lacks CrUX coverage.
_Avoid_: RUM data, user metrics

**Web Vitals Table**:
A curated Table Panel that shows each metric row with its detected value (colored good/warn/poor), the recommended value and the cited source, driven by per-row Config references instead of listing every raw audit id.
_Avoid_: audit table, raw table

**Ingest Endpoint**:
The `POST /ingest` gateway route where any connected app reports metrics (`{ app, metrics: [{ name, value }] }`) authenticated with the Ingest Token. Metrics are stored in the Metrics Collector namespaced as `<app>.<name>`.
_Avoid_: push API, collector route

**Ingest Token**:
The bearer token (also accepted as `?token=`) required by the Ingest Endpoint, generated and copied from Settings → Ingest and persisted in dashboard.settings.json. Without a token, ingest answers 503 (disabled).
_Avoid_: API key (reserved for the PageSpeed key)

**Connected App**:
An external frontend or backend that reports its internal metrics to Vitalscope through the Ingest Endpoint using the drop-in agents (`/agent/vitalscope.js` for browsers, `/agent/vitalscope-node.js` for Node) or plain HTTP.
_Avoid_: client (ambiguous with the dashboard client), integration

**Auto Panel**:
A Panel synthesized at query time for a pushed metric that has no declared panel, shown in the "Connected apps" section with an "Auto" chip. Declared panels on the same metric shadow it; synthesized panels are never written to dashboard.config.json.
_Avoid_: dynamic panel, generated panel
