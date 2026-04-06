import { createClient } from '@supabase/supabase-js'
import { rateLimit } from './_rateLimit.js'

/* global process, Buffer */

const getBearerToken = (authorization = '') => {
  const match = String(authorization || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '')
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()
const normalizeText = (value) => String(value ?? '').toString().trim()

const runAdminQuery = async (label, queryFactory) => {
  try {
    const { data, error } = await queryFactory()
    if (error) return { data: null, error: new Error(`${label}: ${error.message || String(error)}`) }
    return { data, error: null }
  } catch (error) {
    return { data: null, error: new Error(`${label}: ${error?.message ? String(error.message) : String(error)}`) }
  }
}

const isCallerAdmin = async (supabaseAdmin, caller) => {
  const callerId = caller?.id ? String(caller.id) : ''
  const callerEmail = normalizeEmail(caller?.email || '')
  const callerIdNumber = normalizeText(caller?.user_metadata?.id_number || '')

  const [byId, byEmail, byIdNumber] = await Promise.all([
    callerId
      ? runAdminQuery('admin check by id failed', () =>
          supabaseAdmin.from('profiles').select('id,role').eq('id', callerId).maybeSingle()
        )
      : Promise.resolve({ data: null, error: null }),
    callerEmail
      ? runAdminQuery('admin check by email failed', () =>
          supabaseAdmin.from('profiles').select('id,role').eq('email', callerEmail).limit(1).maybeSingle()
        )
      : Promise.resolve({ data: null, error: null }),
    callerIdNumber
      ? runAdminQuery('admin check by id_number failed', () =>
          supabaseAdmin.from('profiles').select('id,role').eq('id_number', callerIdNumber).limit(1).maybeSingle()
        )
      : Promise.resolve({ data: null, error: null }),
  ])

  const profile = byId?.data || byEmail?.data || byIdNumber?.data || null
  return profile?.role === 'admin'
}

const coerceUserIds = (body) => {
  const raw = body?.userIds ?? body?.user_ids ?? body?.ids ?? body?.users
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  const normalized = list
    .map((id) => String(id || '').trim())
    .filter(Boolean)

  return [...new Set(normalized)]
}

export default async function handler(req, res) {
  try {
    const rl = rateLimit({ req, res, key: 'admin:delete-users', limit: 10, windowMs: 60_000 })
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
      return res.status(500).json({ message: 'Server is missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY env vars.' })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const token = getBearerToken(req.headers.authorization)
    if (!token) return res.status(401).json({ message: 'Missing Authorization header.' })

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    const caller = authData?.user
    if (authError || !caller?.id) return res.status(401).json({ message: 'Invalid session.' })

    const allowed = await isCallerAdmin(supabaseAdmin, caller)
    if (!allowed) return res.status(403).json({ message: 'Admin access required.' })

    const body = parseBody(req)
    const userIds = coerceUserIds(body)
    if (userIds.length === 0) return res.status(400).json({ message: 'userIds is required.' })
    if (userIds.length > 50) return res.status(400).json({ message: 'Too many users selected. Please delete in smaller batches.' })

    const callerId = String(caller.id)
    const attemptedSelfDelete = userIds.includes(callerId)

    const targets = attemptedSelfDelete ? userIds.filter((id) => id !== callerId) : userIds
    if (targets.length === 0) {
      return res.status(400).json({ message: 'You cannot delete your own admin account from the admin panel.' })
    }

    const results = await Promise.allSettled(
      targets.map(async (userId) => {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (error) return { userId, ok: false, message: error.message || 'Unable to delete auth user.' }

        // Best-effort cleanup for projects without FK cascade from auth.users -> public tables.
        await supabaseAdmin.from('login_activity').delete().eq('user_id', userId)
        await supabaseAdmin.from('profiles').delete().eq('id', userId)

        return { userId, ok: true }
      })
    )

    const deleted = []
    const failed = []

    for (const item of results) {
      if (item.status === 'fulfilled') {
        if (item.value?.ok) deleted.push(item.value.userId)
        else failed.push({ userId: item.value?.userId || null, message: item.value?.message || 'Delete failed.' })
      } else {
        failed.push({ userId: null, message: item.reason?.message || 'Delete failed.' })
      }
    }

    if (attemptedSelfDelete) {
      failed.push({ userId: callerId, message: 'Cannot delete your own admin account from the admin panel.' })
    }

    await supabaseAdmin
      .rpc('log_admin_action', {
        p_action: 'user.delete.batch',
        p_entity: 'profiles',
        p_entity_id: '',
        p_meta: { deleted, failedCount: failed.length },
      })
      .catch(() => {})

    return res.status(200).json({ success: failed.length === 0, deleted, failed })
  } catch (error) {
    console.error('Unhandled error in /api/admin/delete-users.', error)
    return res.status(500).json({ message: error?.message ? String(error.message) : 'Server error.' })
  }
}
