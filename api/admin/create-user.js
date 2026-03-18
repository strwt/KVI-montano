import { createClient } from '@supabase/supabase-js'

/* global process, Buffer */

const getBearerToken = (authorization = '') => {
  const match = String(authorization || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

const normalizeIdKey = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ message: 'Method not allowed.' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const unsafeViteServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      if (!supabaseServiceKey && unsafeViteServiceKey) {
        return res.status(500).json({
          message:
            'Missing SUPABASE_SERVICE_ROLE_KEY. Do not use VITE_SUPABASE_SERVICE_ROLE_KEY (it would expose the service key to the browser). Set SUPABASE_SERVICE_ROLE_KEY in Vercel env vars and redeploy.',
        })
      }
      return res.status(500).json({
        message: 'Server is missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY env vars.',
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const token = getBearerToken(req.headers.authorization)
    if (!token) return res.status(401).json({ message: 'Missing Authorization header.' })

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    const caller = authData?.user
    if (authError || !caller?.id) return res.status(401).json({ message: 'Invalid session.' })

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()

    if (callerProfileError) {
      return res.status(500).json({ message: callerProfileError.message || 'Unable to validate admin role.' })
    }
    if (callerProfile?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' })

    const parseBody = () => {
      if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
      const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '')
      if (!raw.trim()) return {}
      return JSON.parse(raw)
    }

    const body = parseBody()
    const idNumber = String(body.idNumber || body.id_number || '').trim()
    const password = String(body.password || '').trim()
    const name = String(body.name || '').trim()
    const role = body.role === 'admin' ? 'admin' : 'member'

    if (!idNumber || !password) {
      return res.status(400).json({ message: 'idNumber and password are required.' })
    }

    const idKey = normalizeIdKey(idNumber)
    if (!idKey) return res.status(400).json({ message: 'Invalid idNumber format.' })

    const email = `${idKey}@id.kusgan.local`

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        id_number: idNumber,
      },
    })

    if (createError) {
      return res.status(400).json({ message: createError.message || 'Unable to create user.' })
    }

    const newUserId = created?.user?.id
    if (!newUserId) return res.status(500).json({ message: 'User creation did not return an ID.' })

    const profilePatch = {
      name: name || '',
      role,
      id_number: idNumber,
      email,
      committee: body.committee ? String(body.committee).trim() : null,
      category: body.category ? String(body.category).trim() : null,
      address: body.address ? String(body.address).trim() : null,
      contact_number: body.contactNumber ? String(body.contactNumber).trim() : null,
      blood_type: body.bloodType ? String(body.bloodType).trim().toUpperCase() : null,
      member_since: body.memberSince ? String(body.memberSince).trim() : null,
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          ...profilePatch,
        },
        { onConflict: 'id' }
      )
    if (profileError) {
      return res.status(500).json({ message: profileError.message || 'User created but profile update failed.' })
    }

    return res.status(200).json({ success: true, userId: newUserId, email })
  } catch (error) {
    console.error('Unhandled error in /api/admin/create-user.', error)
    return res.status(500).json({ message: error?.message ? String(error.message) : 'Server error.' })
  }
}
