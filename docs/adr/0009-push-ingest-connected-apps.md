# ADR 0009: Push ingest endpoint with drop-in agents and auto panels

Date: 2026-11-13

## Status

Accepted

## Context

Vitalscope until now only observed itself (internal self-metrics and PageSpeed probes) or read
files/REST APIs declared in `dashboard.config.json`. Integrating an existing frontend or backend
required either editing the config by hand or building a custom adapter. The goal is a
plug-and-play experience — "Better Stack, but simpler": an app should start reporting its internal
metrics with one line of code and no dashboard configuration.

The collector already exposes a generic `push(name, value, t)` ring-buffer API (ADR 0006/0008
precedent), and the `internal` adapter already reads any metric name from that namespace. That makes
a push-based integration nearly free on the storage side. Alternatives considered:

- **WebSocket two-way pub/sub**: rejected — over-engineering for a no-database, self-hosted tool;
  reporters prefer fire-and-forget HTTP.
- **SSE live stream to the browser**: deferred — improves freshness, does not solve app integration;
  polling remains the source of truth.
- **Pull-only (config adapters as today)**: rejected — fails the zero-config goal.

## Decision

1. **Ingest endpoint** — `POST /ingest` on the gateway (plain Express, not tRPC, so any HTTP client
   works). Body: `{ app?: string, metrics: [{ name, value, t? }] }` (max 50 metrics, 16 kB).
   Metrics are stored in the collector as `<app>.<name>` (e.g. `api.checkout_latency_ms`) to avoid
   colliding with self-metrics (`cpu_percent`) and probes (`probe:<id>:uptime`).
2. **Auth** — a bearer token (or `?token=` for `sendBeacon`) stored in `dashboard.settings.json` as
   `ingestToken`, generated and copied from the dashboard Settings → Ingest tab. Without a token the
   endpoint answers 503 (ingest disabled). Rejected tokens get 403; comparison is timing-safe.
3. **Agents** — dependency-free snippets served by the gateway:
   - `GET /agent/vitalscope.js`: browser RUM (FCP, LCP, CLS, INP, TTFB via PerformanceObserver) that
     POSTs once on page hide, configured with `data-url` / `data-app` / `data-token`.
   - `GET /agent/vitalscope-node.js`: ESM module `initVitalscope({ url, app, token })` reporting
     RSS, heap, event-loop lag on an interval plus custom metrics via `vitalscope.metric(name, value)`.
4. **Auto panels** — every pushed metric without a declared panel appears in a derived
   "Connected apps" section, merged at query time (never written to `dashboard.config.json`).
   Heuristics: `_percent`/`pct` → sparkstat 0-100 %, `_ms` → stat (lower is better),
   `_count`/`_total`/`_requests` → sparkstat summed, else sparkstat/last. A declared panel on the
   same metric shadows the auto panel. Auto panels carry `auto: true` and render an "Auto" chip.
   A virtual `internal` source `pushed` is injected automatically so panels resolve without any
   config edit. Pushed metrics are capped at 200 distinct names to bound memory.

## Consequences

- Zero-config loop: paste the snippet, panels appear. Customizing is optional and declarative.
- Ring buffers still mean ~2 h of history per metric (ADR 0008); pushed data is not persisted.
- Pushed metrics that stop flowing keep their last samples (staleness handling deferred).
- Non-Node backends integrate with the documented `curl` one-liner instead of an agent.
- The ingest endpoint is an additional gateway edge outside the tRPC Series contract (ADR 0001
  contract unchanged for reads).
