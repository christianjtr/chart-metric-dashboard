# Vitalscope — Web Vitals & Gateway Health Dashboard

Vitalscope is a self-hosted status page and health dashboard for a web platform: it shows live availability, frontend Web Vitals measured by [Google PageSpeed Insights](https://developers.google.com/speed/pagespeed/insights/), gateway self-metrics, and metrics pushed by any Connected App through a plug-and-play ingest endpoint.

![Vitalscope dashboard](docs/screenshot.png)

## Contents

1. [Use case: monitor an e-commerce](#use-case-monitor-an-e-commerce)
2. [Step 1 — Run it (2 min)](#step-1--run-it-2-min)
3. [Step 2 — Connect your website](#step-2--connect-your-website)
4. [Step 3 — Connect your apps](#step-3--connect-your-apps)
5. [Integration example: shop-api](#integration-example-shop-api)
6. [Customize panels](#customize-panels)
7. [Motivation](#motivation)
8. [Architecture](#architecture)
9. [Technologies](#technologies)
10. [Original project (charting exercise)](#original-project-charting-exercise)

## Use case: monitor an e-commerce

You run an online store with a web storefront and a Node.js checkout API. You want one screen — not four tools — answering:

- **Is the site up right now?** → the STATUS section shows per-minute uptime strips for the site (probed via PageSpeed) and the gateway, with a global banner when anything degrades.
- **How does it feel for real users?** → the HEALTH section shows Core Web Vitals from Lighthouse (lab) and the Chrome UX Report (Field Data), with each value colored good/warn/poor against the official thresholds.
- **Is the checkout backend healthy?** → `shop-api` reports its own metrics (checkout latency, queue depth, cache hit ratio) through the ingest endpoint; panels for them appear automatically.
- **Is anything broken at all?** → panel errors are aggregated into a single app-bar popover, so a down source never leaves you staring at empty panels.

One dashboard, three data paths, zero agents to configure by hand.

## Step 1 — Run it (2 min)

Requires [Node.js](https://nodejs.org/) and [NPM](https://www.npmjs.com/).

```shell
git clone https://github.com/christianjtr/chart-metric-dashboard.git
cd chart-metric-dashboard
npm install
npm run dev
```

Open `http://localhost:5173`. The dashboard starts immediately on **Sample Data** (clearly flagged with a `Sample` chip) — nothing else to configure.

Build and tests:

```shell
npm run build --workspace client   # vue-tsc + vite production build
npm run test --workspace server    # vitest (62 tests)
```

## Step 2 — Connect your website

1. Open the dashboard, click the **gear icon → PageSpeed** tab.
2. Enter the public URL of your site (e.g. `https://shop.example.com`), or set `PAGESPEED_API_KEY` in the environment for real user data.
3. Save. The PSI panels refresh with your site's lab metrics; if the site has enough Chrome UX Report traffic, the **Core Web Vitals (field data)** table fills in too.

## Step 3 — Connect your apps

Any frontend or backend can become a **Connected App** by reporting metrics to `POST /ingest`:

1. Click the **gear icon → Ingest** tab and **generate an Ingest Token** (the endpoint answers `503` until a token exists; wrong tokens get `403`).
2. Report metrics over HTTP from anywhere:

```shell
curl -X POST http://localhost:3000/ingest \
  -H "Authorization: Bearer <INGEST_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"app":"shop-api","metrics":[{"name":"checkout_latency_ms","value":132}]}'

# → 202 {"ok":true,"accepted":1,"rejected":0}
```

3. Or drop in the zero-dependency agents:

```html
<!-- Browser (RUM: FCP, LCP, CLS, INP, TTFB via PerformanceObserver, beaconed on pagehide) -->
<script src="http://localhost:3000/agent/vitalscope.js"
        data-app="web" data-url="http://localhost:3000" data-token="<INGEST_TOKEN>"></script>
```

```js
// Node (RSS, heap, event-loop lag + custom metrics)
import { initVitalscope } from './agent/node/vitalscope-node.js'
const vitalscope = initVitalscope({ app: 'shop-api', url: 'http://localhost:3000', token: '<INGEST_TOKEN>' })
vitalscope.metric('queue_depth', 7)
```

Every pushed metric is namespaced as `<app>.<name>`. Panels for new metrics appear **automatically** as Auto Panels in the **Connected apps** section (with an "Auto" chip) — no config edits needed.

## Integration example: shop-api

The repo ships a runnable simulation of the e-commerce backend above — it uses the real Node agent and pushes business metrics every 5 seconds:

```shell
VITALSCOPE_TOKEN=<INGEST_TOKEN> node examples/shop-api.mjs
```

What it does:

1. Loads the same agent a production backend would use (`agent/node/vitalscope-node.js`), configured via `VITALSCOPE_URL`, `VITALSCOPE_TOKEN` and `VITALSCOPE_APP` (all optional, with sensible defaults).
2. Simulates checkout latency (drifting 40–800 ms), queue depth (drifting integers) and cache hit ratio (60–100 %) with realistic noise, and reports them as `shop-api.checkout_latency_ms`, `shop-api.queue_depth`, `shop-api.cache_hit_pct`.
3. Pushes the agent's own process metrics too (`rss_mb`, `heap_used_mb`, `event_loop_lag_ms`) — six panels total appear under **Connected apps** within seconds:

```
✓ pushed 6 metrics (queue=4, latency=169 ms, cache=92.0 %)
```

4. **Keep the dashboard open while it runs** and watch the Auto Panels appear and drift.
5. If you stop the script, the Auto Panels keep showing the last reported values (staleness handling — e.g. marking metrics as unknown after they stop arriving — is on the roadmap).

To make one of those panels permanent (instead of synthesized on the fly), declare it in config — see below.

## Customize panels

Panels, sources and thresholds live in `dashboard.config.json`, shared by both layers. Example of a declared panel for a pushed metric:

```json
{
  "title": "Checkout latency",
  "description": "Latency of the checkout endpoint, as reported by the shop-api connected app.",
  "source": "pushed",
  "metric": "shop-api.checkout_latency_ms",
  "chart": "sparkstat",
  "granularity": "minute",
  "reduce": "avg",
  "unit": "ms",
  "refresh": 60,
  "span": 3,
  "section": "Connected apps",
  "lowerIsBetter": true,
  "thresholds": [
    { "color": "#4fac6e", "value": 0 },
    { "color": "#e0a12f", "value": 300 },
    { "color": "#e5544b", "value": 600 }
  ]
}
```

A declared panel on the same metric shadows its Auto Panel; auto panels are never written to config.

## Motivation

This project started as a charting exercise (see [the original brief](#original-project-charting-exercise) at the bottom) and grew into a real dashboard when each chart stopped being a demo and started answering a question: *is the site healthy right now, and by how much?*

The design goals that followed:

- **Declarative, not hardcoded** — every Panel, Source and threshold lives in a single `dashboard.config.json`, shared by both the client and the Gateway.
- **Trustworthy numbers** — every value carries its context: a healthy reference (e.g. *LCP ≤ 2.5 s*) with a cited source, thresholds with Grafana semantics, and a Delta Chip showing whether the last change was an improvement.
- **Zero-config observability** — a backend should be able to send its metrics with one line of code, and the dashboard should figure out the rest (Auto Panels).

## Architecture

```
chart-metric-dashboard/
├── client/                 # Vue 3 + Vuetify + Pinia SPA
│   └── src/
│       ├── api/            # tRPC client (httpBatchLink, types imported from server)
│       ├── components/     # StatPanel, SparkStatPanel, PanelChart, TablePanel, StatusRow…
│       └── stores/         # Pinia store: config, series polling, error aggregation
├── server/                 # Express + tRPC Gateway (CommonJS-style TS, tsx in dev, vitest)
│   └── src/
│       ├── trpc/           # router: config, series, settings (zod-validated inputs)
│       ├── sources/        # Source adapters: internal, ndjson, rest (PSI), virtual "pushed"
│       ├── aggregate/      # Granularity bucketing + Reduce
│       ├── metrics/        # Metrics Collector: ring buffers, self-sampling, push storage
│       ├── config/         # config/settings loading, Auto Panels synthesis
│       └── routes/         # /ingest, /agent/*, REST passthroughs
├── agent/                  # Drop-in browser and Node agents
├── examples/               # Runnable integrations (examples/shop-api.mjs)
├── dashboard.config.json   # Sources + Panels (committed)
└── dashboard.settings.json # Runtime settings (git-ignored)
```

Data flow: **Source → Adapter → Collector/aggregate → Gateway (tRPC) → Pinia store → Panel**.

- **Sources** are interchangeable data origins declared in config; each kind has an Adapter that materializes them as named `Series`. The internal adapter exposes the Metrics Collector's own health samples (latency, error rate, CPU, RAM, uptime) exactly like any external Source.
- The **Gateway** is a single Express server serving the tRPC router (queries validated with zod), the `POST /ingest` route, the agent scripts, and PSI proxy calls with caching.
- **Auto Panels** are synthesized at query time from the Collector's pushed-metric names; they are never written to config.
- The client polls `series` per Panel on the configured Refresh interval and aggregates panel errors into the app-bar error popover.

For the ingest design decision, see [ADR 0009](docs/adr/0009-push-ingest-connected-apps.md).

## Technologies

- **Client**: Vue 3.5, Vuetify 4, Pinia 4, ECharts 6 (via vue-echarts), tRPC client 11, Vite 8, TypeScript 6
- **Server**: Express 4, tRPC server 11, zod 3, date-fns 4, TypeScript 5/6-compatible, tsx (dev), Vitest 3
- **Agents**: zero-dependency ES modules (browser + Node)

## Original project (charting exercise)

It's just another test...

Dashboard with a few charts (lineSeriesChart, barChart) to display errors regarding a fake platform. (VueJS v2, D3/C3, Express).

### Assestment

We are going to request you to implement one common graphs on BI applications using D3 library. This should be able to display the information by day, week, month and year. We have data for two years.

### Demo

![](charting.gif)

### Installation and running the project

The project requires [Node.js](https://nodejs.org/) and [NPM](https://www.npmjs.com/) to run.

Clone the repository:

```shell
git clone https://github.com/christianjtr/charting.git
```

### Project setup

```
npm install
```

### Compiles and hot-reloads for development

```
npm run serve
```

### Compiles and minifies for production

```
npm run build
```

### Technologies

- Front-end:

  - Vue v2, Vuetify, Vuex, D3/C3, Axios, Sass.

- Back-end
  - Express, ndjson.
