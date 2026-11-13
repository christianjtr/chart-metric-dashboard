import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { resolveRootFile } from './paths.js'

// npm workspaces: scripts run with cwd = server/, so the repo root is one level up
const ROOT = path.resolve(process.cwd(), '..')
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitalscope-paths-'))
const originalCwd = process.cwd()

afterAll(() => {
  process.chdir(originalCwd)
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe('resolveRootFile', () => {
  it('finds the root config when cwd is the repo root', () => {
    process.chdir(ROOT)
    expect(resolveRootFile('DASHBOARD_CONFIG', 'dashboard.config.json')).toBe(
      path.join(ROOT, 'dashboard.config.json')
    )
  })

  it('finds the root config by walking up when cwd is server/', () => {
    process.chdir(path.join(ROOT, 'server'))
    expect(resolveRootFile('DASHBOARD_CONFIG', 'dashboard.config.json')).toBe(
      path.join(ROOT, 'dashboard.config.json')
    )
  })

  it('env var override wins over find-up', () => {
    process.chdir(tempDir)
    const custom = path.join(tempDir, 'custom.json')
    fs.writeFileSync(custom, '{}')
    process.env.DASHBOARD_CONFIG = custom
    try {
      expect(resolveRootFile('DASHBOARD_CONFIG', 'dashboard.config.json')).toBe(custom)
    } finally {
      delete process.env.DASHBOARD_CONFIG
    }
  })

  it('falls back to cwd-relative path when the file is nowhere up the tree', () => {
    process.chdir(tempDir)
    expect(resolveRootFile('DASHBOARD_SETTINGS', 'dashboard.settings.json')).toBe(
      path.join(process.cwd(), 'dashboard.settings.json')
    )
  })
})
