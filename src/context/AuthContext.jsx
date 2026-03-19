import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { getSupabaseConfigError, isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from '../lib/supabaseClient'

const AuthContext = createContext(null)

const debugSupabase = String(import.meta.env.VITE_DEBUG_SUPABASE || '').trim().toLowerCase() === 'true'
const logSupabase = (...args) => {
  if (!debugSupabase) return
  console.info('[supabase]', ...args)
}

const DEFAULT_PROFILE_IMAGE = '/image-removebg-preview.png'
const DEFAULT_MEMBER_CATEGORY = 'General Member'
const SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.'
const LOADING_FALLBACK_MS = 3_000
const PROFILE_CACHE_TTL_MS = 30_000
const PROFILE_NEGATIVE_CACHE_TTL_MS = 2_000
const PROFILE_IMAGE_BUCKET = 'profile-images'
const PROFILE_IMAGE_PREFIX = 'avatars'

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

const resolveProfileImageSrc = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return DEFAULT_PROFILE_IMAGE
  if (raw === DEFAULT_PROFILE_IMAGE) return raw
  if (raw.startsWith('/')) return raw
  if (isLikelyExternalUrl(raw) || isLikelyDataUrl(raw)) return raw

  // Treat as Supabase Storage object path. This requires the bucket to be public.
  try {
    const { data } = supabase?.storage?.from?.(PROFILE_IMAGE_BUCKET)?.getPublicUrl?.(raw) || {}
    if (data?.publicUrl) return data.publicUrl
  } catch {
    // Ignore and fall back to default.
  }

  return DEFAULT_PROFILE_IMAGE
}

const splitCategoryAndType = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return { category: '', type: '' }
  const parts = raw.split(' - ')
  if (parts.length === 1) return { category: parts[0], type: 'General' }
  const category = parts.shift()?.trim() || ''
  const type = parts.join(' - ').trim() || 'General'
  return { category, type }
}

const normalizeCategoryKey = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

const OPERATION_KEY_ALIASES = {
  relief_operations: 'relief_operation',
  fire_responses: 'fire_response',
  water_distributions: 'water_distribution',
  blood_lettings: 'blood_letting',
}

const canonicalizeCategoryKey = key => OPERATION_KEY_ALIASES[key] || key

const buildCategoryKeyFromCommitteeEntry = (committeeEntry) => {
  const { category } = splitCategoryAndType(committeeEntry)
  if (!category) return ''
  return canonicalizeCategoryKey(normalizeCategoryKey(category))
}

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
    category: profile?.category || (role === 'admin' ? 'Administrator' : DEFAULT_MEMBER_CATEGORY),
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
  utilitiesByCommittee: {},
  appLanguage: 'English',
  darkMode: false,
  settings: {},
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
  addUtilityItem: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  editUtilityItem: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
  deleteUtilityItem: async () => ({ success: false, message: configError || 'Supabase not configured.' }),
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
  const [committees, setCommittees] = useState([])
  const [utilitiesByCommittee, setUtilitiesByCommittee] = useState({})
  const [recruitments, setRecruitments] = useState([])
  const authEpochRef = useRef(0)
  const initialSessionHandledRef = useRef(false)

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
    setCommittees([])
    setUtilitiesByCommittee({})
    setRecruitments([])
    setLoading(false)
    setAuthResolved(true)
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

  const getAllMembers = useMemo(() => {
    return () => users
  }, [users])

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
      const [exactResult, emailResult, idNumberResult] = await Promise.all([
        runSupabaseQuery('Failed to load profile by auth user id.', () =>
          supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
        ),
        normalizedEmail
          ? runSupabaseQuery('Failed to load profile by email.', () =>
              supabase.from('profiles').select('*').eq('email', normalizedEmail).limit(1).maybeSingle()
            )
          : Promise.resolve({ data: null, error: null }),
        normalizedIdNumber
          ? runSupabaseQuery('Failed to load profile by id_number.', () =>
              supabase.from('profiles').select('*').eq('id_number', normalizedIdNumber).limit(1).maybeSingle()
            )
          : Promise.resolve({ data: null, error: null }),
      ])

      const exactProfile = exactResult?.data || null
      const emailProfile = emailResult?.data || null
      const idNumberProfile = idNumberResult?.data || null
      const lookupError = exactResult?.error || emailResult?.error || idNumberResult?.error || null

      const profile = exactProfile || emailProfile || idNumberProfile || null
      const matchedBy = exactProfile
        ? 'id'
        : emailProfile
          ? 'email'
          : idNumberProfile
            ? 'id_number'
            : null

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

