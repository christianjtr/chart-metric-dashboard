import express from 'express'
import cors from 'cors'
import * as trpcExpress from '@trpc/server/adapters/express'
import { appRouter } from './trpc/router'
import { ingestRouter } from './routes/ingest'
import { agentRouter } from './routes/agent'

const app = express()

app.use(cors())

app.use(ingestRouter())
app.use(agentRouter())

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({})
  })
)

const PORT = Number(process.env.PORT ?? 3000)
app.listen(PORT, () => {
  console.log(`Gateway listening on http://localhost:${PORT}/trpc`)
})
