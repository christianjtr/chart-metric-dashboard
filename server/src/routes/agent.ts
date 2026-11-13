import fs from 'node:fs'
import path from 'node:path'
import express from 'express'

const AGENT_FILES: Record<string, string> = {
  '/agent/vitalscope.js': 'vitalscope.js',
  '/agent/vitalscope-node.js': 'node/vitalscope-node.js'
}

const agentDir = (): string => {
  const candidates = [path.resolve(process.cwd(), '..', 'agent'), path.resolve(process.cwd(), 'agent')]
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'vitalscope.js'))) return dir
  }
  return candidates[0]
}

export const agentRouter = () => {
  const router = express.Router()
  for (const [route, file] of Object.entries(AGENT_FILES)) {
    router.get(route, (_req, res) => {
      const full = path.join(agentDir(), file)
      if (!fs.existsSync(full)) {
        res.status(404).json({ error: 'Agent script not found' })
        return
      }
      res.type('application/javascript').send(fs.readFileSync(full, 'utf8'))
    })
  }
  return router
}
