# ADR 0006: Health sources — self-metrics, runtime settings, REST extensions

- Status: accepted
- Date: 2026-11-11

## Context

Phase 5 delivered Grafana-style display types; the remaining gap for a health
board is data. Two kinds of health sources are needed:

- Frontend web vitals from Google PageSpeed Insights (PSI): an external REST
  API that needs a target URL, an API key, slow responses (tens of seconds),
  and heavy rate limits.
- Backend self-metrics for the gateway itself (latency, error rate, throughput,
  CPU, RAM, uptime) with no external dependency.

Constraints discovered during planning:

- PSI's target URL is a runtime choice of the dashboard user, not a deployment
  constant, so it cannot live in `dashboard.config.json` or the environment.
- PSI scores are 0-1 floats that need scaling to 0-100, and a snapshot API
  (no time series), so sampled values must be dated "now".
- PSI rate limits and multi-second latency make naive per-panel polling
  unacceptable: several panels query the same URL and refresh cycles overlap.

## Decision

- **Internal adapter + MetricsCollector** (`server/src/metrics/collector.ts`):
  a singleton `MetricsCollector` keeps bounded ring buffers (720 samples × 10s
  ≈ 2h) per metric. A tRPC middleware times every procedure and feeds
  `latency_ms`, `error_rate`, and `requests_per_minute` through 10s request
  windows that flush on close; a 10s sampler records `cpu_percent`
  (via `os.cpus()` deltas), `ram_percent`, `uptime_seconds`, and
  `heap_used_mb`. The new `internal` Source kind reads those buffers through
  the normal `aggregate()` pipeline, so panels treat it like any other source.
- **Runtime settings**: `server/src/config/settings.ts` persists an optional
  `psiTargetUrl` to `dashboard.settings.json` (git-ignored, path overridable
  via `DASHBOARD_SETTINGS`). Config values may reference it with a
  `setting:key` prefix, resolved per request next to `env:VAR`.
  tRPC exposes `dashboard.settings` (query) and `dashboard.setSettings`
  (Zod-validated mutation); the client edits it in a settings dialog.
- **REST adapter extensions**: optional `params` (query string, values may be
  `env:`/`setting:` refs, unresolved refs fail loudly), `scale` on mappings
  (PSI scores ×100), `"now"` as a mapping date (fetch-time snapshot), and
  `cacheTtl` (seconds) backed by a module-level coalescing fetch cache keyed by
  the final URL — adapters are instantiated per request, so only module scope
  survives; failed fetches are evicted. Requests time out after 15s via
  `AbortSignal`.
- **Two-layer reference resolution**: `env:` refs in source `headers` still
  resolve eagerly at config load (phase 3 behavior); refs inside `params`
  resolve lazily per request, because settings change at runtime. Resolving
  the whole config eagerly would erase the placeholders before the adapter
  ever sees them.
- **Panel descriptions**: optional `description` on panels, rendered as an
  info affordance with a Vuetify tooltip in every panel card header.

The `psi-performance` and `psi-vitals` sources plus the `gateway` internal
source and ten "Health" section panels are wired in `dashboard.config.json`.

## Consequences

- No new endpoints: the internal source reuses `sources.series`; the settings
  procedures are the only router additions.
- With no `PAGESPEED_API_KEY` (or an invalid one) the PSI panels show their
  error state; the rest of the board keeps working. Real values appear once
  the key is exported and a target URL is saved in Settings.
- The 2h ring buffer bounds memory (~720 numbers per metric) and matches the
  1h/2h time-range selector; "All time" simply shows whatever the buffer
  holds.
- Disk I/O metrics are out of scope: they would require Linux `/proc`
  semantics unavailable on macOS/dev machines.
- `cacheTtl` is applied per identical final URL; two PSI panels sharing
  parameters trigger a single upstream fetch per TTL window.
