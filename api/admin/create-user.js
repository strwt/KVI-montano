import { createClient } from '@supabase/supabase-js'
import { rateLimit } from './_rateLimit.js'

/* global process, Buffer */

const getBearerToken = (authorization = '') => {
  const match = String(authorization || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

const normalizeIdKey = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const isUniqueViolation = (error) => {
  const code = error?.code ? String(error.code) : ''
  if (code === '23505') return true
  const message = error?.message ? String(error.message) : ''
  return /duplicate key value|unique constraint/i.test(message)
}

const looksLikeEmailAlreadyUsedError = (error) => {
  const message = error?.message ? String(error.message) : ''
  return /user already registered|email.*already|already.*email/i.test(message)
}

const buildDuplicateProfileMessage = (error) => {
  const message = error?.message ? String(error.message) : ''
  if (/id_number|profiles_id_number_key/i.test(message)) return 'ID Number is already used.'
  if (/email|profiles_email_key/i.test(message)) return 'Email is already used.'
  return 'Member already exists.'
}

export default async function handler(req, res) {
  try {
    const rl = rateLimit({ req, res, key: 'admin:create-user', limit: 20, windowMs: 60_000 })
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
    const statusRaw = String(body.status || '').trim().toLowerCase()
    const accountStatusRaw = String(body.accountStatus || body.account_status || '').trim()
    const status = statusRaw === 'inactive' ? 'inactive' : 'active'
    const accountStatus = accountStatusRaw ? accountStatusRaw : 'Active'
    const role = body.role === 'admin' ? 'admin' : 'member'
    const insuranceStatusRaw = String(body.insuranceStatus || body.insurance_status || '').trim()
    const insuranceStatus = /insured/i.test(insuranceStatusRaw) ? 'Insured' : 'N/A'
    const insuranceYearRaw = String(body.insuranceYear || body.insurance_year || '').trim()
    const insuranceYear = insuranceStatus === 'Insured' && insuranceYearRaw ? insuranceYearRaw : null

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
      app_metadata: {
        role,
      },
      user_metadata: {
        name,
        id_number: idNumber,
      },
    })

    if (createError) {
      if (looksLikeEmailAlreadyUsedError(createError)) {
        return res.status(409).json({ message: 'ID Number is already used.' })
      }
      return res.status(400).json({ message: createError.message || 'Unable to create user.' })
    }

    const newUserId = created?.user?.id
    if (!newUserId) return res.status(500).json({ message: 'User creation did not return an ID.' })

    const profilePatch = {
      name: name || '',
      role,
      id_number: idNumber,
      email,
      status,
      account_status: accountStatus,
      committee: body.committee ? String(body.committee).trim() : null,
      address: body.address ? String(body.address).trim() : null,
      contact_number: body.contactNumber ? String(body.contactNumber).trim() : null,
      emergency_contact_number: body.emergencyContactNumber ? String(body.emergencyContactNumber).trim() : null,
      emergency_contact_name: body.emergencyContactName ? String(body.emergencyContactName).trim() : null,
      emergency_contact_relationship: body.emergencyContactRelationship ? String(body.emergencyContactRelationship).trim() : null,
      blood_type: body.bloodType ? String(body.bloodType).trim().toUpperCase() : null,
      member_since: body.memberSince ? String(body.memberSince).trim() : null,
      insurance_status: insuranceStatus,
      insurance_year: insuranceYear,
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
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUserId)
      } catch (rollbackError) {
        console.warn('Failed to roll back auth user after profile upsert error.', rollbackError)
      }

      const statusCode = isUniqueViolation(profileError) ? 409 : 500
      const fallbackMessage = isUniqueViolation(profileError)
        ? buildDuplicateProfileMessage(profileError)
        : 'User created but profile update failed.'

      return res.status(statusCode).json({ message: profileError.message || fallbackMessage })
    }

    try {
      await supabaseAdmin.rpc('log_admin_action', {
        p_action: 'user.create',
        p_entity: 'profiles',
        p_entity_id: newUserId,
        p_meta: { role, id_number: idNumber, email, committee: profilePatch.committee, status, account_status: accountStatus },
      })
    } catch (error) {
      console.warn('log_admin_action failed (user.create).', error)
    }

    return res.status(200).json({ success: true, userId: newUserId, email })
  } catch (error) {
    console.error('Unhandled error in /api/admin/create-user.', error)
    return res.status(500).json({ message: error?.message ? String(error.message) : 'Server error.' })
  }
}
