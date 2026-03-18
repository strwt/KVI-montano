import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

let authQueue = Promise.resolve()

const queueAuthOperation = (operation) => {
  const next = authQueue.then(operation, operation)
  authQueue = next.catch(() => {})
  return next
}

const DEFAULT_PROFILE_IMAGE = '/image-removebg-preview.png'
const DEFAULT_MEMBER_CATEGORY = 'General Member'
const SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.'

const isRefreshTokenError = (error) => {
  const message = error?.message ? String(error.message) : ''
  return /refresh token/i.test(message)
}

const enrichUserWithProfileImage = (user = {}) => ({
  ...user,
  profileImage: user.profileImage || DEFAULT_PROFILE_IMAGE,
})

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
  if (!profile && !authUser) return null

  const id = profile?.id || authUser?.id || null
  if (!id) return null

  const name = profile?.name || authUser?.user_metadata?.name || ''
  const email = profile?.email || authUser?.email || ''
  const role = profile?.role || 'member'

  return enrichUserWithProfileImage({
    id,
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
    profileImage: profile?.profile_image || DEFAULT_PROFILE_IMAGE,
    accountStatus: profile?.account_status || 'Active',
    status: profile?.status || 'active',
    appLanguage: profile?.app_language || 'English',
    darkMode: Boolean(profile?.dark_mode),
    settings: profile?.settings && typeof profile.settings === 'object' ? profile.settings : {},
  })
}

