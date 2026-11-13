import { monitorEventLoopDelay } from 'node:perf_hooks'

const DEFAULT_URL = 'http://localhost:3000'

export function initVitalscope(options = {}) {
  const url = (options.url ?? process.env.VITALSCOPE_URL ?? DEFAULT_URL).replace(/\/+$/, '')
  const app = options.app ?? process.env.VITALSCOPE_APP ?? 'node-app'
  const token = options.token ?? process.env.VITALSCOPE_TOKEN ?? ''
  const intervalMs = options.intervalMs ?? 15_000

  const histogram = monitorEventLoopDelay({ resolution: 20 })
  histogram.enable()

  const custom = new Map()

  async function report() {
    const metrics = [
      { name: 'rss_mb', value: Math.round(process.memoryUsage.rss() / 1024 / 1024) },
      { name: 'heap_used_mb', value: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) },
      { name: 'event_loop_lag_ms', value: Number.isFinite(histogram.mean) ? Math.round(histogram.mean / 1e6 * 100) / 100 : 0 }
    ]
    for (const [name, value] of custom) metrics.push({ name, value })
    if (!token) return
    try {
      return await fetch(url + '/ingest?token=' + encodeURIComponent(token), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ app, metrics })
      })
    } catch {
      // Keep the agent silent: a down dashboard must never break the host app.
    }
  }

  const timer = setInterval(report, intervalMs)
  timer.unref?.()

  return {
    metric(name, value) {
      custom.set(String(name), Number(value))
    },
    report,
    stop() {
      clearInterval(timer)
      histogram.disable()
    }
  }
}
