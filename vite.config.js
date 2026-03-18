import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import bootstrapHandler from './api/admin/bootstrap.js'
import createUserHandler from './api/admin/create-user.js'
import healthHandler from './api/health.js'

const collectRawBody = async (req) => {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined

  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (chunks.length === 0) return undefined
  return Buffer.concat(chunks)
}

const attachJsonHelpers = (res) => {
  res.status = (code) => {
    res.statusCode = code
    return res
  }

  res.json = (payload) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
    }
    res.end(JSON.stringify(payload))
    return res
  }

  return res
}

const devApiPlugin = () => {
  const routes = new Map([
    ['/api/health', healthHandler],
    ['/api/admin/bootstrap', bootstrapHandler],
    ['/api/admin/create-user', createUserHandler],
  ])

  return {
    name: 'kusgan-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? new URL(req.url, 'http://localhost') : null
        const handler = url ? routes.get(url.pathname) : null

        if (!handler) {
          next()
          return
        }

        try {
          req.body = await collectRawBody(req)
          attachJsonHelpers(res)
          await handler(req, res)
        } catch (error) {
          server.ssrFixStacktrace(error)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ message: error?.message || 'Dev API error.' }))
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
})
