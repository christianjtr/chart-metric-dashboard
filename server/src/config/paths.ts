import fs from 'node:fs'
import path from 'node:path'

const findUp = (startDir: string, fileName: string): string | undefined => {
  let dir = startDir
  for (;;) {
    const candidate = path.join(dir, fileName)
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

export const resolveRootFile = (envVar: string, defaultName: string): string => {
  const override = process.env[envVar]
  if (override) return path.resolve(override)
  const fromCwd = findUp(process.cwd(), defaultName)
  if (fromCwd) return fromCwd
  return path.resolve(defaultName)
}
