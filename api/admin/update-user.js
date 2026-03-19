import { createClient } from '@supabase/supabase-js'

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

const isValidRole = (value) => value === 'admin' || value === 'member'

const runAdminQuery = async (label, queryFactory) => {
  try {
    const { data, error } = await queryFactory()
    if (error) return { data: null, error: new Error(`${label}: ${error.message || String(error)}`) }
    return { data, error: null }
  } catch (error) {
    return { data: null, error: new Error(`${label}: ${error?.message ? String(error.message) : String(error)}`) }
  }
}

const buildProfilePatch = (updates = {}) => {
  const patch = {}

  if (Object.prototype.hasOwnProperty.call(updates, 'name')) patch.name = normalizeText(updates.name) || ''
  if (Object.prototype.hasOwnProperty.call(updates, 'committee')) patch.committee = normalizeText(updates.committee) || null
  if (Object.prototype.hasOwnProperty.call(updates, 'category')) patch.category = normalizeText(updates.category) || null
  if (Object.prototype.hasOwnProperty.call(updates, 'address')) patch.address = normalizeText(updates.address) || null
  if (Object.prototype.hasOwnProperty.call(updates, 'contactNumber')) patch.contact_number = normalizeText(updates.contactNumber) || null
  if (Object.prototype.hasOwnProperty.call(updates, 'bloodType')) {
    const bt = normalizeText(updates.bloodType).toUpperCase()
    patch.blood_type = bt || null
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'accountStatus')) patch.account_status = normalizeText(updates.accountStatus) || 'Active'
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) patch.status = normalizeText(updates.status) || 'active'
  if (Object.prototype.hasOwnProperty.call(updates, 'memberSince')) patch.member_since = normalizeText(updates.memberSince) || null

  if (Object.prototype.hasOwnProperty.call(updates, 'email')) {
    const email = normalizeEmail(updates.email)
    patch.email = email || null
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'idNumber')) {
    const idNumber = normalizeText(updates.idNumber)
    patch.id_number = idNumber || null
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'role')) {
    const role = normalizeText(updates.role)
    if (isValidRole(role)) patch.role = role
  }

  return patch
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
    const userId = String(body.userId || body.id || '').trim()
    const updates = body.updates && typeof body.updates === 'object' ? body.updates : body

    if (!userId) return res.status(400).json({ message: 'userId is required.' })

    const patch = buildProfilePatch(updates)

    if (Object.prototype.hasOwnProperty.call(patch, 'email') && patch.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) {
        return res.status(400).json({ message: 'Invalid email address.' })
      }
    }

    // If email is being updated, also update the Auth user so sign-in flows keep working.
    if (Object.prototype.hasOwnProperty.call(patch, 'email') && patch.email) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email: patch.email })
      if (authUpdateError) {
        return res.status(400).json({ message: authUpdateError.message || 'Unable to update auth email.' })
      }
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').update(patch).eq('id', userId)
    if (profileError) {
      return res.status(400).json({ message: profileError.message || 'Unable to update profile.' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Unhandled error in /api/admin/update-user.', error)
    return res.status(500).json({ message: error?.message ? String(error.message) : 'Server error.' })
  }
}
