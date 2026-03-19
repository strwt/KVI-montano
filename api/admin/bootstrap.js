import { createClient } from '@supabase/supabase-js'

/* global process, Buffer */

const normalizeIdKey = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ message: 'Method not allowed.' })
    }

    const bootstrapSecret = String(process.env.BOOTSTRAP_SECRET || '').trim()
    const providedSecret = String(req.headers['x-bootstrap-secret'] || '').trim()
    if (!bootstrapSecret || providedSecret !== bootstrapSecret) {
      return res.status(401).json({ message: 'Unauthorized.' })
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
        role: 'admin',
      },
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
      return res
        .status(500)
        .json({ message: profileError.message || 'Bootstrap admin created but profile update failed.' })
    }

    return res.status(200).json({ success: true, userId: newUserId, idNumber })
  } catch (error) {
    console.error('Unhandled error in /api/admin/bootstrap.', error)
    return res.status(500).json({ message: error?.message ? String(error.message) : 'Server error.' })
  }
}