const reloadMembers = async (roleFilter = 'all') => {
	    if (!supabaseEnabled) return
	    let data = []
	    try {
	      let query = supabase.from('profiles').select('*').order('name', { ascending: true })
	      if (roleFilter !== 'all') {
	        query = query.eq('role', roleFilter)
	      }
	      const res = await query
	      if (res.error) console.warn('Failed to load members from Supabase.', res.error)
	      data = res.data
	    } catch (error) {
	      console.warn('Failed to load members from Supabase.', error)
	    }
	    const mapped = Array.isArray(data)
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
    setUsers(mapped)
  }
  
  const getMembers = useMemo(() => {
    return (role = 'all') => {
      if (role === 'all') return users
      return users.filter(member => member.role === role)
    }
  }, [users])

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
	    const names = Array.isArray(data) ? data.map(row => row.name).filter(Boolean) : []
	    setCommittees(names)
	    return names
	  }

	  const reloadUtilities = async (committeeList = committees) => {
	    if (!supabaseEnabled) return
	    let data = []
	    try {
	      const res = await supabase
	        .from('committee_utilities')
	        .select('committee_name,name')
	        .order('committee_name', { ascending: true })
	        .order('name', { ascending: true })
	      if (res.error) console.warn('Failed to load committee utilities from Supabase.', res.error)
	      data = res.data
	    } catch (error) {
	      console.warn('Failed to load committee utilities from Supabase.', error)
	    }

	    const map = {}
	    committeeList.forEach(name => {
      map[name] = []
    })
    if (Array.isArray(data)) {
      data.forEach(row => {
        if (!row?.committee_name || !row?.name) return
        if (!map[row.committee_name]) map[row.committee_name] = []
        map[row.committee_name].push(row.name)
      })
    }
    setUtilitiesByCommittee(map)
  }

	  const reloadRecruitments = async (asAdmin) => {
	    if (!supabaseEnabled) return
	    if (!asAdmin) {
	      setRecruitments([])
	      return
	    }
	    let data = []
	    try {
	      const res = await supabase.from('recruitments').select('*').order('submitted_at', { ascending: false })
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
      setCommittees([])
      setUtilitiesByCommittee({})
      setRecruitments([])
      setAuthResolved(true)
      setLoading(false)
    }

    const hydrateForUser = async (authUser, epoch) => {
      setLoading(true)
      try {
        const profileUser = await hydrateProfile(authUser, epoch)
        if (epoch !== authEpochRef.current || disposed) return

        const isAdmin = profileUser?.role === 'admin'

        const committeeListPromise = reloadCommittees()
        await Promise.all([
          reloadMembers(),
          committeeListPromise.then(list => reloadUtilities(list)),
          reloadRecruitments(Boolean(isAdmin)),
        ])
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
  }, [supabaseEnabled])

  useEffect(() => {
    if (!supabaseEnabled || !user?.id) return undefined

    const committeesChannel = supabase
      .channel(`kusgan-committees-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'committees' }, async () => {
        const committeeList = await reloadCommittees()
        await reloadUtilities(committeeList)
      })
      .subscribe((status) => logSupabase('realtime committees', status))

    const utilitiesChannel = supabase
      .channel(`kusgan-committee-utilities-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'committee_utilities' }, () => reloadUtilities())
      .subscribe((status) => logSupabase('realtime committee_utilities', status))

const profilesChannel = supabase
      .channel(`kusgan-profiles-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => reloadMembers())
      .subscribe((status) => logSupabase('realtime profiles', status))

    const recruitmentsChannel = user.role === 'admin'
      ? supabase
          .channel(`kusgan-recruitments-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'recruitments' }, () => reloadRecruitments(true))
          .subscribe((status) => logSupabase('realtime recruitments', status))
      : null

    return () => {
      supabase.removeChannel(committeesChannel)
      supabase.removeChannel(utilitiesChannel)
      supabase.removeChannel(profilesChannel)
      if (recruitmentsChannel) supabase.removeChannel(recruitmentsChannel)
    }
  }, [supabaseEnabled, user?.id, user?.role])

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
    const profileImageToStore = hasProfileImageUpdate ? (nextProfileImageRaw || null) : undefined

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

    const { error: uploadError } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).upload(path, file, {
      upsert: true,
      contentType: contentType || undefined,
      cacheControl: '3600',
    })

    if (uploadError) return { success: false, message: uploadError.message || 'Unable to upload image.' }

    const { data } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path)
    if (!data?.publicUrl) return { success: false, message: 'Upload succeeded but URL could not be generated.' }

    return { success: true, path, publicUrl: data.publicUrl }
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

    const hasIdentityEdits = Object.prototype.hasOwnProperty.call(updates, 'email') || Object.prototype.hasOwnProperty.call(updates, 'idNumber')

    if (hasIdentityEdits) {
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
      category: (updates.category ?? '').toString().trim() || null,
      address: (updates.address ?? '').toString().trim() || null,
      contact_number: (updates.contactNumber ?? '').toString().trim() || null,
      blood_type: (updates.bloodType ?? '').toString().trim().toUpperCase() || null,
      account_status: (updates.accountStatus ?? 'Active').toString().trim() || 'Active',
      status: (updates.status ?? 'active').toString().trim() || 'active',
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', memberId)
    if (error) return { success: false, message: error.message || 'Unable to update member.' }
    await reloadMembers()
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
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can add categories.' }
    const normalizedName = committeeName?.trim()
    if (!normalizedName) return { success: false, message: 'Category name is required.' }
    const { error } = await supabase.from('committees').insert({ name: normalizedName, created_by: user?.id || null })
    if (error) return { success: false, message: error.message || 'Unable to add category.' }
    return { success: true }
  }

  const editCommittee = async (oldName, newName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can update categories.' }
    const source = oldName?.trim()
    const target = newName?.trim()
    if (!source || !target) return { success: false, message: 'Both current and new category names are required.' }
    if (source === target) return { success: true }

    const sourceKey = buildCategoryKeyFromCommitteeEntry(source)
    const targetKey = buildCategoryKeyFromCommitteeEntry(target)

    const { error } = await supabase.from('committees').update({ name: target }).eq('name', source)
    if (error) return { success: false, message: error.message || 'Unable to update category.' }

    await supabase.from('profiles').update({ committee: target }).eq('committee', source)

    if (sourceKey && targetKey && sourceKey !== targetKey) {
      await supabase.from('events').update({ category: targetKey }).eq('category', sourceKey)
    }

    return { success: true }
  }

  const deleteCommittee = async (committeeName, fallbackCommitteeName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can delete categories.' }
    const committee = committeeName?.trim()
    if (!committee) return { success: false, message: 'Category not found.' }

    const fallbackCommittee = (fallbackCommitteeName || committees.find(item => item !== committee) || '').trim()
    if (!fallbackCommittee) return { success: false, message: 'At least one category must remain.' }

    const oldKey = buildCategoryKeyFromCommitteeEntry(committee)

    await supabase.from('profiles').update({ committee: fallbackCommittee }).eq('committee', committee)
    if (oldKey) {
      await supabase.from('events').update({ category: 'notes' }).eq('category', oldKey)
    }

    const { error } = await supabase.from('committees').delete().eq('name', committee)
    if (error) return { success: false, message: error.message || 'Unable to delete category.' }
    return { success: true }
  }

  const addUtilityItem = async (committeeName, itemName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can manage utilities.' }
    const committee = committeeName?.trim()
    const item = itemName?.trim()
    if (!committee || !item) return { success: false, message: 'Category and utility item are required.' }
    const { error } = await supabase.from('committee_utilities').insert({ committee_name: committee, name: item, created_by: user?.id || null })
    if (error) return { success: false, message: error.message || 'Unable to add utility item.' }
    return { success: true }
  }

  const editUtilityItem = async (committeeName, oldItemName, newItemName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can manage utilities.' }
    const committee = committeeName?.trim()
    const oldItem = oldItemName?.trim()
    const newItem = newItemName?.trim()
    if (!committee || !oldItem || !newItem) return { success: false, message: 'Category, current item, and new item are required.' }
    const { error } = await supabase.from('committee_utilities').update({ name: newItem }).eq('committee_name', committee).eq('name', oldItem)
    if (error) return { success: false, message: error.message || 'Unable to update utility item.' }
    return { success: true }
  }

  const deleteUtilityItem = async (committeeName, itemName) => {
    if (user?.role !== 'admin') return { success: false, message: 'Only admins can manage utilities.' }
    const committee = committeeName?.trim()
    const item = itemName?.trim()
    if (!committee || !item) return { success: false, message: 'Category and utility item are required.' }
    const { error } = await supabase.from('committee_utilities').delete().eq('committee_name', committee).eq('name', item)
    if (error) return { success: false, message: error.message || 'Unable to delete utility item.' }
    return { success: true }
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
    const { error } = await supabase
      .from('recruitments')
      .update({ status: 'rejected', processed_at: dayjs().toISOString(), processed_by: user?.id || null })
      .eq('id', recruitmentId)
    if (error) return { success: false, message: error.message || 'Unable to reject recruitment.' }
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
	          committee: memberData.committee || null,
	          category: memberData.category || null,
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

	    if (memberData.recruitmentId) {
	      await supabase
	        .from('recruitments')
	        .update({ status: 'approved', processed_at: dayjs().toISOString(), processed_by: user?.id || null })
	        .eq('id', memberData.recruitmentId)
	    }

	    await reloadMembers()
	    return { success: true, userId: payload?.userId || null }
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

  const value = {
    supabaseEnabled,
    supabaseConfigError,
    user,
    authResolved,
    loading,
    committees,
    utilitiesByCommittee,
    appLanguage,
    setAppLanguage,
    darkMode,
    setDarkMode,
    settings,
    saveSettings,
    users,
    login,
    logout,
    register,
    updateCurrentUser,
    uploadProfileImage,
	    changeCurrentUserPassword,
	    getAllMembers,
	    createMember,
	    deleteMembers,
    updateMember,
    addCommittee,
    editCommittee,
    deleteCommittee,
    addUtilityItem,
    editUtilityItem,
    deleteUtilityItem,
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
