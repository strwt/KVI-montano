import { createClient } from '@supabase/supabase-js'
import { rateLimit } from './_rateLimit.js'

/* global process, Buffer */

const getBearerToken = (authorization = '') => {
  const match = String(authorization || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

const sanitizeImageExtension = (value) => {
  const ext = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  if (!ext) return ''
  if (ext === 'jpg') return 'jpeg'
  return ext
}

const inferExtensionFromContentType = (contentType) => {
  const type = String(contentType || '').trim().toLowerCase()
  if (!type.startsWith('image/')) return ''
  const ext = sanitizeImageExtension(type.slice('image/'.length))
  if (!ext) return ''
  if (ext === 'svg+xml') return 'svg'
  return ext
}

const randomUuid = () => {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const readRequestBody = async (req, maxBytes) => {
  if (Buffer.isBuffer(req.body)) return req.body
  if (req.body instanceof ArrayBuffer) return Buffer.from(req.body)
  if (typeof req.body === 'string') return Buffer.from(req.body)

  const chunks = []
  let total = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buf.length
    if (maxBytes && total > maxBytes) {
      throw new Error('File is too large.')
    }
    chunks.push(buf)
  }

  return chunks.length ? Buffer.concat(chunks) : Buffer.from([])
}

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim())

export default async function handler(req, res) {
  try {
    const rl = rateLimit({ req, res, key: 'admin:upload-user-avatar', limit: 20, windowMs: 60_000 })
    if (!rl.ok) return null

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

    const accessToken = getBearerToken(req.headers.authorization || req.headers.Authorization || '')
    if (!accessToken) return res.status(401).json({ message: 'Missing Authorization bearer token.' })

    const targetUserId = String(req.headers['x-user-id'] || req.headers['X-User-Id'] || '').trim()
    if (!targetUserId || !isUuid(targetUserId)) {
      return res.status(400).json({ message: 'Missing or invalid x-user-id header.' })
    }

    const contentType = String(req.headers['content-type'] || '').trim()
    if (!contentType.toLowerCase().startsWith('image/')) {
      return res.status(400).json({ message: 'Only image uploads are allowed.' })
    }

    const buffer = await readRequestBody(req, 5 * 1024 * 1024)
    if (!buffer?.length) return res.status(400).json({ message: 'Missing file body.' })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
    if (userError || !userData?.user?.id) {
      return res.status(401).json({ message: userError?.message || 'Invalid session.' })
    }

    const callerId = String(userData.user.id)
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .maybeSingle()

    if (callerProfileError) {
      return res.status(500).json({ message: callerProfileError.message || 'Unable to validate admin role.' })
    }
    if (callerProfile?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' })

    const ext = inferExtensionFromContentType(contentType)
    const filename = ext ? `${randomUuid()}.${ext}` : randomUuid()
    const path = `avatars/${targetUserId}/${filename}`

    const { error: uploadError } = await supabaseAdmin.storage.from('profile-images').upload(path, buffer, {
      upsert: true,
      contentType,
      cacheControl: '3600',
    })
    if (uploadError) {
      return res.status(400).json({ message: uploadError.message || 'Upload failed.' })
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').update({ profile_image: path }).eq('id', targetUserId)
    if (profileError) {
      return res.status(500).json({ message: profileError.message || 'Upload succeeded but profile update failed.' })
    }

    try {
      await supabaseAdmin.rpc('log_admin_action', {
        p_action: 'user.avatar.update',
        p_entity: 'profiles',
        p_entity_id: targetUserId,
        p_meta: { path },
      })
    } catch (error) {
      console.warn('log_admin_action failed (user.avatar.update).', error)
    }

    return res.status(200).json({ success: true, path })
  } catch (error) {
    console.error('Unhandled error in /api/admin/upload-user-avatar.', error)
    return res.status(500).json({ message: error?.message ? String(error.message) : 'Server error.' })
  }
}
