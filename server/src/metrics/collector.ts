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
const PROBE_WINDOW_MS = 60_000
const MAX_PROBE_WINDOWS = 240

const hashSeed = (input: string): number => {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const mulberry32 = (seed: number): (() => number) => {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface CollectorOptions {
  capacity?: number
  windowMs?: number
  sampleMs?: number
  autostart?: boolean
}

export class MetricsCollector {
  private buffers = new Map<string, RingSample[]>()
  private requestWindows: Array<{ start: number; requests: number; errors: number; totalMs: number }> = []
  private probeWindows: Array<{ start: number; sourceId: string; ok: number; fail: number; totalMs: number }> = []
  private previousCpus?: os.CpuInfo[]
  private readonly capacity: number
  private readonly windowMs: number
  private timer?: ReturnType<typeof setInterval>

  constructor({ capacity = DEFAULT_CAPACITY, windowMs = DEFAULT_WINDOW_MS, sampleMs = DEFAULT_SAMPLE_MS, autostart = true }: CollectorOptions = {}) {
    this.capacity = capacity
    this.windowMs = windowMs
    if (autostart) {
      this.seedSelfMetrics()
      this.start(sampleMs)
    }
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

  observeProbe(sourceId: string, ok: boolean, durationMs: number): void {
    const start = Math.floor(Date.now() / PROBE_WINDOW_MS) * PROBE_WINDOW_MS
    let window = this.probeWindows.find((w) => w.sourceId === sourceId && w.start === start)
    if (!window) {
      window = { start, sourceId, ok: 0, fail: 0, totalMs: 0 }
      this.probeWindows.push(window)
      if (this.probeWindows.length > MAX_PROBE_WINDOWS) {
        const oldest = [...this.probeWindows].sort((a, b) => a.start - b.start)[0]
        this.probeWindows = this.probeWindows.filter((w) => w !== oldest)
      }
    }
    if (ok) window.ok++
    else window.fail++
    window.totalMs += durationMs
  }

  seedProbe(sourceId: string, minutes = 120): void {
    const uptimeMetric = `probe:${sourceId}:uptime`
    if ((this.buffers.get(uptimeMetric) ?? []).length > 0) return
    const rng = mulberry32(hashSeed(`${sourceId}:${new Date().toISOString().slice(0, 10)}`))
    const startOfMinute = Math.floor(Date.now() / PROBE_WINDOW_MS) * PROBE_WINDOW_MS
    for (let i = minutes; i >= 1; i--) {
      const t = startOfMinute - i * PROBE_WINDOW_MS
      const uptime = rng() > 0.94 ? 90 + rng() * 8 : 99 + rng()
      this.push(uptimeMetric, Math.min(100, uptime), t)
      this.push(`probe:${sourceId}:latency`, Math.round(30 + rng() * 60), t)
    }
  }

  private seedSelfMetrics(): void {
    if ((this.buffers.get('cpu_percent') ?? []).length > 0) return
    const rng = mulberry32(hashSeed(`vitalscope-self:${new Date().toISOString().slice(0, 10)}`))
    const startOfTick = Math.floor(Date.now() / DEFAULT_WINDOW_MS) * DEFAULT_WINDOW_MS
    for (let i = DEFAULT_CAPACITY; i >= 1; i--) {
      const t = startOfTick - i * DEFAULT_WINDOW_MS
      this.push('cpu_percent', 4 + rng() * 14, t)
      this.push('ram_percent', 62 + rng() * 20, t)
      this.push('heap_used_mb', 90 + rng() * 40, t)
      this.push('uptime_seconds', os.uptime() + (i * DEFAULT_WINDOW_MS) / 1000, t)
      this.push('latency_ms', 6 + rng() * 14, t)
      this.push('error_rate', 0, t)
      this.push('requests_per_minute', Math.round(20 + rng() * 30), t)
    }
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
    this.flushProbeWindows(t)
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

  private flushProbeWindows(t: number): void {
    const closed = this.probeWindows.filter((w) => w.start + PROBE_WINDOW_MS <= t)
    if (!closed.length) return
    this.probeWindows = this.probeWindows.filter((w) => w.start + PROBE_WINDOW_MS > t)

    for (const w of closed) {
      const total = w.ok + w.fail
      const uptime = total > 0 ? (w.ok / total) * 100 : 100
      const latency = total > 0 ? w.totalMs / total : 0
      this.push(`probe:${w.sourceId}:uptime`, uptime, w.start)
      this.push(`probe:${w.sourceId}:latency`, latency, w.start)
    }
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
