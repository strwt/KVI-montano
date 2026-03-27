import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { clearSupabaseAuthLocalStorage, getSupabaseConfigError, isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from '../lib/supabaseClient'

const AuthContext = createContext(null)

const debugSupabase = String(import.meta.env.VITE_DEBUG_SUPABASE || '').trim().toLowerCase() === 'true'
const logSupabase = (...args) => {
  if (!debugSupabase) return
  console.info('[supabase]', ...args)
}

const DEFAULT_PROFILE_IMAGE = '/image-removebg-preview.png'
const SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.'
const LOADING_FALLBACK_MS = 3_000
const PROFILE_CACHE_TTL_MS = 30_000
const PROFILE_NEGATIVE_CACHE_TTL_MS = 2_000
const IDLE_LOGOUT_MS = 10 * 60_000
const PROFILE_IMAGE_BUCKET = 'profile-images'
const PROFILE_IMAGE_PREFIX = 'avatars'

const PROFILE_SELECT_COLUMNS = [
  'id',
  'email',
  'role',
  'name',
  'id_number',
  'committee',
  'contact_number',
  'address',
  'blood_type',
  'member_since',
  'profile_image',
  'account_status',
  'status',
  'app_language',
  'dark_mode',
  'settings',
  'created_at',
].join(',')

const PROFILE_LIST_COLUMNS = [
  'id',
  'email',
  'role',
  'name',
  'id_number',
  'committee',
  'contact_number',
  'address',
  'blood_type',
  'member_since',
  'profile_image',
  'account_status',
  'status',
  'created_at',
].join(',')

const profileCache = new Map()
const profileInflight = new Map()
const clearProfileCache = () => {
  profileCache.clear()
  profileInflight.clear()
}

const normalizeRole = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'admin' || normalized === 'member' ? normalized : null
}

const isRefreshTokenError = (error) => {
  const message = error?.message ? String(error.message) : ''
  return /refresh token/i.test(message)
}

const isAbortError = (error) => error?.name === 'AbortError'

const enrichUserWithProfileImage = (user = {}) => ({
  ...user,
  profileImage: user.profileImage || DEFAULT_PROFILE_IMAGE,
})

const isLikelyExternalUrl = (value) => /^https?:\/\//i.test(String(value || '').trim())
const isLikelyDataUrl = (value) => /^data:image\//i.test(String(value || '').trim())

const encodeStorageObjectPath = (value) =>
  String(value || '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')

const decodeJwtPayload = (token) => {
  const raw = String(token || '').trim()
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length < 2) return null
  const payload = parts[1]
  if (!payload) return null

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const decoded = typeof atob === 'function' ? atob(padded) : ''
    return decoded ? JSON.parse(decoded) : null
  } catch {
    return null
  }
}

