# ADR 0007: Compact Sentry-style redesign

- Status: accepted
- Date: 2026-11-11

## Context

After phase 6 the board was functional but visually heavy: every chart panel
rendered at a fixed 320px, stat values used 4rem type, and three health panels
were radial gauges ("speedometers") that the user explicitly dislikes.
References for the new direction were the Vuetify Snips dashboards (dense KPI
cards with delta chips, small typography) and Sentry's product UI (dark slate
surfaces, violet accent, sparklines, dense tables).

## Decision

- **Palette**: replace the Grafana-dark theme with `sentryDark` — background
  `#12121a`, surface `#1c1c26`, violet accent `#7a6ff0`, and semantic
  success/warning/error colors. The chart series palette (violet, blue, green,
  amber, red, gray, magenta, teal) replaces the Grafana palette, and the
  default series/stat color becomes the violet accent.
- **Density**: chart panels drop to 180px with tighter grids and 10px
  axis/legend fonts; stat values to 2.2rem; card headers, paddings, and
  borders tightened in `styles/panels.css`. Single-series charts hide the
  legend entirely.
- **`sparkstat` replaces `gauge`** (breaking config change): a threshold-colored
  value plus a minimal ECharts sparkline (no axes/legend/tooltip) and a delta
  chip showing the percent change between the last two points. Gauge panels
  and `gaugeColorStops` are removed.
- **Delta direction**: panels may declare `lowerIsBetter`; when absent, lower
  is treated as better except for score-like units (`pts`) or request-count
  panels. The shared helper `client/src/utils/delta.ts` computes direction and
  improvement so `StatPanel` and `SparkStatPanel` render consistent chips
  (green when improved, red when worsened). `Gateway uptime` opts out with
  `lowerIsBetter: false` because growth is neutral.
- **`table` panel type**: a dense `v-table` rendering one row per named series
  (audit id + last value), sorted by value descending and capped at 10 rows
  with a "+N more" footer. Used by the "PSI audits" panel, which reuses the
  existing `psi-vitals` REST source — the series contract already carries one
  series per Lighthouse audit, so no new endpoint or schema fields were needed
  beyond the new chart enum values.

## Consequences

- Existing `gauge` panels in older configs will fail validation until switched
  to `sparkstat`; the bundled `dashboard.config.json` is updated in the same
  change.
- The board is denser: all 16 panels fit in roughly two viewport heights,
  versus four before.
- PSI panels still show their error state until a real
  `PAGESPEED_API_KEY` is exported; the audit table inherits that state.
- The client bundle stays above the 500 kB warning; code-splitting the chart
  components remains an open follow-up.
