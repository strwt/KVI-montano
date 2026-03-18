import { createClient } from '@supabase/supabase-js'

/* global process */

const normalizeIdKey = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method not allowed.' })
  }

  const bootstrapSecret = String(process.env.BOOTSTRAP_SECRET || '').trim()
  const providedSecret = String(req.headers['x-bootstrap-secret'] || '').trim()
  if (!bootstrapSecret || providedSecret !== bootstrapSecret) {
    return res.status(401).json({ message: 'Unauthorized.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      message: 'Server is missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY env vars.',
    })
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const idNumber = String(body.idNumber || body.id_number || '').trim()
  const password = String(body.password || '').trim()
  const name = String(body.name || '').trim()

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
    return res.status(400).json({ message: createError.message || 'Unable to create bootstrap admin.' })
  }

  const newUserId = created?.user?.id
  if (!newUserId) return res.status(500).json({ message: 'User creation did not return an ID.' })

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: newUserId,
        role: 'admin',
        name: name || '',
        id_number: idNumber,
        email,
      },
      { onConflict: 'id' }
    )

  if (profileError) {
    return res.status(500).json({ message: profileError.message || 'Bootstrap admin created but profile update failed.' })
  }

  return res.status(200).json({ success: true, userId: newUserId, idNumber })
}