const uploadStorageObjectViaRest = async ({ bucket, path, file, contentType, accessToken }) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 0, message: 'Supabase is not configured. Missing URL or anon key.' }
  }

  const bucketName = String(bucket || '').trim()
  const objectPath = String(path || '').trim()
  if (!bucketName || !objectPath) return { ok: false, status: 0, message: 'Missing storage path.' }

  const encodedPath = encodeStorageObjectPath(objectPath)
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${encodedPath}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${String(accessToken || '')}`,
      'Content-Type': String(contentType || 'application/octet-stream'),
      'x-upsert': 'true',
    },
    body: file,
  })

  const responseText = await response.text().catch(() => '')
  const payload = (() => {
    if (!responseText) return null
    try {
      return JSON.parse(responseText)
    } catch {
      return null
    }
  })()

  if (response.ok) {
    return { ok: true, status: response.status, payload }
  }

  const message =
    payload?.message
    || payload?.error_description
    || payload?.error
    || (typeof payload === 'string' ? payload : 'Upload failed.')
    || (responseText ? responseText.slice(0, 300) : 'Upload failed.')

  return { ok: false, status: response.status, message }
}

const uploadProfileImageViaApi = async ({ file, contentType, accessToken }) => {
  const token = String(accessToken || '').trim()
  if (!token) return { ok: false, status: 0, message: 'Missing access token.' }

  const response = await fetch('/api/storage/upload-avatar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': String(contentType || 'application/octet-stream'),
    },
    body: file,
  })

  const responseText = await response.text().catch(() => '')
  const payload = (() => {
    if (!responseText) return null
    try {
      return JSON.parse(responseText)
    } catch {
      return null
    }
  })()

  if (response.ok && payload?.path) {
    return { ok: true, status: response.status, path: String(payload.path) }
  }

  // If the route doesn't exist, fall back to direct Storage upload.
  if (response.status === 404) return { ok: false, status: 404, message: 'Upload API not found.' }

  const message =
    payload?.message
    || payload?.error_description
    || payload?.error
    || (typeof payload === 'string' ? payload : 'Upload failed.')
    || (responseText ? responseText.slice(0, 300) : 'Upload failed.')

  return { ok: false, status: response.status, message }
}

const uploadMemberProfileImageViaAdminApi = async ({ memberId, file, contentType, accessToken }) => {
  const token = String(accessToken || '').trim()
  if (!token) return { ok: false, status: 0, message: 'Missing access token.' }

  const userId = String(memberId || '').trim()
  if (!userId) return { ok: false, status: 0, message: 'Missing member id.' }

  const response = await fetch('/api/admin/upload-user-avatar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': String(contentType || 'application/octet-stream'),
      'x-user-id': userId,
    },
    body: file,
  })

  const responseText = await response.text().catch(() => '')
  const payload = (() => {
    if (!responseText) return null
    try {
      return JSON.parse(responseText)
    } catch {
      return responseText
    }
  })()

  if (response.ok) {
    return { ok: true, status: response.status, path: payload?.path ? String(payload.path) : '' }
  }

  if (response.status === 404) {
    return {
      ok: false,
      status: 404,
      message: 'Upload API not found. If you are running locally, start the app with `npm run dev:vercel` so `/api/*` routes are available.',
    }
  }

  const message =
    payload?.message
    || payload?.error_description
    || payload?.error
    || (typeof payload === 'string' ? payload : 'Upload failed.')
    || 'Upload failed.'

  return { ok: false, status: response.status, message: String(message).slice(0, 300) }
}

const normalizeSupabaseStoragePublicUrl = (url, bucket) => {
  const raw = String(url || '').trim()
  if (!raw || !isLikelyExternalUrl(raw) || !supabaseUrl) return null

  const base = String(supabaseUrl).replace(/\/+$/, '')
  const bucketName = String(bucket || '').trim()
  if (!bucketName) return null

  const expectedPrefix = `${base}/storage/v1/object/`
  if (!raw.toLowerCase().startsWith(expectedPrefix.toLowerCase())) return null

  const rest = raw.slice(expectedPrefix.length)
  if (rest.toLowerCase().startsWith(`public/${bucketName.toLowerCase()}/`)) return raw
  if (rest.toLowerCase().startsWith(`sign/${bucketName.toLowerCase()}/`)) return raw
  if (rest.toLowerCase().startsWith(`${bucketName.toLowerCase()}/`)) {
    return `${base}/storage/v1/object/public/${rest}`
  }

  return null
}

const normalizeProfileImageStorageValue = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (raw === DEFAULT_PROFILE_IMAGE) return null
  if (raw.startsWith('/')) return null
  if (isLikelyDataUrl(raw)) return null

  if (isLikelyExternalUrl(raw)) {
    const normalizedPublic = normalizeSupabaseStoragePublicUrl(raw, PROFILE_IMAGE_BUCKET)
    if (!normalizedPublic) return raw

    try {
      const url = new URL(normalizedPublic)
      const marker = `/storage/v1/object/public/${PROFILE_IMAGE_BUCKET}/`
      const idx = url.pathname.toLowerCase().indexOf(marker.toLowerCase())
      if (idx >= 0) {
        const objectPath = url.pathname.slice(idx + marker.length)
        return decodeURIComponent(objectPath.replace(/^\/+/, ''))
      }
    } catch {
      // Ignore and fall back to raw.
    }

    return raw
  }

  // If the bucket name was accidentally included, strip it.
  const bucketPrefix = `${PROFILE_IMAGE_BUCKET}/`
  if (raw.toLowerCase().startsWith(bucketPrefix.toLowerCase())) {
    return raw.slice(bucketPrefix.length)
  }

  return raw
}

const resolveProfileImageSrc = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return DEFAULT_PROFILE_IMAGE
  if (raw === DEFAULT_PROFILE_IMAGE) return raw
  if (raw.startsWith('/')) return raw
  if (isLikelyExternalUrl(raw)) {
    return normalizeSupabaseStoragePublicUrl(raw, PROFILE_IMAGE_BUCKET) || raw
  }
  if (isLikelyDataUrl(raw)) return raw

  // Treat as Supabase Storage object path. This requires the bucket to be public.
  try {
    const { data } = supabase?.storage?.from?.(PROFILE_IMAGE_BUCKET)?.getPublicUrl?.(raw) || {}
    if (data?.publicUrl) return data.publicUrl
  } catch {
    // Ignore and fall back to default.
  }

  return DEFAULT_PROFILE_IMAGE
}

const normalizeEventCategoryKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const EVENT_CATEGORY_KEY_ALIASES = {
  relief_operations: 'relief_operation',
  fire_responses: 'fire_response',
  water_distributions: 'water_distribution',
  blood_lettings: 'blood_letting',
}

const canonicalizeEventCategoryKey = (key) => EVENT_CATEGORY_KEY_ALIASES[key] || key
const toEventCategoryKey = (value) => canonicalizeEventCategoryKey(normalizeEventCategoryKey(value))

const mapProfileToUser = (profile, authUser) => {
  if (!authUser) return null

  const id = authUser.id || profile?.id || null
  if (!id) return null

  const name = profile?.name || authUser?.user_metadata?.name || ''
  const email = profile?.email || authUser?.email || ''
  const role = normalizeRole(profile?.role)

  return enrichUserWithProfileImage({
    id,
    profileId: profile?.id || authUser?.id || null,
    idNumber: profile?.id_number || authUser?.user_metadata?.id_number || '',
    name,
    email,
    role,
    committee: profile?.committee || '',
    contactNumber: profile?.contact_number || '',
    address: profile?.address || '',
    bloodType: profile?.blood_type || '',
    memberSince: profile?.member_since || authUser?.created_at || new Date().toISOString(),
    profileImage: resolveProfileImageSrc(profile?.profile_image),
    accountStatus: profile?.account_status || 'Active',
    status: profile?.status || 'active',
    appLanguage: profile?.app_language || 'English',
    darkMode: Boolean(profile?.dark_mode),
    settings: profile?.settings && typeof profile.settings === 'object' ? profile.settings : {},
  })
}

const applyMappedUserState = (mappedUser, setters) => {
  const { setUser, setAppLanguageState, setDarkModeState, setSettingsState } = setters
  setUser(mappedUser)
  setAppLanguageState(mappedUser?.appLanguage || 'English')
  setDarkModeState(Boolean(mappedUser?.darkMode))
  setSettingsState(mappedUser?.settings && typeof mappedUser.settings === 'object' ? mappedUser.settings : {})
}

const emptyContext = (configError) => ({
  supabaseEnabled: false,
  supabaseConfigError: configError,
  user: null,
  authResolved: true,
  loading: false,
  committees: [],
  appLanguage: 'English',
  darkMode: false,
  settings: {},
  members: [],
  admins: [],
  users: [],
  login: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  logout: async () => {},
  register: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  updateCurrentUser: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  changeCurrentUserPassword: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  setAppLanguage: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  setDarkMode: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  saveSettings: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  getAllMembers: () => [],
  getAdmins: () => [],
  ensureAdminDataLoaded: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  createMember: async () => ({
    success: false,
    message: 'Members must self-register (or implement an invite flow using a server route with the Service Role key).',
  }),
  deleteMembers: async () => ({
  success: false,
  message: 'Deleting users requires a server-side Admin/Service Role flow in Supabase (client cannot delete Auth users).',
  }),
  updateMember: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  addCommittee: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  editCommittee: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  deleteCommittee: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  eventCategories: [],
  addEventCategory: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  editEventCategory: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  deleteEventCategory: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  submitRecruitmentApplication: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  rejectRecruitment: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  getRecruitments: () => [],
})

export function AuthProvider({ children }) {
  const supabaseEnabled = Boolean(isSupabaseConfigured && supabase)
  const supabaseConfigError = getSupabaseConfigError()

  const [loading, setLoading] = useState(false)
  const [authResolved, setAuthResolved] = useState(false)
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [members, setMembers] = useState([])
  const [admins, setAdmins] = useState([])
  const [committees, setCommittees] = useState([])
  const [eventCategories, setEventCategories] = useState([])
  const [recruitments, setRecruitments] = useState([])
  const authEpochRef = useRef(0)
  const initialSessionHandledRef = useRef(false)
  const adminDataInflightRef = useRef(null)
  const lookupsUserIdRef = useRef('')
  const lookupsLoadedRef = useRef(false)

  const isAuthLockError = (error) => {
    if (!error) return false
    if (error.name === 'AbortError') return true
    return /lock/i.test(error.message || '')
  }

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const runAuthOperationWithRetry = (operation, options = {}) => {
    const attempts = Number.isFinite(options.attempts) ? options.attempts : 2
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 20_000

    const runner = async () => {
      let lastError
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          let timerId
          const timeoutPromise = new Promise((_, reject) => {
            timerId = window.setTimeout(() => {
              const err = new Error('Auth request timed out.')
              err.name = 'AbortError'
              reject(err)
            }, timeoutMs)
          })

          try {
            return await Promise.race([operation(), timeoutPromise])
          } finally {
            if (timerId) window.clearTimeout(timerId)
          }
        } catch (error) {
          lastError = error
          if (attempt < attempts - 1 && isAuthLockError(error)) {
            await wait(300)
            continue
          }
          throw error
        }
      }
      throw lastError
    }

    return runner()
  }
  const [appLanguage, setAppLanguageState] = useState('English')
  const [darkMode, setDarkModeState] = useState(false)
  const [settings, setSettingsState] = useState({})
  const loginRequestRef = useRef(null)
  const logoutRequestRef = useRef(null)
  const isSigningOutRef = useRef(false)

  const clearClientState = () => {
    setUser(null)
    setUsers([])
    setMembers([])
    setAdmins([])
    setCommittees([])
    setEventCategories([])
    setRecruitments([])
    setLoading(false)
    setAuthResolved(true)
    lookupsUserIdRef.current = ''
    lookupsLoadedRef.current = false
  }

  useEffect(() => {
    if (!loading) return undefined
    const timeoutId = window.setTimeout(() => setLoading(false), LOADING_FALLBACK_MS)
    return () => window.clearTimeout(timeoutId)
  }, [loading])

  useEffect(() => {
    if (authResolved) return undefined
    const timeoutId = window.setTimeout(() => setAuthResolved(true), LOADING_FALLBACK_MS)
    return () => window.clearTimeout(timeoutId)
  }, [authResolved])

  const getAllMembers = useCallback(() => members, [members])
  const getAdmins = useCallback(() => admins, [admins])

  const runSupabaseQuery = async (label, queryFactory) => {
    try {
      const { data, error } = await queryFactory()
      if (error) {
        console.warn(label, error)
        return { data: null, error }
      }
      return { data, error: null }
    } catch (error) {
      console.warn(label, error)
      return { data: null, error }
    }
  }

  const fetchProfileForAuthUser = async (authUser) => {
    if (!supabaseEnabled || !authUser?.id) return { profile: null, error: null }

    const now = Date.now()
    const cached = profileCache.get(authUser.id)
    if (cached) {
      const ttl = cached.profile ? PROFILE_CACHE_TTL_MS : PROFILE_NEGATIVE_CACHE_TTL_MS
      if (now - cached.at < ttl) {
        return { profile: cached.profile, error: cached.error || null }
      }
      profileCache.delete(authUser.id)
    }

    const inflight = profileInflight.get(authUser.id)
    if (inflight) return inflight

    const normalizedEmail = String(authUser.email || '').trim().toLowerCase()
    const normalizedIdNumber = String(authUser?.user_metadata?.id_number || '').trim()

    const promise = (async () => {
      let profile = null
      let lookupError = null
      let matchedBy = null

      const exactResult = await runSupabaseQuery('Failed to load profile by auth user id.', () =>
        supabase.from('profiles').select(PROFILE_SELECT_COLUMNS).eq('id', authUser.id).maybeSingle()
      )
      lookupError = exactResult?.error || null
      profile = exactResult?.data || null
      matchedBy = profile ? 'id' : null

      if (!profile && normalizedEmail) {
        const emailResult = await runSupabaseQuery('Failed to load profile by email.', () =>
          supabase.from('profiles').select(PROFILE_SELECT_COLUMNS).eq('email', normalizedEmail).maybeSingle()
        )
        lookupError = lookupError || emailResult?.error || null
        profile = emailResult?.data || null
        matchedBy = profile ? 'email' : matchedBy
      }

      if (!profile && normalizedIdNumber) {
        const idNumberResult = await runSupabaseQuery('Failed to load profile by id_number.', () =>
          supabase.from('profiles').select(PROFILE_SELECT_COLUMNS).eq('id_number', normalizedIdNumber).maybeSingle()
        )
        lookupError = lookupError || idNumberResult?.error || null
        profile = idNumberResult?.data || null
        matchedBy = profile ? 'id_number' : matchedBy
      }

      if (profile && profile.id !== authUser.id) {
        console.warn('Auth/profile ID mismatch detected.', {
          authUserId: authUser.id,
          profileId: profile.id,
          matchedBy,
          profileRole: profile.role || null,
        })
      }

      logSupabase('profile lookup result', {
        authUserId: authUser.id,
        matchedBy,
        profileId: profile?.id || null,
        profileRole: profile?.role || null,
        email: normalizedEmail || null,
        idNumber: normalizedIdNumber || null,
      })

      profileCache.set(authUser.id, { profile, error: lookupError || null, at: Date.now() })
      return { profile, error: lookupError || null }
    })().finally(() => {
      profileInflight.delete(authUser.id)
    })

    profileInflight.set(authUser.id, promise)
    return promise
  }

  const hydrateProfile = async (authUser, epoch) => {
    if (!supabaseEnabled || !authUser?.id) return null

    const { profile, error } = await fetchProfileForAuthUser(authUser)
    if (error) console.warn('Failed to load profile from Supabase.', error)

    const mapped = mapProfileToUser(profile, authUser)
    logSupabase('profile resolved', {
      authUserId: authUser.id,
      profileId: profile?.id || null,
      fetchedRole: profile?.role || null,
      appliedRole: mapped?.role || null,
    })

    if (epoch && epoch !== authEpochRef.current) return null
    applyMappedUserState(mapped, { setUser, setAppLanguageState, setDarkModeState, setSettingsState })
    return mapped
  }

  const mapProfilesToUsers = (data) => {
    return Array.isArray(data)
      ? data.map(profile =>
          enrichUserWithProfileImage({
            id: profile.id,
            profileId: profile.id,
            idNumber: profile.id_number || '',
            name: profile.name || '',
            email: profile.email || '',
            role: normalizeRole(profile.role),
            committee: profile.committee || '',
            contactNumber: profile.contact_number || '',
            address: profile.address || '',
            bloodType: profile.blood_type || '',
            memberSince: profile.member_since || new Date().toISOString(),
            profileImage: resolveProfileImageSrc(profile.profile_image),
            accountStatus: profile.account_status || 'Active',
            status: profile.status || 'active',
          })
        )
      : []
  }

  const sortUsersByName = (list) => {
    const items = Array.isArray(list) ? [...list] : []
    items.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' }))
    return items
  }

  useEffect(() => {
    setUsers(sortUsersByName([...(admins || []), ...(members || [])]))
  }, [admins, members])

  const upsertUserById = (list, nextUser) => {
    if (!nextUser?.id) return Array.isArray(list) ? list : []
    const items = Array.isArray(list) ? [...list] : []
    const id = String(nextUser.id)
    const index = items.findIndex(item => String(item?.id || '') === id)
    if (index === -1) {
      items.push(nextUser)
      return items
    }
    items[index] = { ...items[index], ...nextUser }
    return items
  }

  const removeUserById = (list, userId) => {
    const items = Array.isArray(list) ? list : []
    const id = String(userId || '')
    if (!id) return items
    const index = items.findIndex(item => String(item?.id || '') === id)
    if (index === -1) return items
    return [...items.slice(0, index), ...items.slice(index + 1)]
  }

  const sortCommittees = (list) => {
    const items = Array.isArray(list) ? list.map(name => String(name || '').trim()).filter(Boolean) : []
    const unique = [...new Set(items)]
    unique.sort((a, b) => a.localeCompare(b))
    return unique
  }

  const sortEventCategories = (list) => {
    const items = Array.isArray(list) ? list : []
    const normalized = items
      .map(name => toEventCategoryKey(name))
      .filter(Boolean)
    const unique = [...new Set(normalized)]
    unique.sort((a, b) => a.localeCompare(b))
    return unique
  }

  const reloadUsers = async () => {
    if (!supabaseEnabled) return []
    let data = []
    try {
      const res = await supabase
        .from('profiles')
        .select(PROFILE_LIST_COLUMNS)
        .order('name', { ascending: true })
      if (res.error) console.warn('Failed to load users from Supabase.', res.error)
      data = res.data
    } catch (error) {
      console.warn('Failed to load users from Supabase.', error)
    }

    const mapped = sortUsersByName(mapProfilesToUsers(data))
    setUsers(mapped)
    setMembers(mapped.filter(entry => entry?.role === 'member'))
    setAdmins(mapped.filter(entry => entry?.role === 'admin'))
    return mapped
  }

  const reloadMembers = async () => {
    const all = await reloadUsers()
    return all.filter(entry => entry?.role === 'member')
  }

  	  const reloadCommittees = async () => {
  	    if (!supabaseEnabled) return []
  	    let data = []
  	    try {
	      const res = await supabase.from('committees').select('name').order('name', { ascending: true })
	      if (res.error) console.warn('Failed to load committees from Supabase.', res.error)
	      data = res.data
  	    } catch (error) {
	      console.warn('Failed to load committees from Supabase.', error)
  	    }
  	    const names = sortCommittees(Array.isArray(data) ? data.map(row => row.name) : [])
  	    setCommittees(names)
  	    return names
  	  }

    const reloadEventCategories = async () => {
      if (!supabaseEnabled) return []
      let data = []
      try {
        const res = await supabase
          .from('event_categories')
          .select('name')
          .order('name', { ascending: true })
        if (res.error) console.warn('Failed to load event categories from Supabase.', res.error)
        data = res.data
      } catch (error) {
        console.warn('Failed to load event categories from Supabase.', error)
      }
      const categories = sortEventCategories(Array.isArray(data) ? data.map(row => row.name) : [])
      setEventCategories(categories)
      return categories
    }

  	  const reloadRecruitments = async (asAdmin) => {
  	    if (!supabaseEnabled) return
  	    if (!asAdmin) {
	      setRecruitments([])
	      return
	    }
	    let data = []
	    try {
	      const res = await supabase
          .from('recruitments')
          .select('id,full_name,email,id_number,contact_number,address,blood_type,insurance_status,insurance_year,status,submitted_at,processed_at,processed_by,notes')
          .order('submitted_at', { ascending: false })
	      if (res.error) console.warn('Failed to load recruitments from Supabase.', res.error)
	      data = res.data
	    } catch (error) {
	      console.warn('Failed to load recruitments from Supabase.', error)
	    }
	    const mapped = Array.isArray(data)
	      ? data.map(row => ({
	          id: row.id,
	          fullName: row.full_name,
          email: row.email,
          idNumber: row.id_number || '',
          contactNumber: row.contact_number,
          address: row.address,
          bloodType: row.blood_type,
          insuranceStatus: row.insurance_status,
          insuranceYear: row.insurance_year || '',
          status: row.status,
          submittedAt: row.submitted_at,
          reviewedAt: row.processed_at,
          reviewedBy: row.processed_by,
          notes: row.notes || '',
        }))
      : []
    setRecruitments(mapped)
  }

  const ensureAdminDataLoaded = useCallback(async () => {
    if (!supabaseEnabled) return
    if (user?.role !== 'admin') return

    if ((users && users.length) && (recruitments && recruitments.length)) return
    if (adminDataInflightRef.current) return adminDataInflightRef.current

    adminDataInflightRef.current = (async () => {
      if (!users || users.length === 0) {
        await reloadUsers()
      }
      if (!recruitments || recruitments.length === 0) {
        await reloadRecruitments(true)
      }
    })().finally(() => {
      adminDataInflightRef.current = null
    })

    return adminDataInflightRef.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseEnabled, user?.role, users, recruitments])

  useEffect(() => {
    if (!supabaseEnabled) {
      setLoading(false)
      setAuthResolved(true)
      return undefined
    }

    let disposed = false

    const applySignedOut = () => {
      authEpochRef.current += 1
      clearProfileCache()
      setUser(null)
      setUsers([])
      setMembers([])
      setAdmins([])
      setCommittees([])
      setEventCategories([])
      setRecruitments([])
      setAuthResolved(true)
      setLoading(false)
      lookupsUserIdRef.current = ''
      lookupsLoadedRef.current = false
    }

    const hydrateForUser = async (authUser, epoch) => {
      setLoading(true)
      try {
        await hydrateProfile(authUser, epoch)
        if (epoch !== authEpochRef.current || disposed) return

        if (lookupsUserIdRef.current !== authUser.id) {
          lookupsUserIdRef.current = authUser.id
          lookupsLoadedRef.current = false
        }

        if (!lookupsLoadedRef.current) {
          await reloadCommittees()
          await reloadEventCategories()
          lookupsLoadedRef.current = true
        }
      } finally {
        if (!disposed && epoch === authEpochRef.current) setLoading(false)
      }
    }

    const handleAuthChange = (event, session) => {
      if (disposed) return
      if (isSigningOutRef.current && event !== 'SIGNED_OUT' && event !== 'TOKEN_REFRESH_FAILED') return
      if (event === 'INITIAL_SESSION') {
        if (initialSessionHandledRef.current) return
        initialSessionHandledRef.current = true
      }

      if (debugSupabase) logSupabase('auth event', event)

      const authUser = session?.user || null
      if (!authUser?.id) {
        applySignedOut()
        return
      }

      const shouldHydrate =
        event === 'INITIAL_SESSION' || event === 'SIGNED_IN'
      if (!shouldHydrate) return

      // Make the UI react instantly: session exists, auth is resolved, stop auth-loading immediately.
      authEpochRef.current += 1
      clearProfileCache()
      const epoch = authEpochRef.current
      setAuthResolved(true)
      setLoading(false)
      setUser(mapProfileToUser(null, authUser))

      void hydrateForUser(authUser, epoch)
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange(event, session)
    })

    void supabase.auth
      .getSession()
      .then(({ data }) => handleAuthChange('INITIAL_SESSION', data?.session || null))
      .catch(() => setAuthResolved(true))

    return () => {
      disposed = true
      sub?.subscription?.unsubscribe?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseEnabled])

  useEffect(() => {
    if (!supabaseEnabled) return undefined

    const realtimeEnabled = String(import.meta.env.VITE_SUPABASE_ENABLE_REALTIME || '').toLowerCase() !== 'false'
    if (!realtimeEnabled) {
      const intervalId = window.setInterval(() => {
        void reloadCommittees()
      }, 15000)
      return () => window.clearInterval(intervalId)
    }

    let fallbackIntervalId
    let disposed = false

    const startFallbackPolling = () => {
      if (disposed || fallbackIntervalId) return
      fallbackIntervalId = window.setInterval(() => {
        void reloadCommittees()
      }, 15000)
    }

    const channel = supabase
      .channel('kusgan-committees')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'committees' },
        () => {
          void reloadCommittees()
        }
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startFallbackPolling()
          supabase.removeChannel(channel)
        }
      })

    const timeoutId = window.setTimeout(() => {
      startFallbackPolling()
      supabase.removeChannel(channel)
    }, 8000)

    return () => {
      disposed = true
      window.clearTimeout(timeoutId)
      if (fallbackIntervalId) window.clearInterval(fallbackIntervalId)
      supabase.removeChannel(channel)
    }
  }, [supabaseEnabled, reloadCommittees])

		  const login = async (identifier, password) => {
        if (loginRequestRef.current) return loginRequestRef.current

        const runLogin = async () => {
          if (logoutRequestRef.current) {
            await logoutRequestRef.current.catch(() => {})
          }

		    const normalizedIdentifier = String(identifier || '').trim()
		    const normalizedEmail = normalizedIdentifier.toLowerCase()
		    const trimmedPassword = password || ''
		    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)

		    if (!normalizedIdentifier || !trimmedPassword) {
		      return { success: false, message: 'ID number and password are required.' }
		    }

		    let emailForAuth = normalizedEmail
		    if (looksLikeEmail) {
		      return { success: false, message: 'Email sign-in is disabled. Please use your ID number.' }
		    }

		    const idNumber = normalizedIdentifier
		    try {
		      logSupabase('login start', { idNumber })
		      if (!supabaseUrl || !supabaseAnonKey) {
		        return { success: false, message: 'Supabase is not configured. Missing URL or anon key.' }
		      }

		      // Bypass supabase-js auth token lock by calling the RPC directly with the anon key.
		      const controller = new AbortController()
		      const timeoutId = window.setTimeout(() => controller.abort(), 15_000)
		      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_email_for_id_number`, {
		        method: 'POST',
		        headers: {
		          apikey: supabaseAnonKey,
		          Authorization: `Bearer ${supabaseAnonKey}`,
		          'Content-Type': 'application/json',
		        },
		        body: JSON.stringify({ p_id_number: idNumber }),
		        signal: controller.signal,
		      }).finally(() => window.clearTimeout(timeoutId))

		      let data
		      let error
		      if (!response.ok) {
		        const payload = await response.json().catch(() => ({}))
		        error = payload || { message: `RPC failed (HTTP ${response.status}).` }
		      } else {
		        data = await response.json().catch(() => null)
		      }
		      if (error) {
		        const msg = String(error.message || '')
		        const hint = String(error.hint || '')
		        const details = String(error.details || '')
		        console.warn('Failed to resolve email for ID number.', error)

		        if (error.code === 'PGRST202' || /could not find the function/i.test(msg)) {
		          return {
		            success: false,
		            message:
		              'ID Number Not Found',
		          }
		        }

		        if (error.code === '42501' || /permission/i.test(msg)) {
		          return {
		            success: false,
		            message:
		              'Supabase denied the ID lookup. Ensure get_email_for_id_number is SECURITY DEFINER and EXECUTE is granted to anon/authenticated.',
		          }
		        }

		        const extra = [details, hint].filter(Boolean).join(' ')
		        return {
		          success: false,
		          message: `Unable to use ID number login right now. ${msg}${extra ? ` (${extra})` : ''}`.trim(),
		        }
		      }
		      if (!data) {
		        return {
		          success: false,
		          message:
		            'No account found for that ID number. Ask an admin to set your ID number in the profiles table, then try again.',
		        }
		      }
		      emailForAuth = String(data || '').trim().toLowerCase()
		      if (emailForAuth) {
		        const masked = emailForAuth.includes('@')
		          ? `***@${emailForAuth.split('@').slice(1).join('@')}`
		          : '***'
		        logSupabase('login resolved idNumber', idNumber, '->', masked)
		      }
		      if (!emailForAuth) {
		        return {
		          success: false,
		          message:
		            'No account found for that ID number. Ask an admin to set your ID number in the profiles table, then try again.',
		        }
		      }
		    } catch (error) {
		      if (isAbortError(error)) {
		        logSupabase('login id lookup timeout')
		        return { success: false, message: 'ID number lookup timed out. Check Supabase URL/Anon key, then try again.' }
		      }
		      console.warn('Failed to resolve email for ID number.', error)
		      return { success: false, message: 'Unable to sign in with ID number right now. Please try again.' }
		    }

		    try {
          const { error } = await supabase.auth.signInWithPassword({
            email: emailForAuth,
            password: trimmedPassword,
          })
          if (error) {
            const msg = String(error.message || '')
            logSupabase('login signInWithPassword error', msg)
            if (/email not confirmed/i.test(msg)) {
              return { success: false, message: 'Email not confirmed yet. Please confirm your email and try again.' }
            }
            if (/invalid login credentials/i.test(msg)) {
              return { success: false, message: 'Invalid ID number or password.' }
            }
            return { success: false, message: msg || 'Login failed.' }
          }

          // UI hydration happens via onAuthStateChange.
          return { success: true }
		    } catch (err) {
		      const message = err?.message ? String(err.message) : ''
		      if (isAbortError(err)) return { success: false, message: 'Login request timed out. Please try again.' }
		      return { success: false, message: message || 'Login failed.' }
		    }
        }

        const request = runLogin().finally(() => {
          if (loginRequestRef.current === request) loginRequestRef.current = null
        })
        loginRequestRef.current = request
        return request
		  }

  const logout = async () => {
    if (logoutRequestRef.current) return logoutRequestRef.current

    isSigningOutRef.current = true
    loginRequestRef.current = null
    clearProfileCache()
    clearClientState()

    if (!supabaseEnabled) {
      isSigningOutRef.current = false
      return Promise.resolve()
    }

    const request = (async () => {
      try {
        await runAuthOperationWithRetry(() => supabase.auth.signOut(), { attempts: 1, timeoutMs: LOADING_FALLBACK_MS, queued: false })
      } catch (error) {
        if (!isAbortError(error)) {
          console.warn('Supabase signOut failed (state already cleared).', error)
        }
      } finally {
        clearSupabaseAuthLocalStorage()
        isSigningOutRef.current = false
        if (logoutRequestRef.current === request) logoutRequestRef.current = null
      }
    })()

    logoutRequestRef.current = request
    return request
  }

  const register = async (name, email, idNumber, password) => {
    const normalizedName = (name || '').trim()
    const normalizedEmail = (email || '').trim().toLowerCase()
    const normalizedIdNumber = (idNumber || '').trim()
    const trimmedPassword = password || ''

    if (!normalizedName || !normalizedEmail || !trimmedPassword) {
      return { success: false, message: 'Full Name, Email, and Password are required.' }
    }

    const { data, error } = await runAuthOperationWithRetry(() =>
      supabase.auth.signUp({
        email: normalizedEmail,
        password: trimmedPassword,
        options: {
          data: {
            name: normalizedName,
            id_number: normalizedIdNumber,
          },
        },
      })
    )

    if (error) return { success: false, message: error.message || 'Registration failed.' }

    const activeUser = data?.session?.user || data?.user || null
    if (activeUser?.id) {
      authEpochRef.current += 1
      const epoch = authEpochRef.current
      setAuthResolved(true)
      setUser(mapProfileToUser(null, activeUser))
      await hydrateProfile(activeUser, epoch)
      return { success: true, user: activeUser }
    }

    return { success: true, message: 'Registration successful. Please check your email to confirm your account.' }
  }

  const updateCurrentUser = async (updates = {}) => {
    if (!user?.id) return { success: false, message: 'User not found' }

    const name = updates.name?.trim()
    const email = updates.email?.trim().toLowerCase()
    if (!name || !email) return { success: false, message: 'Full Name and Email are required.' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: 'Please enter a valid email address.' }

    const address = updates.address?.toString().trim() ?? (user.address || '')
    const contactNumber = updates.contactNumber?.toString().trim() ?? (user.contactNumber || '')
    const bloodType = (updates.bloodType ?? user.bloodType ?? '').toString().toUpperCase()
    const hasProfileImageUpdate = Object.prototype.hasOwnProperty.call(updates, 'profileImage')
    const nextProfileImageRaw = hasProfileImageUpdate ? (updates.profileImage ?? '').toString().trim() : null
    const profileImageToStore = hasProfileImageUpdate ? normalizeProfileImageStorageValue(nextProfileImageRaw) : undefined

    if (email !== (user.email || '').trim().toLowerCase()) {
      try {
        const { error: emailError } = await runAuthOperationWithRetry(() => supabase.auth.updateUser({ email }))
        if (emailError) {
          return { success: false, message: emailError.message || 'Unable to update email.' }
        }
      } catch (error) {
        return { success: false, message: error.message || 'Unable to update email.' }
      }
    }

    const patch = {
      name,
      email,
      address,
      contact_number: contactNumber,
      blood_type: bloodType || null,
    }
    if (hasProfileImageUpdate) patch.profile_image = profileImageToStore

    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)

    if (error) return { success: false, message: error.message || 'Unable to update profile.' }

    setUser(prev =>
      prev
        ? {
            ...prev,
            name,
            email,
            address,
            contactNumber,
            bloodType,
            ...(hasProfileImageUpdate ? { profileImage: resolveProfileImageSrc(profileImageToStore) } : null),
          }
        : prev
    )
    setUsers(prev =>
      prev.map(member =>
        member?.id === user.id
          ? {
              ...member,
              name,
              email,
              address,
              contactNumber,
              bloodType,
              ...(hasProfileImageUpdate ? { profileImage: resolveProfileImageSrc(profileImageToStore) } : null),
            }
          : member
      )
    )

    const applyProfilePatch = (list) => {
      const items = Array.isArray(list) ? list : []
      return items.map(member =>
        member?.id === user.id
          ? {
              ...member,
              name,
              email,
              address,
              contactNumber,
              bloodType,
              ...(hasProfileImageUpdate ? { profileImage: resolveProfileImageSrc(profileImageToStore) } : null),
            }
          : member
      )
    }

    if (user.role === 'admin') {
      setAdmins((prev) => applyProfilePatch(prev))
    } else {
      setMembers((prev) => applyProfilePatch(prev))
    }
    authEpochRef.current += 1
    await hydrateProfile(
      {
        id: user.id,
        email,
        user_metadata: { name, id_number: user.idNumber || '' },
      },
      authEpochRef.current
    )
    return { success: true }
  }

  const uploadProfileImage = async (file) => {
    if (!supabaseEnabled) return { success: false, message: getSupabaseConfigError() || 'Supabase not configured.' }
    if (!user?.id) return { success: false, message: 'User not found.' }
    if (!file) return { success: false, message: 'No file selected.' }

    let accessToken = ''
    let authUserId = ''
    let jwtSub = ''
    let jwtAppRole = ''
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        if (debugSupabase) logSupabase('profile image session check failed', error)
        return { success: false, message: error.message || 'Session check failed. Please log in again.' }
      }
      accessToken = data?.session?.access_token || ''
      if (!accessToken) {
        return { success: false, message: 'Session expired. Please log in again.' }
      }

      authUserId = data?.session?.user?.id ? String(data.session.user.id) : ''
      const jwtPayload = decodeJwtPayload(accessToken)
      jwtSub = jwtPayload?.sub ? String(jwtPayload.sub) : ''
      jwtAppRole = jwtPayload?.app_metadata?.role ? String(jwtPayload.app_metadata.role) : ''
      const jwtDbRole = jwtPayload?.role ? String(jwtPayload.role) : ''
      const jwtAud = jwtPayload?.aud ? String(jwtPayload.aud) : ''
      const jwtIss = jwtPayload?.iss ? String(jwtPayload.iss) : ''

      if (debugSupabase) {
        logSupabase('profile image session summary', {
          authUserId: authUserId || null,
          profileUserId: user?.id ? String(user.id) : null,
          jwtSub: jwtSub || null,
          jwtAppRole: jwtAppRole || null,
          jwtDbRole: jwtDbRole || null,
          jwtAud: jwtAud || null,
          jwtIss: jwtIss || null,
        })
      }

      const expectedId = String(user.id)
      const tokenId = jwtSub || authUserId
      if (tokenId && expectedId && tokenId !== expectedId) {
        return {
          success: false,
          message:
            `You are logged in as ${tokenId}, but the app is trying to upload to ${expectedId}. `
            + 'Uploads are restricted to avatars/{your-user-id}/... by Storage RLS. '
            + 'Please log out/in and try again.',
        }
      }
    } catch {
      // If the session check fails unexpectedly, continue; upload will surface auth errors anyway.
    }

    const contentType = String(file.type || '').trim()
    if (!contentType.startsWith('image/')) return { success: false, message: 'Please select an image file.' }

    const safeExt = (() => {
      const raw = String(file.name || '').trim()
      const idx = raw.lastIndexOf('.')
      const ext = idx >= 0 ? raw.slice(idx + 1).toLowerCase() : ''
      return /^[a-z0-9]{1,8}$/.test(ext) ? ext : ''
    })()

    const uuid = typeof crypto !== 'undefined' && crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const filename = safeExt ? `${uuid}.${safeExt}` : uuid
    const path = `${PROFILE_IMAGE_PREFIX}/${user.id}/${filename}`

    if (debugSupabase) {
      logSupabase('profile image upload attempt', {
        bucket: PROFILE_IMAGE_BUCKET,
        path,
        authUserId: authUserId || null,
        jwtSub: jwtSub || null,
        jwtAppRole: jwtAppRole || null,
      })
    }

    // Preferred: upload via server route using service role (bypasses storage RLS safely).
    if (accessToken) {
      const apiResult = await uploadProfileImageViaApi({ file, contentType, accessToken })
      if (apiResult.ok && apiResult.path) {
        const uploadedPath = apiResult.path

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ profile_image: uploadedPath })
          .eq('id', user.id)

        if (profileError) {
          return { success: false, message: profileError.message || 'Unable to save profile image.' }
        }

        const { data } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(uploadedPath)
        const resolvedImage = resolveProfileImageSrc(uploadedPath)
        setUser(prev => (prev ? { ...prev, profileImage: resolvedImage } : prev))
        setUsers(prev => prev.map(member => (member?.id === user.id ? { ...member, profileImage: resolvedImage } : member)))
        if (user.role === 'admin') {
          setAdmins(prev => prev.map(member => (member?.id === user.id ? { ...member, profileImage: resolvedImage } : member)))
        } else {
          setMembers(prev => prev.map(member => (member?.id === user.id ? { ...member, profileImage: resolvedImage } : member)))
        }

        clearProfileCache()
        return { success: true, path: uploadedPath, publicUrl: data?.publicUrl || '' }
      }

      if (apiResult.status && apiResult.status !== 404) {
        return { success: false, message: `${apiResult.message || 'Upload denied.'} (HTTP ${apiResult.status || 0})` }
      }
    }

    let uploadResult
    try {
      uploadResult = await supabase.storage.from(PROFILE_IMAGE_BUCKET).upload(path, file, {
        upsert: true,
        contentType: contentType || undefined,
        cacheControl: '3600',
      })
    } catch (error) {
      if (debugSupabase) logSupabase('profile image upload exception', error)
      return { success: false, message: error?.message || 'Unable to upload image.' }
    }

    const uploadError = uploadResult?.error || null
    if (uploadError) {
      if (debugSupabase) logSupabase('profile image upload error', uploadError)
      const status = uploadError?.statusCode ? ` (HTTP ${uploadError.statusCode})` : ''
      const details = uploadError?.error ? `: ${uploadError.error}` : ''

      const message = String(uploadError.message || 'Unable to upload image.')
      const looksLikeAuthOrRls =
        /row[- ]level security/i.test(message)
        || /permission denied/i.test(message)
        || [400, 401, 403].includes(uploadError?.statusCode)

      // Fallback: if the client didn’t attach the access token, force an authenticated upload via REST.
      if (looksLikeAuthOrRls && accessToken) {
        try {
          const restResult = await uploadStorageObjectViaRest({
            bucket: PROFILE_IMAGE_BUCKET,
            path,
            file,
            contentType,
            accessToken,
          })

          if (restResult.ok) {
            uploadResult = { data: restResult.payload, error: null }
          } else {
            return {
              success: false,
              message: `${restResult.message || 'Upload denied.'} (HTTP ${restResult.status || 0})`,
            }
          }
        } catch (error) {
          if (debugSupabase) logSupabase('profile image upload REST fallback failed', error)
          // Fall through to the original error.
        }
      }

      if (uploadResult?.error) {
        return { success: false, message: message + details + status }
      }
    }

    const { data } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path)
    if (!data?.publicUrl) return { success: false, message: 'Upload succeeded but URL could not be generated.' }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ profile_image: path })
      .eq('id', user.id)

    if (profileError) {
      return { success: false, message: profileError.message || 'Unable to save profile image.' }
    }

    const resolvedImage = resolveProfileImageSrc(path)
    setUser(prev => (prev ? { ...prev, profileImage: resolvedImage } : prev))
    setUsers(prev =>
      prev.map(member =>
        member?.id === user.id ? { ...member, profileImage: resolvedImage } : member
      )
    )
    if (user.role === 'admin') {
      setAdmins(prev => prev.map(member => (member?.id === user.id ? { ...member, profileImage: resolvedImage } : member)))
    } else {
      setMembers(prev => prev.map(member => (member?.id === user.id ? { ...member, profileImage: resolvedImage } : member)))
    }

    clearProfileCache()
    return { success: true, path, publicUrl: data.publicUrl }
  }

  const uploadMemberProfileImage = async (memberId, file) => {
    if (!user?.id) return { success: false, message: 'User not found.' }
    if (user.role !== 'admin') return { success: false, message: 'Only admins can upload member images.' }

    const targetId = String(memberId || '').trim()
    if (!targetId) return { success: false, message: 'Member not found.' }
    if (!file) return { success: false, message: 'No file selected.' }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token || ''
    if (sessionError || !token) return { success: false, message: SESSION_EXPIRED_MESSAGE }

    const contentType = String(file.type || '').trim()
    if (!contentType.startsWith('image/')) return { success: false, message: 'Please select an image file.' }

    const apiResult = await uploadMemberProfileImageViaAdminApi({ memberId: targetId, file, contentType, accessToken: token })
    if (!apiResult.ok || !apiResult.path) {
      return {
        success: false,
        message: apiResult.message || `Unable to upload image (HTTP ${apiResult.status || 0}).`,
      }
    }

    const path = apiResult.path
    const { data } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path)
    const resolvedImage = resolveProfileImageSrc(path)

    setUsers(prev => prev.map(member => (member?.id === targetId ? { ...member, profileImage: resolvedImage } : member)))
    setAdmins(prev => prev.map(member => (member?.id === targetId ? { ...member, profileImage: resolvedImage } : member)))
    setMembers(prev => prev.map(member => (member?.id === targetId ? { ...member, profileImage: resolvedImage } : member)))
    if (String(user.id) === targetId) {
      setUser(prev => (prev ? { ...prev, profileImage: resolvedImage } : prev))
    }

    clearProfileCache()
    return { success: true, path, publicUrl: data?.publicUrl || '' }
  }

  const changeCurrentUserPassword = async (currentPassword, newPassword) => {
    if (!user?.email) return { success: false, message: 'User not found' }

    const trimmedCurrent = currentPassword?.trim() || ''
    const trimmedNew = newPassword?.trim() || ''
    if (!trimmedCurrent || !trimmedNew) return { success: false, message: 'Current and new password are required.' }
    if (trimmedNew.length < 6) return { success: false, message: 'New password must be at least 6 characters.' }

    const email = user.email?.trim().toLowerCase()
    if (!email) return { success: false, message: 'User not found' }

    const { data: sessionData, error: sessionError } = await runAuthOperationWithRetry(() => supabase.auth.getSession(), {
      attempts: 2,
      timeoutMs: 20_000,
      queued: false,
    })
    if (sessionError || !sessionData?.session) {
      if (isRefreshTokenError(sessionError)) {
        await runAuthOperationWithRetry(() => supabase.auth.signOut(), { attempts: 1, timeoutMs: 20_000, queued: false })
      }
      return { success: false, message: SESSION_EXPIRED_MESSAGE }
    }

    const { error: authError } = await runAuthOperationWithRetry(
      () =>
        supabase.auth.signInWithPassword({
          email,
          password: trimmedCurrent,
        }),
      { attempts: 1, timeoutMs: 20_000, queued: false }
    )

    if (authError) {
      if (isRefreshTokenError(authError)) {
        await runAuthOperationWithRetry(() => supabase.auth.signOut(), { attempts: 1, timeoutMs: 20_000, queued: false })
        return { success: false, message: SESSION_EXPIRED_MESSAGE }
      }
      return { success: false, message: 'Current password is incorrect.' }
    }

    const { error: updateError } = await runAuthOperationWithRetry(() => supabase.auth.updateUser({ password: trimmedNew }), {
      attempts: 1,
      timeoutMs: 20_000,
      queued: false,
    })
    if (updateError) {
      if (isRefreshTokenError(updateError)) {
        await runAuthOperationWithRetry(() => supabase.auth.signOut(), { attempts: 1, timeoutMs: 20_000, queued: false })
        return { success: false, message: SESSION_EXPIRED_MESSAGE }
      }
      return { success: false, message: updateError.message || 'Unable to update password.' }
    }
    return { success: true }
  }

  const updateMember = async (memberId, updates = {}) => {
    if (!user?.id) return { success: false, message: 'User not found.' }
    if (user.role !== 'admin') return { success: false, message: 'Only admins can update members.' }

    const requiresAdminEndpoint = Object.prototype.hasOwnProperty.call(updates, 'email')
      || Object.prototype.hasOwnProperty.call(updates, 'idNumber')
      || Object.prototype.hasOwnProperty.call(updates, 'password')
      || Object.prototype.hasOwnProperty.call(updates, 'newPassword')

    if (requiresAdminEndpoint) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (sessionError || !token) return { success: false, message: SESSION_EXPIRED_MESSAGE }

      let response
      try {
        response = await fetch('/api/admin/update-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: memberId, updates }),
        })
      } catch (error) {
        console.warn('Failed to reach admin update-user endpoint.', error)
        return { success: false, message: 'Unable to reach the server. Please try again.' }
      }

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { success: false, message: payload?.message || `Unable to update member (HTTP ${response.status}).` }
      }

      await reloadMembers()
      return { success: true }
    }

    const payload = {
      name: (updates.name ?? '').toString().trim() || null,
      committee: (updates.committee ?? '').toString().trim() || null,
      address: (updates.address ?? '').toString().trim() || null,
      contact_number: (updates.contactNumber ?? '').toString().trim() || null,
      blood_type: (updates.bloodType ?? '').toString().trim().toUpperCase() || null,
      account_status: (updates.accountStatus ?? 'Active').toString().trim() || 'Active',
      status: (updates.status ?? 'active').toString().trim() || 'active',
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', memberId)
    if (error) return { success: false, message: error.message || 'Unable to update member.' }
    return { success: true }
  }

  const deleteMembers = async (memberIds = []) => {
    if (!user?.id) return { success: false, message: 'User not found.' }
    if (user.role !== 'admin') return { success: false, message: 'Only admins can delete members.' }

    const ids = Array.isArray(memberIds)
      ? memberIds.map(id => String(id || '').trim()).filter(Boolean)
      : [String(memberIds || '').trim()].filter(Boolean)

    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length === 0) return { success: false, message: 'No members selected.' }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (sessionError || !token) return { success: false, message: SESSION_EXPIRED_MESSAGE }

    let response
    try {
      response = await fetch('/api/admin/delete-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: uniqueIds }),
      })
    } catch (error) {
      console.warn('Failed to reach admin delete-users endpoint.', error)
      return { success: false, message: 'Unable to reach the server. Please try again.' }
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { success: false, message: payload?.message || `Unable to delete members (HTTP ${response.status}).` }
    }

    if (Array.isArray(payload?.failed) && payload.failed.length > 0) {
      await reloadMembers()
      const first = payload.failed[0]
      return { success: false, message: first?.message || 'Some users could not be deleted.' }
    }

    await reloadMembers()
    return { success: true }
  }

  const addCommittee = async (committeeName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can add committees.' }
    const normalizedName = committeeName?.trim()
    if (!normalizedName) return { success: false, message: 'Committee name is required.' }
    const { error } = await supabase.from('committees').insert({ name: normalizedName })
    if (error) return { success: false, message: error.message || 'Unable to add committee.' }
    setCommittees(prev => sortCommittees([...(Array.isArray(prev) ? prev : []), normalizedName]))
    return { success: true }
  }

  const editCommittee = async (oldName, newName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can update committees.' }
    const source = oldName?.trim()
    const target = newName?.trim()
    if (!source || !target) return { success: false, message: 'Both current and new committee names are required.' }
    if (source === target) return { success: true }

    const { error } = await supabase.from('committees').update({ name: target }).eq('name', source)
    if (error) return { success: false, message: error.message || 'Unable to update committee.' }

    await supabase.from('profiles').update({ committee: target }).eq('committee', source)

    setCommittees(prev => sortCommittees((Array.isArray(prev) ? prev : []).map(name => (name === source ? target : name))))
    const patchCommittee = (list) =>
      (Array.isArray(list) ? list : []).map(entry =>
        entry?.committee === source ? { ...entry, committee: target } : entry
      )
    setUsers(prev => patchCommittee(prev))
    setMembers(prev => patchCommittee(prev))
    setAdmins(prev => patchCommittee(prev))

    return { success: true }
  }

  const deleteCommittee = async (committeeName, fallbackCommitteeName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can delete committees.' }
    const committee = committeeName?.trim()
    if (!committee) return { success: false, message: 'Committee not found.' }

    const fallbackCommittee = String(fallbackCommitteeName || '').trim()
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('committee', committee)
    if (countError) {
      console.warn('Failed to count committee assignments.', countError)
    }

    const assignedCount = Number(count || 0)
    if (assignedCount > 0 && !fallbackCommittee) {
      return { success: false, message: 'Reassign users to another committee before deleting this committee.' }
    }
    if (assignedCount > 0 && fallbackCommittee === committee) {
      return { success: false, message: 'Fallback committee must be different.' }
    }

    if (assignedCount > 0 && fallbackCommittee) {
      await supabase.from('profiles').update({ committee: fallbackCommittee }).eq('committee', committee)
    }

    const { data: deletedRows, error } = await supabase
      .from('committees')
      .delete()
      .eq('name', committee)
      .select('name')
    if (error) return { success: false, message: error.message || 'Unable to delete committee.' }
    if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
      return { success: false, message: 'Committee was not deleted (no matching record in Supabase).' }
    }

    setCommittees(prev => (Array.isArray(prev) ? prev : []).filter(name => name !== committee))
    const nextCommittee = fallbackCommittee || ''
    const patchCommittee = (list) =>
      (Array.isArray(list) ? list : []).map(entry =>
        entry?.committee === committee ? { ...entry, committee: nextCommittee } : entry
      )
    setUsers(prev => patchCommittee(prev))
    setMembers(prev => patchCommittee(prev))
    setAdmins(prev => patchCommittee(prev))
    return { success: true }
  }

  const addEventCategory = async (categoryName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can add event categories.' }
    const normalizedKey = toEventCategoryKey(categoryName)
    if (!normalizedKey) return { success: false, message: 'Category name is required.' }

    const { error } = await supabase.from('event_categories').insert({
      name: normalizedKey,
      created_by: user?.id || null,
    })

    if (error) return { success: false, message: error.message || 'Unable to add event category.' }
    setEventCategories(prev => sortEventCategories([...(Array.isArray(prev) ? prev : []), normalizedKey]))
    return { success: true, name: normalizedKey }
  }

  const editEventCategory = async (currentName, nextName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can update event categories.' }
    const source = toEventCategoryKey(currentName)
    const target = toEventCategoryKey(nextName)
    if (!source) return { success: false, message: 'Category not found.' }
    if (!target) return { success: false, message: 'Category name is required.' }
    if (source === target) return { success: true }

    const { error } = await supabase.from('event_categories').update({ name: target }).eq('name', source)
    if (error) return { success: false, message: error.message || 'Unable to update event category.' }

    await supabase.from('events').update({ category: target }).eq('category', source)
    await supabase.from('notifications').update({ category: target }).eq('category', source)

    setEventCategories(prev => sortEventCategories((Array.isArray(prev) ? prev : []).map(name => (name === source ? target : name))))
    return { success: true }
  }

  const deleteEventCategory = async (categoryName, fallbackCategoryName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can delete event categories.' }
    const key = toEventCategoryKey(categoryName)
    if (!key) return { success: false, message: 'Category not found.' }

    const fallback = fallbackCategoryName ? toEventCategoryKey(fallbackCategoryName) : ''
    if (fallback && fallback === key) return { success: false, message: 'Fallback category must be different.' }

    const { count, error: countError } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('category', key)

    if (countError) {
      console.warn('Failed to count events for category.', countError)
    }

    const assignedCount = Number(count || 0)
    if (assignedCount > 0 && !fallback) {
      return { success: false, message: 'Reassign events to another category before deleting this category.' }
    }

    if (assignedCount > 0 && fallback) {
      await supabase.from('events').update({ category: fallback }).eq('category', key)
      await supabase.from('notifications').update({ category: fallback }).eq('category', key)
    }

    const { data: deletedRows, error } = await supabase
      .from('event_categories')
      .delete()
      .eq('name', key)
      .select('name')
    if (error) return { success: false, message: error.message || 'Unable to delete event category.' }
    if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
      return { success: false, message: 'Category was not deleted (no matching record in Supabase).' }
    }

    setEventCategories(prev => (Array.isArray(prev) ? prev : []).filter(name => name !== key))
    return { success: true, reassignedTo: fallback || null }
  }

  const submitRecruitmentApplication = async (applicationData = {}) => {
    const fullName = applicationData.fullName?.trim()
    const email = applicationData.email?.trim().toLowerCase()
    const idNumber = applicationData.idNumber?.trim() || ''
    const contactNumber = applicationData.contactNumber?.trim()
    const address = applicationData.address?.trim()
    const bloodType = applicationData.bloodType?.trim().toUpperCase()
    const insuranceStatus = applicationData.insuranceStatus === 'Insured' ? 'Insured' : 'N/A'
    const insuranceYearRaw = String(applicationData.insuranceYear || '').trim()
    const insuranceYear = insuranceStatus === 'Insured' ? insuranceYearRaw : ''
    const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

    if (!fullName || !email || !contactNumber || !address || !bloodType) {
      return { success: false, message: 'All fields are required.' }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: 'Please enter a valid email address.' }
    if (idNumber && !/^[a-zA-Z0-9]+$/.test(idNumber)) return { success: false, message: 'ID Number must be alphanumeric.' }
    if (!/^\+?[0-9\-\s]{7,15}$/.test(contactNumber)) return { success: false, message: 'Please enter a valid contact number.' }
    if (!validBloodTypes.includes(bloodType)) return { success: false, message: 'Please select a valid blood type.' }

    if (insuranceStatus === 'Insured') {
      if (!insuranceYear) return { success: false, message: 'Insurance year is required when insured.' }
      if (!/^\d{4}$/.test(insuranceYear)) return { success: false, message: 'Insurance year must be a 4-digit year.' }
      const yearNumber = Number(insuranceYear)
      const maxYear = dayjs().year() + 1
      if (Number.isNaN(yearNumber) || yearNumber < 1900 || yearNumber > maxYear) {
        return { success: false, message: `Insurance year must be between 1900 and ${maxYear}.` }
      }
    }

    const { error } = await supabase.from('recruitments').insert({
      full_name: fullName,
      email,
      id_number: idNumber || null,
      contact_number: contactNumber,
      address,
      blood_type: bloodType,
      insurance_status: insuranceStatus,
      insurance_year: insuranceYear || null,
      status: 'pending',
    })

    if (error) {
      if (error.code === '23505') return { success: false, message: 'This email already has a recruitment entry.' }
      return { success: false, message: error.message || 'Unable to submit recruitment.' }
    }

    return { success: true }
  }

  const rejectRecruitment = async (recruitmentId) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can process recruitments.' }
    const processedAt = dayjs().toISOString()
    const processedBy = user?.id || null
    const { error } = await supabase
      .from('recruitments')
      .update({ status: 'rejected', processed_at: processedAt, processed_by: processedBy })
      .eq('id', recruitmentId)
    if (error) return { success: false, message: error.message || 'Unable to reject recruitment.' }

    setRecruitments(prev =>
      prev.map(item =>
        item.id === recruitmentId ? { ...item, status: 'rejected', reviewedAt: processedAt, reviewedBy: processedBy } : item
      )
    )
    return { success: true }
  }

	  const getRecruitments = () => [...recruitments]

	  const createMember = async (memberData = {}) => {
	    if (user?.role !== 'admin') return { success: false, message: 'Only admins can create members.' }

	    const name = String(memberData.name || '').trim()
	    const idNumber = String(memberData.idNumber || memberData.id_number || '').trim()
	    const password = String(memberData.password || '').trim()
	    const role = memberData.role === 'admin' ? 'admin' : 'member'

	    if (!name || !idNumber || !password) {
	      return { success: false, message: 'Name, ID number, and password are required.' }
	    }

	    const { data: sessionData, error: sessionError } = await runAuthOperationWithRetry(() => supabase.auth.getSession(), {
	      attempts: 2,
	      timeoutMs: 20_000,
	      queued: false,
	    })
	    if (sessionError || !sessionData?.session?.access_token) {
	      if (isRefreshTokenError(sessionError)) {
	        await runAuthOperationWithRetry(() => supabase.auth.signOut(), { attempts: 1, timeoutMs: 20_000, queued: false })
	      }
	      return { success: false, message: SESSION_EXPIRED_MESSAGE }
	    }

	    let response
	    try {
	      response = await fetch('/api/admin/create-user', {
	        method: 'POST',
	        headers: {
	          'Content-Type': 'application/json',
	          Authorization: `Bearer ${sessionData.session.access_token}`,
	        },
	        body: JSON.stringify({
	          name,
	          idNumber,
	          password,
	          role,
            status: memberData.status || 'active',
            accountStatus: memberData.accountStatus || 'Active',
	          committee: memberData.committee || null,
	          address: memberData.address || null,
	          contactNumber: memberData.contactNumber || null,
	          bloodType: memberData.bloodType || null,
	          memberSince: memberData.memberSince || null,
	        }),
	      })
	    } catch (error) {
	      console.warn('Failed to reach admin create-user endpoint.', error)
	      return { success: false, message: 'Unable to reach the server. Please try again.' }
	    }

	    logSupabase('create-user response status', response.status)

	    if (response.status === 404) {
	      return {
	        success: false,
	        message:
	          'Admin API route not found. If you are running locally, start the app with `npm run dev:vercel` and open the Vercel dev URL (usually http://localhost:3000).',
	      }
	    }

	    const payload = await response.json().catch(() => ({}))
	    if (!response.ok) {
	      const statusHint = response.status ? ` (HTTP ${response.status})` : ''
	      return { success: false, message: payload?.message || `Unable to create member.${statusHint}` }
	    }

      const createdUserId = payload?.userId ? String(payload.userId) : ''
      const createdEmail = payload?.email ? String(payload.email) : ''

      if (createdUserId) {
        const createdUser = enrichUserWithProfileImage({
          id: createdUserId,
          profileId: createdUserId,
          idNumber,
          name,
          email: createdEmail,
          role,
          committee: memberData.committee || '',
          contactNumber: memberData.contactNumber || '',
          address: memberData.address || '',
          bloodType: memberData.bloodType || '',
          memberSince: memberData.memberSince || new Date().toISOString(),
          profileImage: DEFAULT_PROFILE_IMAGE,
          accountStatus: 'Active',
          status: 'active',
        })

        if (role === 'admin') {
          setAdmins(prev => sortUsersByName(upsertUserById(prev, createdUser)))
          setMembers(prev => removeUserById(prev, createdUserId))
        } else {
          setMembers(prev => sortUsersByName(upsertUserById(prev, createdUser)))
          setAdmins(prev => removeUserById(prev, createdUserId))
        }
      }

	    if (memberData.recruitmentId) {
        const processedAt = dayjs().toISOString()
        const processedBy = user?.id || null
	      await supabase
	        .from('recruitments')
	        .update({ status: 'approved', processed_at: processedAt, processed_by: processedBy })
	        .eq('id', memberData.recruitmentId)

        setRecruitments(prev =>
          prev.map(item =>
            item.id === memberData.recruitmentId
              ? { ...item, status: 'approved', reviewedAt: processedAt, reviewedBy: processedBy }
              : item
          )
        )
	    }

	    return { success: true, userId: createdUserId || null, email: createdEmail || null }
	  }

  const setAppLanguage = async (nextLanguage) => {
    const value = String(nextLanguage || '').trim() || 'English'
    setAppLanguageState(value)
    document.documentElement.setAttribute('lang', value === 'Filipino' ? 'fil' : value === 'Bisaya' ? 'ceb' : 'en')
    if (!user?.id) return { success: true }
    const { error } = await supabase.from('profiles').update({ app_language: value }).eq('id', user.id)
    if (error) return { success: false, message: error.message || 'Unable to save language.' }
    return { success: true }
  }

  const setDarkMode = async (nextDarkMode) => {
    const value = Boolean(nextDarkMode)
    setDarkModeState(value)
    if (!user?.id) return { success: true }
    const { error } = await supabase.from('profiles').update({ dark_mode: value }).eq('id', user.id)
    if (error) return { success: false, message: error.message || 'Unable to save theme.' }
    return { success: true }
  }

  const saveSettings = async (nextSettings) => {
    const value = nextSettings && typeof nextSettings === 'object' ? nextSettings : {}
    setSettingsState(value)
    if (!user?.id) return { success: true }
    const { error } = await supabase.from('profiles').update({ settings: value }).eq('id', user.id)
    if (error) return { success: false, message: error.message || 'Unable to save settings.' }
    return { success: true }
  }

  useEffect(() => {
    document.documentElement.setAttribute('lang', appLanguage === 'Filipino' ? 'fil' : appLanguage === 'Bisaya' ? 'ceb' : 'en')
  }, [appLanguage])

  const logoutFnRef = useRef(null)
  logoutFnRef.current = logout

  useEffect(() => {
    if (!supabaseEnabled) return undefined
    if (!user?.id) return undefined

    let timeoutId = null

    const scheduleLogout = () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        void logoutFnRef.current?.()
      }, IDLE_LOGOUT_MS)
    }

    const handleActivity = () => scheduleLogout()
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

    scheduleLogout()
    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true })
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      for (const event of events) {
        window.removeEventListener(event, handleActivity)
      }
    }
  }, [supabaseEnabled, user?.id])

  const value = {
    supabaseEnabled,
    supabaseConfigError,
    user,
    authResolved,
    loading,
    committees,
    eventCategories,
    appLanguage,
    setAppLanguage,
    darkMode,
    setDarkMode,
    settings,
    saveSettings,
    members,
    admins,
    users,
    login,
    logout,
    register,
    updateCurrentUser,
    uploadProfileImage,
    uploadMemberProfileImage,
 	    changeCurrentUserPassword,
 	    getAllMembers,
      getAdmins,
      ensureAdminDataLoaded,
 	    createMember,
	    deleteMembers,
    updateMember,
    addCommittee,
    editCommittee,
    deleteCommittee,
    addEventCategory,
    editEventCategory,
    deleteEventCategory,
    submitRecruitmentApplication,
    rejectRecruitment,
    getRecruitments,
  }

  if (!supabaseEnabled) {
    const ctx = emptyContext(supabaseConfigError)
    return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}



// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
