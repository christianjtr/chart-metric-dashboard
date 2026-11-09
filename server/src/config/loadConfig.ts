import fs from 'node:fs'
import path from 'node:path'
import { DashboardConfigSchema, type DashboardConfig } from '../schemas/config'
import { resolveEnvRefs } from './env'

export const loadConfig = (configPath: string): DashboardConfig => {
  const absolutePath = path.resolve(configPath)
  const raw = JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
  return DashboardConfigSchema.parse(resolveEnvRefs(raw))
}
