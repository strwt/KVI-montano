import { createClient } from '@supabase/supabase-js'

const debugSupabase = String(import.meta.env.VITE_DEBUG_SUPABASE || '').trim().toLowerCase() === 'true'

export const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '')
  .trim()
  .replace(/\/+$/, '')

export const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  .trim()
  .replace(/\s+/g, '')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const createSafeStorage = () => {
  const memory = new Map()
  const getLocalStorage = () => {
    try {
      if (typeof window === 'undefined') return null
      return window.localStorage || null
    } catch {
      return null
    }
  }

  return {
    getItem: (key) => {
      const storage = getLocalStorage()
      if (storage) {
        try {
          return storage.getItem(key)
        } catch {
          // Fall back to memory.
        }
      }
      return memory.has(key) ? memory.get(key) : null
    },
    setItem: (key, value) => {
      const storage = getLocalStorage()
      if (storage) {
        try {
          storage.setItem(key, value)
          return
        } catch {
          // Fall back to memory.
        }
      }
      memory.set(key, value)
    },
    removeItem: (key) => {
      const storage = getLocalStorage()
      if (storage) {
        try {
          storage.removeItem(key)
          return
        } catch {
          // Fall back to memory.
        }
      }
      memory.delete(key)
    },
  }
}

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
        storage: createSafeStorage(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

if (debugSupabase) {
  const urlLabel = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '') : '(missing)'
  console.info('[supabase] configured?', isSupabaseConfigured, 'url:', urlLabel)
}

export const getSupabaseConfigError = () => {
  if (isSupabaseConfigured) return ''
  if (!supabaseUrl && !supabaseAnonKey) return 'Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  if (!supabaseUrl) return 'Missing VITE_SUPABASE_URL.'
  if (!supabaseAnonKey) return 'Missing VITE_SUPABASE_ANON_KEY.'
  return 'Supabase not configured.'
}
