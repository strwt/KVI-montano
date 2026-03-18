import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import bootstrapHandler from './api/admin/bootstrap.js'
import createUserHandler from './api/admin/create-user.js'
import updateUserHandler from './api/admin/update-user.js'
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
    ['/api/admin/update-user', updateUserHandler],
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
export default defineConfig(({ mode }) => {
  // Vite loads `.env*` into `import.meta.env` for the browser bundle, but our dev API handlers
  // run in the Node dev server and expect `process.env.*` like Vercel serverless.
  const env = loadEnv(mode, process.cwd(), '')

  process.env.SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || ''
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || ''
  process.env.BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET || env.BOOTSTRAP_SECRET || ''

  return {
    plugins: [react(), tailwindcss(), devApiPlugin()],
  }
})
