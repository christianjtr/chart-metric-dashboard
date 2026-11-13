# Vitalscope — Web Vitals & Gateway Health Dashboard

Vitalscope is a self-hosted status page and health dashboard for a web platform: it shows live availability, frontend Web Vitals measured by [Google PageSpeed Insights](https://developers.google.com/speed/pagespeed/insights/), gateway self-metrics, and metrics pushed by any Connected App through a plug-and-play ingest endpoint.

![Vitalscope dashboard](docs/screenshot.png)

## Motivation

This project started as a charting exercise (see [the original brief](#original-project-charting-exercise) at the bottom) and grew into a real dashboard when each chart stopped being a demo and started answering a question: *is the site healthy right now, and by how much?*

The design goals that followed:

- **Declarative, not hardcoded** — every Panel, Source and threshold lives in a single `dashboard.config.json`, shared by both the client and the Gateway.
- **Trustworthy numbers** — every value carries its context: a healthy reference (e.g. *LCP ≤ 2.5 s*) with a cited source, thresholds with Grafana semantics, and a Delta Chip showing whether the last change was an improvement.
- **Zero-config observability** — a backend should be able to send its metrics with one line of code, and the dashboard should figure out the rest (Auto Panels).

## Features

- **Status page** — Better Stack-style uptime strips (one colored segment per minute bucket, last 2 hours) with a global status banner computed as the worst status across probes.
- **Health panels** — four panel types: `stat`, `sparkstat` (value + sparkline + delta chip), `chart` (line/bar series), and `table`.
- **Web Vitals** — PSI *lab* data (Lighthouse) and *Field Data (CrUX)*, rendered as curated Web Vitals Tables: detected value colored good/warn/poor, recommended value, and cited source (web.dev, Lighthouse).
- **Plug-and-play ingest** — `POST /ingest` with a token; Connected Apps report metrics with drop-in browser/Node agents, and panels are auto-created for every new metric (Auto Panels).
- **Sample data fallback** — when a Source has no data yet (no PSI API key, empty buffers), the Gateway returns clearly flagged Sample Data instead of an empty dashboard.
- **Dark theme** — a custom `sentryDark` Vuetify theme (surface `#1c1c26`, primary `#7a6ff0`) tuned for long monitoring sessions.

## Getting started

Requires [Node.js](https://nodejs.org/) and [NPM](https://www.npmjs.com/).

```shell
git clone https://github.com/christianjtr/chart-metric-dashboard.git
cd chart-metric-dashboard
npm install
```

Run the Gateway (Express + tRPC, port 3000) and the dashboard (Vite, port 5173):

```shell
npm run dev
```

Build and tests:

```shell
npm run build --workspace client   # vue-tsc + vite production build
npm run test --workspace server    # vitest (62 tests)
```

Optional: set `PAGESPEED_API_KEY` in the environment (or in `dashboard.settings.json` via Settings → PageSpeed) to fetch real PSI data; without it the dashboard runs on Sample Data.

## Sending metrics from your apps

1. In the dashboard UI, open **Settings → Ingest** and generate an Ingest Token (the endpoint is disabled with a `503` until a token exists).
2. Report metrics over HTTP from anywhere:

```shell
curl -X POST http://localhost:3000/ingest \
  -H "Authorization: Bearer <INGEST_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"app":"shop-api","metrics":[{"name":"checkout_latency_ms","value":132}]}'
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

Every pushed metric is namespaced as `<app>.<name>` and, if no Panel is declared for it, appears automatically as an Auto Panel in the **Connected apps** section (with an "Auto" chip). Declaring a panel for the same metric in `dashboard.config.json` shadows the Auto Panel.

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
