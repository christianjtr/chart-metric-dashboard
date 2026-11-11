import fs from 'node:fs'
import path from 'node:path'
import { DashboardConfigSchema, type DashboardConfig } from '../schemas/config'
import { resolveEnvRefs } from './env'

export const loadConfig = (configPath: string): DashboardConfig => {
  const absolutePath = path.resolve(configPath)
  const raw = JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as Record<string, unknown>

  // env: refs are resolved eagerly only in source headers; params keep their
  // env:/setting: prefixes so the REST adapter can resolve them per request.
  const sources = Array.isArray(raw.sources)
    ? raw.sources.map((source) => {
        const typed = source as { headers?: Record<string, string> }
        return typed.headers ? { ...typed, headers: resolveEnvRefs(typed.headers) } : source
      })
    : raw.sources

  return DashboardConfigSchema.parse({ ...raw, sources })
}
