import { createClient } from '@supabase/supabase-js'

const parseEnvBool = (value, fallback) => {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return fallback
  if (['1', 'true', 'yes', 'y', 'on'].includes(raw)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(raw)) return false
  return fallback
}

export const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '')
  .trim()
  .replace(/\/+$/, '')

export const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  .trim()
  .replace(/\s+/g, '')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabaseProjectRef = (() => {
  try {
    if (!supabaseUrl) return ''
    const host = new URL(supabaseUrl).hostname || ''
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i)
    return match?.[1] ? String(match[1]) : ''
  } catch {
    return ''
  }
})()

export const clearSupabaseAuthLocalStorage = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    const ref = supabaseProjectRef
    const knownKeys = ref
      ? [
          `sb-${ref}-auth-token`,
          `sb-${ref}-auth-token-code-verifier`,
        ]
      : []

    for (const key of knownKeys) {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

const createSafeStorage = ({ persistSession }) => {
  const memory = new Map()
  const allowLocalStorage = Boolean(persistSession)

  const getLocalStorage = () => {
    try {
      if (typeof window === 'undefined') return null
      if (!allowLocalStorage) return null
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
      memory.set(key, value)
      const storage = getLocalStorage()
      if (storage) {
        try {
          storage.setItem(key, value)
          return
        } catch {
          // Fall back to memory.
        }
      }
    },
    removeItem: (key) => {
      memory.delete(key)
      const storage = getLocalStorage()
      if (storage) {
        try {
          storage.removeItem(key)
          return
        } catch {
          // Fall back to memory.
        }
      }
    },
  }
}

const fetchWithTimeout = (input, init = {}) => {
  if (Date.now() < fetchDisabledUntil) {
    const error = new Error('Supabase request skipped due to recent network failures.')
    error.name = 'SupabaseFetchDisabled'
    return Promise.reject(error)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000)

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort()
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  return fetch(input, { ...init, signal: controller.signal })
    .catch((error) => {
      if (isLikelyNetworkFailure(error)) {
        fetchDisabledUntil = Date.now() + SUPABASE_FETCH_DISABLE_MS
      }
      throw error
    })
    .finally(() => clearTimeout(timeoutId))
}

const SUPABASE_FETCH_DISABLE_MS = 30_000
let fetchDisabledUntil = 0
const isLikelyNetworkFailure = (error) => {
  if (!error) return false
  const name = String(error?.name || '')
  if (name !== 'TypeError') return false
  const message = String(error?.message || '').toLowerCase()
  return message.includes('failed to fetch') || message.includes('networkerror')
}

const persistSession = parseEnvBool(import.meta.env.VITE_SUPABASE_PERSIST_SESSION, true)
const autoRefreshToken = parseEnvBool(import.meta.env.VITE_SUPABASE_AUTO_REFRESH_TOKEN, true)
const detectSessionInUrl = parseEnvBool(import.meta.env.VITE_SUPABASE_DETECT_SESSION_IN_URL, true)

export const supabase = isSupabaseConfigured
  ? (() => {
      const globalScope = (() => {
        try {
          if (typeof window !== 'undefined') return window
        } catch {
          // ignore
        }
        return globalThis
      })()

      const globalKey = '__kusgan_supabase_client__'
      const existing = globalScope?.[globalKey] || null
      if (existing) return existing

      const client = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          fetch: fetchWithTimeout,
        },
        auth: {
          storage: createSafeStorage({ persistSession }),
          persistSession,
          autoRefreshToken,
          detectSessionInUrl,
        },
      })

      try {
        if (globalScope) globalScope[globalKey] = client
      } catch {
        // ignore (non-writable global)
      }

      return client
    })()
  : null

if (!persistSession) clearSupabaseAuthLocalStorage()

export const getSupabaseConfigError = () => {
  if (isSupabaseConfigured) return ''
  if (!supabaseUrl && !supabaseAnonKey) return 'Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  if (!supabaseUrl) return 'Missing VITE_SUPABASE_URL.'
  if (!supabaseAnonKey) return 'Missing VITE_SUPABASE_ANON_KEY.'
  return 'Supabase not configured.'
}
