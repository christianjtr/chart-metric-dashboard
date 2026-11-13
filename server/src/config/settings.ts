import fs from 'node:fs'
import { z } from 'zod'
import { resolveRootFile } from './paths'

export const DashboardSettingsSchema = z.object({
  psiTargetUrl: z.string().url().optional(),
  PAGESPEED_API_KEY: z.string().min(1).optional(),
  ingestToken: z.string().min(16).max(128).optional()
})

export type DashboardSettings = z.infer<typeof DashboardSettingsSchema>

const settingsPath = (): string => resolveRootFile('DASHBOARD_SETTINGS', 'dashboard.settings.json')

export const loadSettings = (): DashboardSettings => {
  const absolute = settingsPath()
  if (!fs.existsSync(absolute)) return {}
  try {
    return DashboardSettingsSchema.parse(JSON.parse(fs.readFileSync(absolute, 'utf8')))
  } catch {
    return {}
  }
}

export const saveSettings = (settings: DashboardSettings): DashboardSettings => {
  const parsed = DashboardSettingsSchema.parse(settings)
  fs.writeFileSync(settingsPath(), JSON.stringify(parsed, null, 2))
  return parsed
}

export const resolveSetting = (key: string): string | undefined =>
  loadSettings()[key as keyof DashboardSettings]
