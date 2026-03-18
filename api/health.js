/* global process */

export default async function handler(req, res) {
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const bootstrapSecret = String(process.env.BOOTSTRAP_SECRET || '').trim()

  const missing = []
  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  return res.status(200).json({
    ok: missing.length === 0,
    missing,
    hasBootstrapSecret: Boolean(bootstrapSecret),
  })
}

