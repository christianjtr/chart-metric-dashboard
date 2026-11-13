# Vitalscope — Web Vitals & Gateway Health Dashboard

> 🚧 **Status: Active Development & Testing**  
> This project is currently under active development as an evolution of a charting exercise. Features, configurations, and APIs may change while we test and refine the platform.

Vitalscope is a simple, self-hosted status page and health dashboard for your web projects. Instead of checking four different tools, it gives you one clean screen showing if your website is online, how fast it feels for real visitors, and whether your backend APIs are healthy.

![Vitalscope dashboard](docs/screenshot.png)

## Contents

1. [New to Telemetry? (A 1-Minute Primer)](#new-to-telemetry-a-1-minute-primer)
2. [The Ecosystem: Who is this for?](#the-ecosystem-who-is-this-for)
3. [Use Case: Monitoring an E-Commerce](#use-case-monitoring-an-e-commerce)
4. [Prerequisites](#prerequisites)
5. [Quick Start: Your First 5 Minutes](#quick-start-your-first-5-minutes)
6. [User Manual: Day-to-Day Usage](#user-manual-day-to-day-usage)
7. [Technical Reference: Config, Env Vars & Tokens](#technical-reference-config-env-vars--tokens)
8. [Motivation](#motivation)
9. [Architecture & Technologies](#architecture--technologies)
10. [Original Project (Charting Exercise)](#original-project-charting-exercise)

---

## New to Telemetry? (A 1-Minute Primer)

If you are new to observability, think of your web application as a car. You wouldn't drive on the highway without a dashboard showing your speed, fuel level, and check-engine light. **Telemetry** is simply collecting those signals from your app and showing them on a screen so you can spot problems before your users do.

Vitalscope collects these signals in two simple ways:
1. **Outside-in (PageSpeed / RUM):** Like a mechanic inspecting your car from the outside. It checks how fast your website actually loads and feels for visitors.
2. **Inside-out (Connected Apps / Ingest):** Like the car's internal computer. Your backend or frontend sends quick updates to Vitalscope saying things like *"My checkout queue has 5 items"* or *"I am using 50MB of memory"*.

*Confused by terms like RUM, Ingest, or Series? Check out our plain-English **[Glossary of Terms](docs/GLOSSARY.md)**.*

---

## The Ecosystem: Who is this for?

Vitalscope is built for **indie hackers, small engineering teams, and startups** who want robust observability without the steep pricing, heavy agents, or complex setups of enterprise tools like Datadog or New Relic.

This tool fits perfectly into your ecosystem if you are running:
* **Node.js Backends:** Express, Fastify, NestJS, or custom APIs.
* **Modern Frontends (SPA/SSR):** Vue, React, Astro, Next.js, or Nuxt.
* **Self-hosted Infrastructure:** VPS deployments (DigitalOcean, Hetzner, AWS EC2) where you want full ownership of your telemetry data.

If you want a single pane of glass that takes 5 minutes to set up and runs entirely on your own infrastructure, Vitalscope is for you.

---

## Use Case: Monitoring an E-Commerce

Imagine you run an online store with a website and a Node.js checkout API. Vitalscope answers four daily questions on a single screen:

- **Is the site up right now?** → The **STATUS** section shows minute-by-minute uptime bars for your site and gateway.
- **How fast is it for real people?** → The **HEALTH** section displays Google Lighthouse and real-user Web Vitals, color-coded (green, yellow, red) so you immediately know if things are good or slow.
- **Is my backend healthy?** → Your API reports its own numbers (like checkout speed or active users), and charts appear automatically.
- **Is anything broken?** → If a data source fails, errors are grouped into a single alert icon at the top instead of leaving you staring at broken charts.

---

## Prerequisites

Before running the project, ensure you have the following installed on your local machine or server:
* **[Node.js](https://nodejs.org/)**: Version 18.x or 20.x+ recommended.
* **Git**: To clone the repository.
* **Google PageSpeed API Key (Optional but recommended):** Required if you want to track real-world frontend performance (CrUX) for your URLs without falling back to sample data.

---

## Quick Start: Your First 5 Minutes

Ready to try it? Let's get the dashboard running and send your first metric. 

### Step 1: Start the Dashboard
Clone the project, install dependencies, and start the local server:

```shell
git clone [https://github.com/christianjtr/chart-metric-dashboard.git](https://github.com/christianjtr/chart-metric-dashboard.git)
cd chart-metric-dashboard
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. It starts immediately using **Sample Data** (marked with a `Sample` badge) so you can explore the interface right away.

### Step 2: Monitor your Website's Speed
1. Click the **gear icon (⚙️)** in the top-right corner to open Settings.
2. Go to the **PageSpeed** tab, enter your public website URL (e.g., `https://shop.example.com`), and click **Save**.
*(Note: Without a Google PageSpeed API key, panels will stay on Sample Data. See the [Technical Reference](#technical-reference-config-env-vars--tokens) below to add your key).*

### Step 3: Create your Security Key (Ingest Token)
To let your apps send data safely to the dashboard, you need to generate a password token:
1. Open Settings (⚙️) → **Ingest** tab.
2. Click **Generate**, copy the token, and click **Save**.

### Step 4: Send your First Metric
Let's pretend one of your apps is sending data. Open a new terminal window and run this command (replace `<YOUR_TOKEN>` with the one you just copied):

```shell
curl -X POST http://localhost:3000/ingest \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"app":"my-api","metrics":[{"name":"active_users","value":42}]}'
```

**Look at the dashboard!** A brand-new chart panel appears automatically under **Connected apps**. Zero configuration needed.

*(Want to see a more realistic demo? Run `VITALSCOPE_TOKEN=<YOUR_TOKEN> node examples/shop-api.mjs` to simulate a live store sending 6 metrics every 5 seconds).*

---

## User Manual: Day-to-Day Usage

Once you have tested the Quick Start, here is how to connect your real projects and customize the screen.

### 1. Reading the Interface
* **Global Status Banner:** Appears at the top of the screen and turns red if any monitored service goes down.
* **Delta Chips (▲/▼):** Small badges next to numbers showing if performance improved (green) or got worse (red) compared to the previous check.
* **Error Popover:** Quietly collects connection errors inside the top bar's warning icon so your screen stays clean.

### 2. Connect your Frontend (Real User Monitoring)
To measure how fast your website loads on your visitors' actual phones and laptops, paste this tiny script just before the closing `</head>` tag of your HTML:

```html
<script src="http://localhost:3000/agent/vitalscope.js"
        data-app="web" 
        data-url="http://localhost:3000" 
        data-token="<YOUR_INGEST_TOKEN>"></script>
```
*It runs silently in the background and sends performance stats when the user leaves the page, without slowing down your site.*

### 3. Connect your Node.js Backend
To track server memory, CPU lag, and custom business metrics (like orders or signups), import the zero-dependency Node agent in your backend:

```javascript
import { initVitalscope } from './agent/node/vitalscope-node.js'

// Starts tracking server RAM and health automatically
const vitalscope = initVitalscope({ 
  app: 'shop-api', 
  url: 'http://localhost:3000', 
  token: '<YOUR_INGEST_TOKEN>' 
})

// Send custom metrics from anywhere in your code
vitalscope.metric('orders_processed', 1)
```

### 4. Make an Auto Panel Permanent
Whenever you send a new metric, Vitalscope creates a temporary **Auto Panel** with default settings. To customize its colors, limits, or size, declare it permanently in `dashboard.config.json`:

```json
{
  "title": "Active Users",
  "description": "Live users currently active on the platform.",
  "source": "pushed",
  "metric": "my-api.active_users",
  "chart": "sparkstat",
  "granularity": "minute",
  "reduce": "avg",
  "refresh": 60,
  "span": 3,
  "section": "Connected apps",
  "lowerIsBetter": false,
  "thresholds": [
    { "color": "#4fac6e", "value": 0 },
    { "color": "#e0a12f", "value": 50 }
  ]
}
```
*Save the file and refresh the browser. Your custom panel replaces the temporary one.*

---

## Technical Reference: Config, Env Vars & Tokens

**Design decision:** Structure (Sources, Panels, thresholds) lives in `dashboard.config.json` and is committed to Git (see [ADR 0002](docs/adr/0002-config-driven-dashboard.md)). Secrets and runtime settings live in `dashboard.settings.json` and are git-ignored (see [ADR 0009](docs/adr/0009-push-ingest-connected-apps.md)).

### Environment Variables

The gateway does **not** automatically load `.env` files. Pass variables directly when starting the server (e.g., `PAGESPEED_API_KEY='xyz' npm run dev`):

| Name | Scope | Default | What it controls | If omitted |
| --- | --- | --- | --- | --- |
| `PORT` | Gateway | `3000` | HTTP port for tRPC, ingest, and agent scripts. | Listens on 3000. Changing it requires updating Vite proxy and agent URLs. |
| `DASHBOARD_CONFIG` | Gateway | `dashboard.config.json` | Path to the shared Sources/Panels definition. | Searches upward from working directory. Missing/invalid config fails requests. |
| `DASHBOARD_SETTINGS` | Gateway | `dashboard.settings.json` | Path used to read and save runtime settings. | Searches upward from working directory. Missing file loads empty settings. |
| `PAGESPEED_API_KEY` | Gateway | Unset | API key for live PageSpeed requests (fallback if not saved in UI). | Uses saved UI key; if neither exists, returns Sample Data. |
| `psiTargetUrl` | Gateway | Unset | Fallback target URL if absent from UI Settings. | Uses saved UI URL. Fails if key is present but no URL is found. |
| `EXTERNAL_API_KEY` | Gateway | Empty string | `Authorization` header for the placeholder `external-api` source. | Resolves to empty header. |
| `VITALSCOPE_URL` | Node agent | `http://localhost:3000` | Gateway base URL for metric reports. | Reports to local gateway. |
| `VITALSCOPE_TOKEN` | Node agent | Empty string | Ingest token sent with each report. | Agent skips sending; `shop-api` example exits with error. |
| `VITALSCOPE_APP` | Node agent | `node-app` | Namespace prefix for pushed metric names. | Uses default app name. |

### Tokens & API Keys

| Credential | Purpose | How to configure | Behavior |
| --- | --- | --- | --- |
| `ingestToken` | Secures `POST /ingest` against unauthorized data submissions. | Settings → Ingest → Generate → copy → **Save**. | No token saved: `503`. Wrong token: `403`. Valid: `202`. Accepts `Bearer` header or `?token=`. |
| `PAGESPEED_API_KEY` | Authenticates live requests to Google PageSpeed Insights. | Settings → PageSpeed, or via environment variable (UI setting wins). | No key: returns Sample Data. Invalid key/quota error: surfaces error on panel. |

### Browser Agent Attributes (`<script>` tag)

| Attribute | Default | What it controls | If omitted |
| --- | --- | --- | --- |
| `data-url` | Empty string | Gateway base URL (no trailing slash). | Sends to `/ingest` on the current page's origin. |
| `data-app` | `web` | Metric namespace prefix (e.g., `web.lcp_ms`). | Uses `web`. |
| `data-token` | Empty string | The gateway's saved ingest token. | Rejected by gateway (`403` or `503`). |

### Config Files & Security Notes for Deployment

* **Git Policy:** Commit `dashboard.config.json` (use `env:NAME` or `setting:NAME` instead of raw secrets). Never commit `dashboard.settings.json` or `.env.local` files.
* **Authentication:** The dashboard has no built-in user login. In production, place it behind a VPN, private network, or an authenticated reverse proxy (like Nginx/Cloudflare Access).
* **CORS & HTTPS:** CORS is currently open (`*`). Always use HTTPS in production so ingest tokens aren't exposed in transit, and rotate your ingest token in Settings after public demos.

---

## Motivation

This project started as a charting exercise (see [the original project](#original-project-charting-exercise) below) and grew into a real dashboard when each chart stopped being a demo and started answering a real question: *is the site healthy right now, and by how much?*

The design goals that followed:

- **Declarative, not hardcoded** — Every Panel, Source, and threshold lives in a single `dashboard.config.json`, shared by both the client and the Gateway.
- **Trustworthy numbers** — Every value carries its context: a healthy reference (e.g., *LCP ≤ 2.5 s*) with a cited source, thresholds with Grafana semantics, and a Delta Chip showing whether the last change was an improvement.
- **Zero-config observability** — A backend should be able to send its metrics with one line of code, and the dashboard should figure out the rest (Auto Panels).

---

## Architecture & Technologies

### Folder Structure
```text
chart-metric-dashboard/
├── client/                 # Vue 3 + Vuetify + Pinia frontend SPA
├── server/                 # Express + tRPC Gateway & Metrics Collector
├── agent/                  # Zero-dependency browser & Node agents
├── examples/               # Runnable demo scripts (shop-api.mjs)
├── docs/                   # Glossary & Architecture Decision Records (ADRs)
├── dashboard.config.json   # Shared panel & source layout (committed)
└── dashboard.settings.json # Runtime settings & secrets (git-ignored)
```

### Data Flow & Stack
**Data Flow:** `Source → Adapter → Collector/Aggregate → Gateway (tRPC) → Pinia Store → Panel`

* **Frontend:** Vue 3.5, Vuetify 4, Pinia 4, ECharts 6, tRPC Client 11, Vite 8, TypeScript.
* **Backend:** Express 4, tRPC Server 11, Zod 3, date-fns 4, Vitest 3 (`npm run test --workspace server`).
* **Build:** `npm run build --workspace client`

---

## Original Project (Charting Exercise)

This project evolved from a technical assessment built with **Vue v2, Vuetify, D3/C3, and Express (`ndjson`)**. The original goal was to implement common BI graphs (`lineSeriesChart`, `barChart`) capable of displaying fake platform errors aggregated by day, week, month, and year across two years of historical data.

You can check out the original repository at [christianjtr/charting](https://github.com/christianjtr/charting).

![Original charting demo](charting.gif)
