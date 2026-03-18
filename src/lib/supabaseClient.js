import { createClient } from '@supabase/supabase-js'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const getSupabaseConfigError = () => {
  if (isSupabaseConfigured) return ''
  if (!supabaseUrl && !supabaseAnonKey) return 'Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  if (!supabaseUrl) return 'Missing VITE_SUPABASE_URL.'
  if (!supabaseAnonKey) return 'Missing VITE_SUPABASE_ANON_KEY.'
  return 'Supabase not configured.'
}
