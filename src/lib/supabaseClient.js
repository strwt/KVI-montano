import { createClient } from '@supabase/supabase-js'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const fetchWithTimeout = (input, init = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000)

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort()
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeoutId))
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: fetchWithTimeout,
      },
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