const emptyContext = (configError) => ({
  supabaseEnabled: false,
  supabaseConfigError: configError,
  user: null,
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
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [committees, setCommittees] = useState([])
  const [utilitiesByCommittee, setUtilitiesByCommittee] = useState({})
  const [recruitments, setRecruitments] = useState([])

  const isAuthLockError = (error) => {
    if (!error) return false
    if (error.name === 'AbortError') return true
    return /lock/i.test(error.message || '')
  }

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const runAuthOperationWithRetry = (operation, attempts = 2, timeoutMs = 20_000) =>
    queueAuthOperation(async () => {
      let lastError
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            const timerId = setTimeout(() => {
              clearTimeout(timerId)
              const err = new Error('Auth request timed out.')
              err.name = 'AbortError'
              reject(err)
            }, timeoutMs)
          })
          return await Promise.race([operation(), timeoutPromise])
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
    })
  const [appLanguage, setAppLanguageState] = useState('English')
  const [darkMode, setDarkModeState] = useState(false)
  const [settings, setSettingsState] = useState({})

  const getAllMembers = useMemo(() => {
    return () => users
  }, [users])

	  const recordDailyPresenceSupabase = async (userId) => {
	    if (!supabaseEnabled || !userId) return
	    const todayKey = dayjs().format('YYYY-MM-DD')
	    const { error } = await supabase
	      .from('login_activity')
	      .upsert(
	        {
	          user_id: userId,
	          date: todayKey,
	          last_login_at: new Date().toISOString(),
	          is_online: true,
	          last_status_at: new Date().toISOString(),
	        },
	        { onConflict: 'user_id,date' }
	      )

	    if (!error) return

	    const errorMessage = String(error.message || '')
	    const conflictTargetMissing =
	      error.code === '42P10' || /no unique|ON CONFLICT/i.test(errorMessage) || /on_conflict/i.test(errorMessage)

	    if (!conflictTargetMissing) {
	      console.warn('Failed to record daily presence in login_activity.', error)
	      return
	    }

	    const fallback = await supabase.from('login_activity').insert({
	      user_id: userId,
	      date: todayKey,
	      last_login_at: new Date().toISOString(),
	      is_online: true,
	      last_status_at: new Date().toISOString(),
	    })

	    if (fallback.error) {
	      console.warn('Failed to record daily presence in login_activity (fallback insert).', fallback.error)
	    }
	  }

	  const reloadProfile = async (authUser) => {
	    if (!supabaseEnabled) return null
	    if (!authUser?.id) {
	      setUser(null)
	      return null
	    }

	    let profile = null
	    try {
	      const { data, error } = await supabase
	        .from('profiles')
	        .select('*')
	        .eq('id', authUser.id)
	        .maybeSingle()
	      if (error) console.warn('Failed to load profile from Supabase.', error)
	      profile = data || null
	    } catch (error) {
	      console.warn('Failed to load profile from Supabase.', error)
	    }

	    const mapped = mapProfileToUser(profile, authUser)
	    setUser(mapped)
	    setAppLanguageState(mapped?.appLanguage || 'English')
	    setDarkModeState(Boolean(mapped?.darkMode))
    setSettingsState(mapped?.settings && typeof mapped.settings === 'object' ? mapped.settings : {})
    return mapped
  }

	  const reloadMembers = async () => {
	    if (!supabaseEnabled) return
	    let data = []
	    try {
	      const res = await supabase.from('profiles').select('*').order('name', { ascending: true })
	      if (res.error) console.warn('Failed to load members from Supabase.', res.error)
	      data = res.data
	    } catch (error) {
	      console.warn('Failed to load members from Supabase.', error)
	    }
	    const mapped = Array.isArray(data)
	      ? data.map(profile =>
	          enrichUserWithProfileImage({
            id: profile.id,
            idNumber: profile.id_number || '',
            name: profile.name || '',
            email: profile.email || '',
            role: profile.role || 'member',
            committee: profile.committee || '',
            category: profile.category || (profile.role === 'admin' ? 'Administrator' : DEFAULT_MEMBER_CATEGORY),
            contactNumber: profile.contact_number || '',
            address: profile.address || '',
            bloodType: profile.blood_type || '',
            memberSince: profile.member_since || new Date().toISOString(),
            profileImage: profile.profile_image || DEFAULT_PROFILE_IMAGE,
            accountStatus: profile.account_status || 'Active',
            status: profile.status || 'active',
          })
        )
      : []
    setUsers(mapped)
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
	      return
	    }

		    let active = true
		    let refreshInterval

      setLoading(true)

	    const safelyStartAutoRefresh = () => {
	      try {
	        supabase.auth.startAutoRefresh?.()
	      } catch {
	        // Ignore; not all supabase-js builds expose these helpers.
	      }
	    }

	    const safelyStopAutoRefresh = () => {
	      try {
	        supabase.auth.stopAutoRefresh?.()
	      } catch {
	        // Ignore.
	      }
	    }

	    const refreshSessionIfNeeded = async () => {
	      try {
	        const { data, error } = await runAuthOperationWithRetry(() => supabase.auth.getSession())
	        if (error) return
	        const session = data?.session
	        if (!session?.user) return

	        const expiresAtSeconds = Number(session.expires_at || 0)
	        if (!expiresAtSeconds) return

	        const expiresAtMs = expiresAtSeconds * 1000
	        const msRemaining = expiresAtMs - Date.now()

	        if (msRemaining > 2 * 60 * 1000) return

	        await runAuthOperationWithRetry(() => supabase.auth.refreshSession())
	      } catch {
	        // Best-effort: autoRefreshToken handles most cases; this is a safety net.
	      }
	    }

	    const handleVisibilityChange = () => {
	      if (!active) return
	      if (document.visibilityState === 'visible') {
	        safelyStartAutoRefresh()
	        refreshSessionIfNeeded().catch(() => {})
	      } else {
	        safelyStopAutoRefresh()
	      }
	    }

	    const handleFocus = () => {
	      if (!active) return
	      safelyStartAutoRefresh()
	      refreshSessionIfNeeded().catch(() => {})
	    }

	    const handleBlur = () => {
	      if (!active) return
	      safelyStopAutoRefresh()
	    }

		    const handleOnline = () => {
		      if (!active) return
		      safelyStartAutoRefresh()
		      refreshSessionIfNeeded().catch(() => {})
		    }

	    const bootstrap = async () => {
        if (active) setLoading(true)
	      try {
	        const { data, error } = await runAuthOperationWithRetry(() => supabase.auth.getSession(), 2, 20_000)
	        if (!active) return

        if (error) {
          if (isRefreshTokenError(error)) {
            await supabase.auth.signOut()
          }
          await reloadProfile(null)
          setUsers([])
          setCommittees([])
          setUtilitiesByCommittee({})
          setRecruitments([])
          return
        }

        const authUser = data?.session?.user || null
        const currentUser = await reloadProfile(authUser)
        if (authUser?.id) await recordDailyPresenceSupabase(authUser.id)
        if (authUser) {
          await reloadMembers()
          const committeeList = await reloadCommittees()
          await reloadUtilities(committeeList)
          await reloadRecruitments(currentUser?.role === 'admin')
        } else {
          setUsers([])
          setCommittees([])
          setUtilitiesByCommittee({})
          setRecruitments([])
        }
	      } catch (error) {
	        void error
	        if (active) {
	          setUser(null)
	          setUsers([])
	          setCommittees([])
          setUtilitiesByCommittee({})
          setRecruitments([])
        }
	      } finally {
	        if (active) setLoading(false)
	      }
	    }

    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return

      setLoading(true)
      if (event === 'TOKEN_REFRESH_FAILED') {
        await supabase.auth.signOut()
        await reloadProfile(null)
        setUsers([])
        setCommittees([])
        setUtilitiesByCommittee({})
        setRecruitments([])
        if (active) setLoading(false)
        return
      }

      const authUser = session?.user || null
      const currentUser = await reloadProfile(authUser)
      if (authUser?.id) await recordDailyPresenceSupabase(authUser.id)
      if (authUser) {
        await reloadMembers()
        const committeeList = await reloadCommittees()
        await reloadUtilities(committeeList)
        await reloadRecruitments(currentUser?.role === 'admin')
      } else {
        setUsers([])
        setCommittees([])
        setUtilitiesByCommittee({})
        setRecruitments([])
      }

      if (active) setLoading(false)
    })

		    safelyStartAutoRefresh()
		    refreshSessionIfNeeded().catch(() => {})
		    refreshInterval = window.setInterval(() => {
		      refreshSessionIfNeeded().catch(() => {})
		    }, 60 * 1000)

		    window.addEventListener('focus', handleFocus)
		    window.addEventListener('blur', handleBlur)
		    window.addEventListener('online', handleOnline)
		    document.addEventListener('visibilitychange', handleVisibilityChange)

		    bootstrap()

	    const committeesChannel = supabase
	      .channel('kusgan-committees')
	      .on('postgres_changes', { event: '*', schema: 'public', table: 'committees' }, async () => {
	        const committeeList = await reloadCommittees()
	        await reloadUtilities(committeeList)
	      })
	      .subscribe()

	    const utilitiesChannel = supabase
	      .channel('kusgan-committee-utilities')
	      .on('postgres_changes', { event: '*', schema: 'public', table: 'committee_utilities' }, () => reloadUtilities())
	      .subscribe()

	    const profilesChannel = supabase
	      .channel('kusgan-profiles')
	      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => reloadMembers())
	      .subscribe()

	    const recruitmentsChannel = supabase
	      .channel('kusgan-recruitments')
	      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruitments' }, () =>
	        reloadRecruitments(user?.role === 'admin')
	      )
	      .subscribe()

		    return () => {
		      active = false
		      safelyStopAutoRefresh()
		      if (refreshInterval) window.clearInterval(refreshInterval)
		      window.removeEventListener('focus', handleFocus)
		      window.removeEventListener('blur', handleBlur)
		      window.removeEventListener('online', handleOnline)
		      document.removeEventListener('visibilitychange', handleVisibilityChange)
	      authSub?.subscription?.unsubscribe?.()
	      supabase.removeChannel(committeesChannel)
	      supabase.removeChannel(utilitiesChannel)
	      supabase.removeChannel(profilesChannel)
	      supabase.removeChannel(recruitmentsChannel)
	    }
	    // eslint-disable-next-line react-hooks/exhaustive-deps
	  }, [supabaseEnabled])

		  const login = async (identifier, password) => {
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
		      const { data, error } = await supabase.rpc('get_email_for_id_number', { p_id_number: idNumber })
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
		      if (!emailForAuth) {
		        return {
		          success: false,
		          message:
		            'No account found for that ID number. Ask an admin to set your ID number in the profiles table, then try again.',
		        }
		      }
		    } catch (error) {
		      console.warn('Failed to resolve email for ID number.', error)
		      return { success: false, message: 'Unable to sign in with ID number right now. Please try again.' }
		    }

	    let data
	    let error
		    try {
		      const res = await runAuthOperationWithRetry(() =>
		        supabase.auth.signInWithPassword({
		          email: emailForAuth,
		          password: trimmedPassword,
		        })
		      )
	      data = res?.data
	      error = res?.error
		    } catch (err) {
		      const message = err?.message ? String(err.message) : ''
		      if (err?.name === 'AbortError') return { success: false, message: 'Login request timed out. Please try again.' }
		      return { success: false, message: message || 'Login failed.' }
		    }

		    if (error) {
		      const msg = String(error.message || '')
		      if (/email not confirmed/i.test(msg)) {
		        return { success: false, message: 'Email not confirmed yet. Please confirm your email and try again.' }
		      }
		      if (/invalid login credentials/i.test(msg)) {
		        return { success: false, message: 'Invalid ID number or password.' }
		      }
		      return { success: false, message: msg || 'Login failed.' }
		    }

		    const sessionUser = data?.session?.user || null
		    if (!sessionUser?.id) {
		      try {
		        const sessionRes = await supabase.auth.getSession()
		        if (!sessionRes?.data?.session?.user?.id) {
		          return { success: false, message: 'Signed in, but session was not created. Please try again.' }
		        }
		      } catch (error) {
		        console.warn('Unable to verify Supabase session after login.', error)
		        return { success: false, message: 'Signed in, but session could not be verified. Please try again.' }
		      }
		    }

		    const authUser = data?.user || data?.session?.user || null
		    await reloadProfile(authUser)
		    if (authUser?.id) await recordDailyPresenceSupabase(authUser.id)
		    return { success: true }
		  }

  const logout = async () => {
    await runAuthOperationWithRetry(() => supabase.auth.signOut())
    setUser(null)
    setUsers([])
    setCommittees([])
    setUtilitiesByCommittee({})
    setRecruitments([])
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
      await reloadProfile(activeUser)
      await recordDailyPresenceSupabase(activeUser.id)
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
    const profileImage = hasProfileImageUpdate
      ? (nextProfileImageRaw || DEFAULT_PROFILE_IMAGE)
      : (user.profileImage || DEFAULT_PROFILE_IMAGE)

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

    const { error } = await supabase
      .from('profiles')
      .update({
        name,
        email,
        address,
        contact_number: contactNumber,
        blood_type: bloodType || null,
        profile_image: profileImage,
      })
      .eq('id', user.id)

    if (error) return { success: false, message: error.message || 'Unable to update profile.' }

    setUser(prev => (prev ? { ...prev, name, email, address, contactNumber, bloodType, profileImage } : prev))
    setUsers(prev =>
      prev.map(member =>
        member?.id === user.id
          ? { ...member, name, email, address, contactNumber, bloodType, profileImage }
          : member
      )
    )
    await reloadProfile({ id: user.id, user_metadata: { name }, email })
    return { success: true }
  }

  const changeCurrentUserPassword = async (currentPassword, newPassword) => {
    if (!user?.email) return { success: false, message: 'User not found' }

    const trimmedCurrent = currentPassword?.trim() || ''
    const trimmedNew = newPassword?.trim() || ''
    if (!trimmedCurrent || !trimmedNew) return { success: false, message: 'Current and new password are required.' }
    if (trimmedNew.length < 6) return { success: false, message: 'New password must be at least 6 characters.' }

    const email = user.email?.trim().toLowerCase()
    if (!email) return { success: false, message: 'User not found' }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData?.session) {
      if (isRefreshTokenError(sessionError)) {
        await supabase.auth.signOut()
      }
      return { success: false, message: SESSION_EXPIRED_MESSAGE }
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: trimmedCurrent,
    })

    if (authError) {
      if (isRefreshTokenError(authError)) {
        await supabase.auth.signOut()
        return { success: false, message: SESSION_EXPIRED_MESSAGE }
      }
      return { success: false, message: 'Current password is incorrect.' }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: trimmedNew })
    if (updateError) {
      if (isRefreshTokenError(updateError)) {
        await supabase.auth.signOut()
        return { success: false, message: SESSION_EXPIRED_MESSAGE }
      }
      return { success: false, message: updateError.message || 'Unable to update password.' }
    }
    return { success: true }
  }

  const updateMember = async (memberId, updates = {}) => {
    if (!user?.id) return { success: false, message: 'User not found.' }
    if (user.role !== 'admin') return { success: false, message: 'Only admins can update members.' }

    const isSelf = String(memberId) === String(user.id)
    const hasIdentityEdits = Object.prototype.hasOwnProperty.call(updates, 'email') || Object.prototype.hasOwnProperty.call(updates, 'idNumber')
    if (!isSelf && hasIdentityEdits) {
      return { success: false, message: 'Updating email/ID Number for other users requires an Admin server route (Service Role).' }
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

    if (isSelf) {
      if (Object.prototype.hasOwnProperty.call(updates, 'email')) payload.email = String(updates.email || '').trim().toLowerCase()
      if (Object.prototype.hasOwnProperty.call(updates, 'idNumber')) payload.id_number = String(updates.idNumber || '').trim()
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', memberId)
    if (error) return { success: false, message: error.message || 'Unable to update member.' }
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

	    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
	    if (sessionError || !sessionData?.session?.access_token) {
	      if (isRefreshTokenError(sessionError)) {
	        await supabase.auth.signOut()
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

	    const payload = await response.json().catch(() => ({}))
	    if (!response.ok) {
	      return { success: false, message: payload?.message || 'Unable to create member.' }
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
	    changeCurrentUserPassword,
	    getAllMembers,
	    createMember,
	    deleteMembers: async () => ({
	      success: false,
	      message: 'Deleting users requires a server-side Admin/Service Role flow in Supabase (client cannot delete Auth users).',
	    }),
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

