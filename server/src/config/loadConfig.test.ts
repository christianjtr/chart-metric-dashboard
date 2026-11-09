import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { loadConfig } from './loadConfig'

// npm workspaces: scripts run with cwd = server/, so the repo root is one level up
const ROOT = path.resolve(process.cwd(), '..')

describe('loadConfig', () => {
  it('loads and validates the root dashboard config', () => {
    const config = loadConfig(path.join(ROOT, 'dashboard.config.json'))
    expect(config.sources).toHaveLength(2)
    expect(config.sources[0].id).toBe('platform-errors')
    expect(config.panels).toHaveLength(2)
    expect(config.panels[0].granularity).toBe('day')
    expect(config.panels[0].refresh).toBe(60)
  })

  it('applies panel defaults (metric, granularity, refresh)', () => {
    const config = loadConfig(path.join(ROOT, 'dashboard.config.json'))
    const secondPanel = config.panels[1]
    expect(secondPanel.refresh).toBe(60)
    expect(secondPanel.metric).toBe('count')
  })

  it('rejects invalid config shapes', () => {
    const bad = path.join(ROOT, 'server/src/config/__fixtures__/invalid-config.json')
    expect(() => loadConfig(bad)).toThrow()
  })

  it('rejects unknown adapter kinds', () => {
    const bad = path.join(ROOT, 'server/src/config/__fixtures__/unknown-adapter.json')
    expect(() => loadConfig(bad)).toThrow()
  })
})
