import { createClient } from '@supabase/supabase-js'

/* global process, Buffer */

const readRequestBody = async (req, maxBytes) => {
  if (Buffer.isBuffer(req.body)) return req.body
  if (req.body instanceof ArrayBuffer) return Buffer.from(req.body)
  if (typeof req.body === 'string') return Buffer.from(req.body)

  const chunks = []
  let total = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buf.length
    if (maxBytes && total > maxBytes) throw new Error('Body is too large.')
    chunks.push(buf)
  }

  return chunks.length ? Buffer.concat(chunks) : Buffer.from([])
}

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
  const buffer = await readRequestBody(req, 64 * 1024)
  const text = buffer?.length ? buffer.toString('utf8') : ''
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ message: 'Method not allowed.' })
    }

    const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
      .trim()
      .replace(/\/+$/, '')
    const supabaseServiceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/\s+/g, '')
    const unsafeViteServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      if (!supabaseServiceKey && unsafeViteServiceKey) {
        return res.status(500).json({
          message:
            'Missing SUPABASE_SERVICE_ROLE_KEY. Do not use VITE_SUPABASE_SERVICE_ROLE_KEY (it would expose the service key to the browser). Set SUPABASE_SERVICE_ROLE_KEY in Vercel env vars and redeploy.',
        })
      }
      return res.status(500).json({ message: 'Server is missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.' })
    }

    const authHeader = String(req.headers.authorization || req.headers.Authorization || '').trim()
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    const accessToken = match?.[1] ? String(match[1]).trim() : ''
    if (!accessToken) return res.status(401).json({ message: 'Missing Authorization bearer token.' })

    const body = await readJsonBody(req)
    const path = String(body?.path || '').trim()
    if (!path) return res.status(400).json({ message: 'Missing image path.' })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
    if (userError || !userData?.user?.id) {
      return res.status(401).json({ message: userError?.message || 'Invalid session.' })
    }

    const userId = String(userData.user.id)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) return res.status(400).json({ message: profileError.message || 'Unable to verify role.' })
    if (profile?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' })

    const { error: removeError } = await supabaseAdmin.storage.from('achievement-images').remove([path])
    if (removeError) return res.status(400).json({ message: removeError.message || 'Unable to delete image.' })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Unhandled error in /api/storage/delete-achievement-image.', error)
    return res.status(500).json({ message: error?.message ? String(error.message) : 'Server error.' })
  }
}
