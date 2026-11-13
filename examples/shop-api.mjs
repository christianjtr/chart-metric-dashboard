#!/usr/bin/env node
// Example: a fake "shop-api" backend reporting metrics to Vitalscope.
//
//   VITALSCOPE_URL=http://localhost:3000 \
//   VITALSCOPE_TOKEN=<your ingest token> \
//   node examples/shop-api.mjs
//
// Generate the token in the dashboard UI: Settings → Ingest.
// While this script runs, Auto Panels appear under "Connected apps"
// for every metric it pushes (plus the agent's process metrics).

import { initVitalscope } from '../agent/node/vitalscope-node.js'

const url = process.env.VITALSCOPE_URL ?? 'http://localhost:3000'
const token = process.env.VITALSCOPE_TOKEN ?? ''
const app = process.env.VITALSCOPE_APP ?? 'shop-api'

if (!token) {
  console.error(`Missing VITALSCOPE_TOKEN.

  1. Open the dashboard (${url.replace(':3000', ':5173')})
  2. Settings (gear icon) → Ingest tab
  3. Generate and copy the token, then run:

     VITALSCOPE_TOKEN=<token> node examples/shop-api.mjs`)
  process.exit(1)
}

const vitalscope = initVitalscope({ app, url, token, intervalMs: 5_000 })

// --- simulated shop-api internals ------------------------------------
let latency = 120
let queue = 3
let cacheHit = 92

const tick = () => {
  latency = Math.max(40, Math.min(800, latency + (Math.random() - 0.45) * 40))
  queue = Math.max(0, Math.round(queue + (Math.random() - 0.5) * 2))
  cacheHit = Math.max(60, Math.min(100, cacheHit + (Math.random() - 0.5) * 2))

  vitalscope.metric('checkout_latency_ms', Math.round(latency))
  vitalscope.metric('queue_depth', queue)
  vitalscope.metric('cache_hit_pct', Math.round(cacheHit * 10) / 10)
}

console.log(`Reporting metrics as "${app}" to ${url} every 5 s — Ctrl+C to stop.`)
console.log('Watch the "Connected apps" section of the dashboard for auto-created panels.\n')

await tick()

for (;;) {
  await tick()
  const res = await vitalscope.report()
  if (res?.ok) {
    const body = await res.json().catch(() => undefined)
    console.log(`✓ pushed ${body?.accepted ?? '?'} metrics (queue=${queue}, latency=${Math.round(latency)} ms, cache=${cacheHit.toFixed(1)} %)`)
  } else {
    console.error(`✗ push failed${res ? ` (${res.status})` : ' — is the gateway running at ' + url + '?'} — retrying in 5 s`)
  }
  await new Promise((r) => setTimeout(r, 5_000))
}
