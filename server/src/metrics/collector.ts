import os from 'node:os'
import process from 'node:process'

export interface RingSample {
  t: number
  value: number
}

const DEFAULT_CAPACITY = 720
const DEFAULT_WINDOW_MS = 10_000
const DEFAULT_SAMPLE_MS = 10_000
const MAX_REQUEST_WINDOWS = 12

export interface CollectorOptions {
  capacity?: number
  windowMs?: number
  sampleMs?: number
  autostart?: boolean
}

export class MetricsCollector {
  private buffers = new Map<string, RingSample[]>()
  private requestWindows: Array<{ start: number; requests: number; errors: number; totalMs: number }> = []
  private previousCpus?: os.CpuInfo[]
  private readonly capacity: number
  private readonly windowMs: number
  private timer?: ReturnType<typeof setInterval>

  constructor({ capacity = DEFAULT_CAPACITY, windowMs = DEFAULT_WINDOW_MS, sampleMs = DEFAULT_SAMPLE_MS, autostart = true }: CollectorOptions = {}) {
    this.capacity = capacity
    this.windowMs = windowMs
    if (autostart) this.start(sampleMs)
  }

  start(sampleMs = DEFAULT_SAMPLE_MS): void {
    if (this.timer) return
    this.timer = setInterval(() => this.sample(), sampleMs)
    this.timer.unref?.()
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }

  observeRequest(_path: string, ok: boolean, durationMs: number): void {
    const start = Math.floor(Date.now() / this.windowMs) * this.windowMs
    let window = this.requestWindows[this.requestWindows.length - 1]
    if (!window || window.start !== start) {
      window = { start, requests: 0, errors: 0, totalMs: 0 }
      this.requestWindows.push(window)
      if (this.requestWindows.length > MAX_REQUEST_WINDOWS) this.requestWindows.shift()
    }
    window.requests++
    if (!ok) window.errors++
    window.totalMs += durationMs
  }

  getMetric(name: string): RingSample[] {
    return [...(this.buffers.get(name) ?? [])]
  }

  push(name: string, value: number, t = Date.now()): void {
    const samples = this.buffers.get(name) ?? []
    samples.push({ t, value })
    if (samples.length > this.capacity) samples.shift()
    this.buffers.set(name, samples)
  }

  sample(): void {
    const t = Date.now()
    this.flushRequestWindows(t)
    this.push('cpu_percent', this.sampleCpu(), t)
    this.push('ram_percent', ((os.totalmem() - os.freemem()) / os.totalmem()) * 100, t)
    this.push('heap_used_mb', process.memoryUsage().heapUsed / 1024 / 1024, t)
    this.push('uptime_seconds', os.uptime(), t)
  }

  private flushRequestWindows(t: number): void {
    const closed = this.requestWindows.filter((w) => w.start + this.windowMs <= t)
    if (!closed.length) return
    this.requestWindows = this.requestWindows.filter((w) => w.start + this.windowMs > t)

    let requests = 0
    let errors = 0
    let totalMs = 0
    for (const w of closed) {
      requests += w.requests
      errors += w.errors
      totalMs += w.totalMs
    }

    this.push('latency_ms', requests > 0 ? totalMs / requests : 0, t)
    this.push('error_rate', requests > 0 ? (errors / requests) * 100 : 0, t)
    this.push('requests_per_minute', requests, t)
  }

  private sampleCpu(): number {
    const cpus = os.cpus()
    if (!this.previousCpus) {
      this.previousCpus = cpus
      return 0
    }

    let idle = 0
    let total = 0
    for (let i = 0; i < cpus.length; i++) {
      const cur = cpus[i].times
      const prev = this.previousCpus[i]?.times
      if (!prev) continue
      const cpuTotal =
        cur.user - prev.user + cur.nice - prev.nice + cur.sys - prev.sys + cur.idle - prev.idle + cur.irq - prev.irq
      const cpuIdle = cur.idle - prev.idle
      total += cpuTotal
      idle += cpuIdle
    }
    this.previousCpus = cpus
    if (total <= 0) return 0
    return Math.min(100, Math.max(0, 100 - (idle / total) * 100))
  }
}

export const metricsCollector = new MetricsCollector()
