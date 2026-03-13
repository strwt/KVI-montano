/* eslint-disable react-refresh/only-export-component */
import { createContext, useContext, useEffect, useState } from 'react'
import dayjs from 'dayjs'

const AuthContext = createContext(null)

const DEFAULT_COMMITTEES = ['Environmental', 'Relief Operations', 'Fire Response', 'Medical']
const LEGACY_COMMITTEE_BLOCKLIST = ['leadership', 'unassigned']
const DEFAULT_MEMBER_CATEGORY = 'General Member'
const RECRUITMENT_STORAGE_KEY = 'kusgan_recruitments'
const UTILITIES_STORAGE_KEY = 'kusgan_utilities_by_committee'
const DEFAULT_PROFILE_IMAGE = '/image-removebg-preview.png'
const DEFAULT_UTILITIES_BY_COMMITTEE = {
  Environmental: ['Sampling counts', 'Type of Sampling'],
  'Relief Operations': ['Food Packs', 'Water Containers'],
  'Fire Response': ['Hose', 'Tank', 'First Aid Kit'],
  Medical: ['Medical Kit', 'Stretcher'],
}
const APP_LANGUAGE_STORAGE_KEY = 'kusgan_app_language'
const SUPPORTED_APP_LANGUAGES = ['English', 'Filipino', 'Bisaya']
const COMMITTEES_STORAGE_KEY = 'kusgan_committees'
const COMMITTEES_UPDATED_EVENT = 'kusgan-committees-updated'
const LOGIN_ACTIVITY_UPDATED_EVENT = 'kusgan-login-activity-updated'

const parseStoredJson = (value, fallback) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
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

const coerceCommitteesToStringArray = (parsed) => {
  if (!parsed) return []

  if (Array.isArray(parsed)) {
    const output = []
    parsed.forEach(item => {
      if (typeof item === 'string') output.push(item)
      else if (item && typeof item === 'object') {
        if (typeof item.name === 'string') output.push(item.name)
        else if (typeof item.committee === 'string') output.push(item.committee)
        else if (typeof item.category === 'string' && typeof item.type === 'string') output.push(`${item.category} - ${item.type}`)
        else if (typeof item.category === 'string') output.push(item.category)
      }
    })
    return output
  }

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.committees)) return coerceCommitteesToStringArray(parsed.committees)
    if (Array.isArray(parsed.operations)) return coerceCommitteesToStringArray(parsed.operations)

    // Legacy shape: { "Environmental": ["General", "Type A"], "Relief Operations": ["General"] }
    const output = []
    Object.entries(parsed).forEach(([category, types]) => {
      if (!category) return
      if (Array.isArray(types)) {
        if (types.length === 0) output.push(category)
        types.forEach(type => {
          if (typeof type === 'string' && type.trim()) output.push(`${category} - ${type}`)
        })
        return
      }
      if (typeof types === 'string' && types.trim()) {
        output.push(`${category} - ${types}`)
        return
      }
      output.push(category)
    })
    return output
  }

  return []
}

const omitPassword = (account = {}) => {
  const { password: _PASSWORD, ...userWithoutPassword } = account
  return userWithoutPassword
}

const enrichUserWithProfileImage = (user = {}) => ({
  ...user,
  profileImage: user.profileImage || DEFAULT_PROFILE_IMAGE,
})

const buildFallbackIdNumber = (user) => {
  if (user.idNumber) return user.idNumber
  if (user.email) {
    return user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  }
  return `USER${user.id || Date.now()}`
}

const normalizeUsers = (storedUsers = []) => {
  return storedUsers.map(rawUser => {
    const user = enrichUserWithProfileImage(rawUser)
    const normalizedCommittee = typeof user.committee === 'string' ? user.committee.trim() : ''
    const hasValidCommittee = normalizedCommittee && !LEGACY_COMMITTEE_BLOCKLIST.includes(normalizedCommittee.toLowerCase())
    const committee = hasValidCommittee ? normalizedCommittee : DEFAULT_COMMITTEES[0]
    return {
      ...user,
      idNumber: buildFallbackIdNumber(user),
      committee,
      category: user.category || (user.role === 'admin' ? 'Administrator' : DEFAULT_MEMBER_CATEGORY),
      contactNumber: user.contactNumber || '',
      bloodType: user.bloodType || '',
      accountStatus: user.accountStatus || 'Active',
      status: user.status || 'active',
      memberSince: user.memberSince || new Date().toISOString(),
    }
  })
}

const ensureUniqueUserIds = (users = []) => {
  const usedIds = new Set()
  return users.map((user, index) => {
    let candidateId = user.id
    if (candidateId === undefined || candidateId === null || usedIds.has(String(candidateId))) {
      candidateId = Date.now() + index
      while (usedIds.has(String(candidateId))) {
        candidateId += 1
      }
    }
    usedIds.add(String(candidateId))
    return { ...user, id: candidateId }
  })
}

const DEMO_ADMIN = {
  id: 1,
  name: 'Admin User',
  email: 'admin@kusgan.com',
  idNumber: 'ADMIN001',
  password: 'admin123',
  accountStatus: 'Active',
  role: 'admin',
  committee: DEFAULT_COMMITTEES[0],
  category: 'Administrator',
  status: 'active',
  memberSince: new Date().toISOString(),
  profileImage: DEFAULT_PROFILE_IMAGE,
}

const ensureDemoAdmin = (users = []) => {
  const adminIndex = users.findIndex(
    u => (u.idNumber || '').toLowerCase() === DEMO_ADMIN.idNumber.toLowerCase()
  )

  if (adminIndex >= 0) {
    const merged = [...users]
    merged[adminIndex] = {
      ...merged[adminIndex],
      ...DEMO_ADMIN,
      id: merged[adminIndex].id ?? DEMO_ADMIN.id,
      profileImage: merged[adminIndex].profileImage || DEMO_ADMIN.profileImage,
    }
    return ensureUniqueUserIds(merged)
  }

  return ensureUniqueUserIds([DEMO_ADMIN, ...users])
}

const getStoredUsers = () => {
  const stored = parseStoredJson(localStorage.getItem('kusgan_users'), null)
  if (Array.isArray(stored)) {
    return ensureDemoAdmin(normalizeUsers(stored))
  }

  return ensureDemoAdmin(normalizeUsers([
    {
      id: 2,
      name: 'John Doe',
      email: 'john@kusgan.com',
      idNumber: 'JOHN001',
      password: 'john123',
      accountStatus: 'Active',
      role: 'member',
      committee: 'Environmental',
      category: 'Field Volunteer',
      status: 'active',
    },
    {
      id: 3,
      name: 'Jane Smith',
      email: 'jane@kusgan.com',
      idNumber: 'JANE001',
      password: 'jane123',
      accountStatus: 'Active',
      role: 'member',
      committee: 'Relief Operations',
      category: 'Coordinator',
      status: 'active',
    },
  ]))
}

const getStoredCommittees = () => {
  const parsed = parseStoredJson(localStorage.getItem(COMMITTEES_STORAGE_KEY), null)
  const rawList = coerceCommitteesToStringArray(parsed)
  if (rawList.length === 0) return DEFAULT_COMMITTEES

  const sanitized = rawList
    .map(name => (typeof name === 'string' ? name.trim() : ''))
    .filter(Boolean)
    .filter(name => {
      const { category } = splitCategoryAndType(name)
      if (!category) return false
      return !LEGACY_COMMITTEE_BLOCKLIST.includes(category.toLowerCase())
    })

  const deduped = []
  const seen = new Set()
  sanitized.forEach(entry => {
    const key = entry.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    deduped.push(entry)
  })

  return deduped.length > 0 ? deduped : DEFAULT_COMMITTEES
}

const sanitizeUtilitiesByCommittee = (rawMap, committeeList) => {
  const map = {}
  const source = rawMap && typeof rawMap === 'object' ? rawMap : {}

  committeeList.forEach(committee => {
    const fallback = Array.isArray(DEFAULT_UTILITIES_BY_COMMITTEE[committee])
      ? DEFAULT_UTILITIES_BY_COMMITTEE[committee]
      : []
    const rawItems = Array.isArray(source[committee]) ? source[committee] : fallback
    map[committee] = Array.from(
      new Set(
        rawItems
          .map(item => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      )
    )
  })

  return map
}

const getStoredUtilitiesByCommittee = (committeeList = DEFAULT_COMMITTEES) => {
  const parsed = parseStoredJson(localStorage.getItem(UTILITIES_STORAGE_KEY), null)
  return sanitizeUtilitiesByCommittee(parsed, committeeList)
}

const getStoredCurrentUser = () => {
  const parsed = parseStoredJson(localStorage.getItem('kusgan_current_user'), null)
  return parsed ? enrichUserWithProfileImage(parsed) : null
}

const getStoredRecruitments = () => {
  const parsed = parseStoredJson(localStorage.getItem(RECRUITMENT_STORAGE_KEY), [])
  return Array.isArray(parsed) ? parsed : []
}

const getStoredAppLanguage = () => {
  const stored = localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)
  if (SUPPORTED_APP_LANGUAGES.includes(stored)) return stored
  return 'English'
}

const getTodayDateKey = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const recordDailyPresence = (loggedInUser) => {
  const activityKey = 'kusgan_login_activity'
  const stored = parseStoredJson(localStorage.getItem(activityKey), [])
  const activity = Array.isArray(stored) ? stored : []
  const todayKey = getTodayDateKey()
  const timestamp = new Date().toISOString()

  const existingIndex = activity.findIndex(
    entry => entry.date === todayKey && String(entry.userId) === String(loggedInUser.id)
  )

  const payload = {
    date: todayKey,
    userId: loggedInUser.id,
    name: loggedInUser.name,
    email: loggedInUser.email,
    role: loggedInUser.role,
    profileImage: loggedInUser.profileImage,
    lastLoginAt: timestamp,
    isOnline: true,
  }

  if (existingIndex >= 0) {
    activity[existingIndex] = payload
  } else {
    activity.push(payload)
  }

  localStorage.setItem(activityKey, JSON.stringify(activity))
  window.dispatchEvent(new Event(LOGIN_ACTIVITY_UPDATED_EVENT))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredCurrentUser)
  const [users, setUsers] = useState(getStoredUsers)
  const [committees, setCommittees] = useState(getStoredCommittees)
  const [utilitiesByCommittee, setUtilitiesByCommittee] = useState(() => getStoredUtilitiesByCommittee(getStoredCommittees()))
  const [recruitments, setRecruitments] = useState(getStoredRecruitments)
  const [appLanguage, setAppLanguage] = useState(getStoredAppLanguage)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('kusgan_users')) {
      localStorage.setItem('kusgan_users', JSON.stringify(getStoredUsers()))
    }
    if (!localStorage.getItem(COMMITTEES_STORAGE_KEY)) {
      localStorage.setItem(COMMITTEES_STORAGE_KEY, JSON.stringify(getStoredCommittees()))
    }
    if (!localStorage.getItem(UTILITIES_STORAGE_KEY)) {
      localStorage.setItem(UTILITIES_STORAGE_KEY, JSON.stringify(getStoredUtilitiesByCommittee(getStoredCommittees())))
    }
    if (!localStorage.getItem(RECRUITMENT_STORAGE_KEY)) {
      localStorage.setItem(RECRUITMENT_STORAGE_KEY, JSON.stringify(getStoredRecruitments()))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const handleStorage = event => {
      if (!event) return
      if (event.key === COMMITTEES_STORAGE_KEY) {
        const nextCommittees = getStoredCommittees()
        setCommittees(nextCommittees)
        setUtilitiesByCommittee(getStoredUtilitiesByCommittee(nextCommittees))
        window.dispatchEvent(new Event(COMMITTEES_UPDATED_EVENT))
      }
      if (event.key === UTILITIES_STORAGE_KEY) {
        setUtilitiesByCommittee(getStoredUtilitiesByCommittee(getStoredCommittees()))
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('kusgan_current_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('kusgan_current_user')
    }
  }, [user])

  useEffect(() => {
    localStorage.setItem('kusgan_users', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    localStorage.setItem(COMMITTEES_STORAGE_KEY, JSON.stringify(committees))
    window.dispatchEvent(new Event(COMMITTEES_UPDATED_EVENT))
  }, [committees])

  useEffect(() => {
    setUtilitiesByCommittee(prev => sanitizeUtilitiesByCommittee(prev, committees))
  }, [committees])

  useEffect(() => {
    localStorage.setItem(UTILITIES_STORAGE_KEY, JSON.stringify(utilitiesByCommittee))
  }, [utilitiesByCommittee])

  useEffect(() => {
    localStorage.setItem(RECRUITMENT_STORAGE_KEY, JSON.stringify(recruitments))
  }, [recruitments])

  useEffect(() => {
    localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, appLanguage)
    const langCode = appLanguage === 'Filipino' ? 'fil' : appLanguage === 'Bisaya' ? 'ceb' : 'en'
    document.documentElement.setAttribute('lang', langCode)
  }, [appLanguage])

  const login = (idNumber, password) => {
    const normalizedIdNumber = idNumber.trim().toLowerCase()
    const foundUser = users.find(
      u => (u.idNumber || '').toLowerCase() === normalizedIdNumber && u.password === password
    )

    if (foundUser) {
      const enriched = enrichUserWithProfileImage(foundUser)
      const userWithoutPassword = omitPassword(enriched)
      setUser(userWithoutPassword)
      recordDailyPresence(userWithoutPassword)
      return { success: true, user: userWithoutPassword }
    }

    return { success: false, message: 'Invalid ID Number or Password' }
  }

  const register = (name, email, idNumber, password) => {
    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedIdNumber = idNumber.trim()

    if (!normalizedName || !normalizedEmail || !normalizedIdNumber || !password) {
      return { success: false, message: 'All fields are required.' }
    }

    const exists = users.find(
      u => (u.idNumber || '').toLowerCase() === normalizedIdNumber.toLowerCase()
    )
    if (exists) {
      return { success: false, message: 'ID Number already exists' }
    }

    const emailExists = users.find(
      u => (u.email || '').toLowerCase() === normalizedEmail
    )
    if (emailExists) {
      return { success: false, message: 'Email already exists' }
    }

    const newUser = {
      id: Date.now(),
      name: normalizedName,
      email: normalizedEmail,
      idNumber: normalizedIdNumber,
      password,
      accountStatus: 'Active',
      role: 'member',
      committee: committees[0] || DEFAULT_COMMITTEES[0],
      category: DEFAULT_MEMBER_CATEGORY,
      status: 'active',
      memberSince: new Date().toISOString(),
      profileImage: DEFAULT_PROFILE_IMAGE,
    }

    setUsers(prev => ensureUniqueUserIds([...prev, newUser]))
    const userWithoutPassword = omitPassword(newUser)
    setUser(userWithoutPassword)
    recordDailyPresence(userWithoutPassword)
    return { success: true, user: userWithoutPassword }
  }

  const logout = () => {
    setUser(null)
  }

  const updateCurrentUser = (updates = {}) => {
    if (!user) {
      return { success: false, message: 'User not found' }
    }

    const name = updates.name?.trim()
    const email = updates.email?.trim().toLowerCase()
    const currentUserEmail = (user.email || '').trim().toLowerCase()

    if (!name || !email) {
      return { success: false, message: 'Full Name and Gmail are required.' }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: 'Please enter a valid email address.' }
    }

    const isEmailChanged = email !== currentUserEmail
    const emailTaken = users.some(
      u => String(u.id) !== String(user.id) && (u.email || '').trim().toLowerCase() === email
    )
    if (isEmailChanged && emailTaken) {
      return { success: false, message: 'Email is already in use' }
    }

    // Optional profile fields
    const address = updates.address?.toString().trim() ?? (user.address || '')
    const contactNumber = updates.contactNumber?.toString().trim() ?? (user.contactNumber || '')
    const bloodType = (updates.bloodType ?? user.bloodType ?? '').toString().toUpperCase()
    const hasProfileImageUpdate = Object.prototype.hasOwnProperty.call(updates, 'profileImage')
    const nextProfileImageRaw = hasProfileImageUpdate ? (updates.profileImage ?? '').toString().trim() : null
    const profileImage = hasProfileImageUpdate
      ? (nextProfileImageRaw || DEFAULT_PROFILE_IMAGE)
      : (user.profileImage || DEFAULT_PROFILE_IMAGE)
    const validBloodTypes = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

    if (contactNumber && !/^\+?[0-9\-\s]{7,15}$/.test(contactNumber)) {
      return { success: false, message: 'Please enter a valid contact number.' }
    }

    if (!validBloodTypes.includes(bloodType)) {
      return { success: false, message: 'Please select a valid blood type.' }
    }

    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return {
          ...u,
          name,
          email,
          address,
          contactNumber,
          bloodType,
          profileImage,
        }
      }
      return u
    })

    setUsers(updatedUsers)
    const updatedCurrent = updatedUsers.find(u => u.id === user.id)
    const userWithoutPassword = omitPassword(updatedCurrent)
    setUser(userWithoutPassword)
    return { success: true, user: userWithoutPassword }
  }

  const changeCurrentUserPassword = (currentPassword, newPassword) => {
    if (!user) {
      return { success: false, message: 'User not found' }
    }

    const trimmedCurrent = currentPassword?.trim() || ''
    const trimmedNew = newPassword?.trim() || ''

    if (!trimmedCurrent || !trimmedNew) {
      return { success: false, message: 'Current and new password are required.' }
    }

    if (trimmedNew.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' }
    }

    const matchedUser = users.find(u => u.id === user.id)
    if (!matchedUser) {
      return { success: false, message: 'User not found' }
    }

    if (matchedUser.password !== trimmedCurrent) {
      return { success: false, message: 'Current password is incorrect.' }
    }

    if (trimmedCurrent === trimmedNew) {
      return { success: false, message: 'New password must be different from current password.' }
    }

    const updatedUsers = users.map(u => (
      u.id === user.id
        ? { ...u, password: trimmedNew }
        : u
    ))

    setUsers(updatedUsers)
    return { success: true }
  }

  const updateMember = (memberId, updates = {}) => {
    const member = users.find(u => String(u.id) === String(memberId))
    if (!member) {
      return { success: false, message: 'Member not found.' }
    }

    const nextIdNumber = (updates.idNumber ?? updates.id ?? member.idNumber)?.toString().trim()
    const nextEmail = (updates.email ?? member.email)?.toString().trim().toLowerCase()

    if (!nextIdNumber || !nextEmail) {
      return { success: false, message: 'ID Number and Email are required.' }
    }

    const idTaken = users.some(
      u => String(u.id) !== String(memberId) && (u.idNumber || '').toLowerCase() === nextIdNumber.toLowerCase()
    )
    if (idTaken) {
      return { success: false, message: 'ID Number already exists' }
    }

    const emailTaken = users.some(
      u => String(u.id) !== String(memberId) && (u.email || '').toLowerCase() === nextEmail
    )
    if (emailTaken) {
      return { success: false, message: 'Email already exists' }
    }

    const updatedUsers = users.map(u => {
      if (String(u.id) !== String(memberId)) return u
      return {
        ...u,
        ...updates,
        idNumber: nextIdNumber,
        email: nextEmail,
        status: updates.status || u.status || 'active',
      }
    })

    setUsers(updatedUsers)

    if (user && String(user.id) === String(memberId)) {
      const updatedCurrent = updatedUsers.find(u => String(u.id) === String(memberId))
      setUser(omitPassword(updatedCurrent))
    }

    return { success: true }
  }

  const getAllMembers = () => users.map(omitPassword)

  const createMember = (memberData) => {
    const name = memberData.name?.trim()
    const email = memberData.email?.trim().toLowerCase()
    const idNumber = memberData.idNumber?.trim()
    const password = memberData.password
    const address = memberData.address?.trim() || ''
    const contactNumber = memberData.contactNumber?.trim() || ''
    const bloodType = memberData.bloodType?.trim() || ''
    const memberSinceInput = memberData.memberSince
    const role = memberData.role?.trim().toLowerCase() || 'member'
    const committee = memberData.committee?.trim()
    const category = memberData.category?.trim()
    const memberSince = memberSinceInput && dayjs(memberSinceInput).isValid()
      ? dayjs(memberSinceInput).startOf('day').toISOString()
      : new Date().toISOString()

    if (!name || !email || !idNumber || !password || !committee || !category) {
      return { success: false, message: 'All fields are required.' }
    }

    if (!['member', 'admin'].includes(role)) {
      return { success: false, message: 'Please select a valid role.' }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: 'Please enter a valid email address.' }
    }

    if (!/^[a-zA-Z0-9]+$/.test(idNumber)) {
      return { success: false, message: 'ID Number must be alphanumeric.' }
    }

    const idTaken = users.some(
      u => (u.idNumber || '').toLowerCase() === idNumber.toLowerCase()
    )
    if (idTaken) {
      return { success: false, message: 'ID Number already exists' }
    }

    const emailTaken = users.some(
      u => (u.email || '').toLowerCase() === email
    )
    if (emailTaken) {
      return { success: false, message: 'Email already exists' }
    }

    const recruitmentId = memberData.recruitmentId || null
    const recruitment = recruitmentId
      ? recruitments.find(item => item.id === recruitmentId)
      : null

    if (recruitmentId && (!recruitment || recruitment.status !== 'pending')) {
      return { success: false, message: 'Recruitment entry is no longer pending.' }
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      idNumber,
      password,
      accountStatus: 'Active',
      role,
      committee,
      category,
      status: 'active',
      address,
      contactNumber,
      bloodType,
      memberSince,
      profileImage: DEFAULT_PROFILE_IMAGE,
    }

    setUsers(prev => ensureUniqueUserIds([...prev, newUser]))

    if (recruitment) {
      setRecruitments(prev =>
        prev.map(item =>
          item.id === recruitment.id
            ? {
                ...item,
                status: 'approved',
                approvedMemberId: newUser.id,
                reviewedAt: dayjs().toISOString(),
                reviewedBy: user?.id || null,
              }
            : item
        )
      )
    }

    return { success: true }
  }

  const submitRecruitmentApplication = (applicationData = {}) => {
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: 'Please enter a valid email address.' }
    }

    if (idNumber && !/^[a-zA-Z0-9]+$/.test(idNumber)) {
      return { success: false, message: 'ID Number must be alphanumeric.' }
    }

    if (!/^\+?[0-9\-\s]{7,15}$/.test(contactNumber)) {
      return { success: false, message: 'Please enter a valid contact number.' }
    }

    if (!validBloodTypes.includes(bloodType)) {
      return { success: false, message: 'Please select a valid blood type.' }
    }

    if (insuranceStatus === 'Insured') {
      if (!insuranceYear) {
        return { success: false, message: 'Insurance year is required when insured.' }
      }
      if (!/^\d{4}$/.test(insuranceYear)) {
        return { success: false, message: 'Insurance year must be a 4-digit year.' }
      }
      const yearNumber = Number(insuranceYear)
      const maxYear = dayjs().year() + 1
      if (Number.isNaN(yearNumber) || yearNumber < 1900 || yearNumber > maxYear) {
        return { success: false, message: `Insurance year must be between 1900 and ${maxYear}.` }
      }
    }

    const existingUserEmail = users.some(
      member => (member.email || '').toLowerCase() === email
    )
    if (existingUserEmail) {
      return { success: false, message: 'Email already exists in member records.' }
    }

    const existingRecruitment = recruitments.some(item => (item.email || '').toLowerCase() === email)

    if (existingRecruitment) {
      return { success: false, message: 'This email already has a recruitment entry.' }
    }

    const newRecruitment = {
      id: Date.now(),
      fullName,
      email,
      idNumber,
      contactNumber,
      address,
      bloodType,
      insuranceStatus,
      insuranceYear,
      status: 'pending',
      submittedAt: dayjs().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      approvedMemberId: null,
    }

    setRecruitments(prev => [newRecruitment, ...prev])
    return { success: true, entry: newRecruitment }
  }

  const rejectRecruitment = (recruitmentId) => {
    const target = recruitments.find(item => item.id === recruitmentId)
    if (!target) {
      return { success: false, message: 'Recruitment entry not found.' }
    }
    if (target.status !== 'pending') {
      return { success: false, message: 'Recruitment entry is already processed.' }
    }

    setRecruitments(prev =>
      prev.map(item =>
        item.id === recruitmentId
          ? {
              ...item,
              status: 'rejected',
              reviewedAt: dayjs().toISOString(),
              reviewedBy: user?.id || null,
            }
          : item
      )
    )
    return { success: true }
  }

  const getRecruitments = () => {
    return [...recruitments].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  }

  const deleteMembers = (memberIds = []) => {
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return { success: false, message: 'No members selected.' }
    }

    setUsers(prev => prev.filter(u => !memberIds.includes(u.id)))

    if (user && memberIds.includes(user.id)) {
      setUser(null)
    }

    return { success: true }
  }

  const addCommittee = (committeeName) => {
    const normalizedName = committeeName?.trim()
    if (!normalizedName) {
      return { success: false, message: 'Category name is required.' }
    }
    if (LEGACY_COMMITTEE_BLOCKLIST.includes(normalizedName.toLowerCase())) {
      return { success: false, message: 'This category name is not allowed.' }
    }

    const exists = committees.some(
      committee => committee.toLowerCase() === normalizedName.toLowerCase()
    )
    if (exists) {
      return { success: false, message: 'Category already exists.' }
    }

    setCommittees(prev => [...prev, normalizedName])
    setUtilitiesByCommittee(prev => ({
      ...prev,
      [normalizedName]: prev[normalizedName] || DEFAULT_UTILITIES_BY_COMMITTEE[normalizedName] || [],
    }))
    return { success: true }
  }

  const editCommittee = (oldName, newName) => {
    const source = oldName?.trim()
    const target = newName?.trim()

    if (!source || !target) {
      return { success: false, message: 'Both current and new category names are required.' }
    }

    if (!committees.includes(source)) {
      return { success: false, message: 'Category not found.' }
    }

    if (LEGACY_COMMITTEE_BLOCKLIST.includes(target.toLowerCase())) {
      return { success: false, message: 'This category name is not allowed.' }
    }

    const duplicate = committees.some(
      committee => committee.toLowerCase() === target.toLowerCase() && committee !== source
    )
    if (duplicate) {
      return { success: false, message: 'Category already exists.' }
    }

    if (source === target) {
      return { success: true }
    }

    setCommittees(prev => prev.map(committee => (committee === source ? target : committee)))
    setUtilitiesByCommittee(prev => {
      const next = { ...prev }
      const movedUtilities = Array.isArray(next[source]) ? next[source] : []
      delete next[source]
      next[target] = movedUtilities
      return next
    })
    setUsers(prev => prev.map(member => (
      member.committee === source ? { ...member, committee: target } : member
    )))
    setUser(prev => (
      prev && prev.committee === source ? { ...prev, committee: target } : prev
    ))

    return { success: true }
  }

  const deleteCommittee = (committeeName) => {
    if (committees.length <= 1) {
      return { success: false, message: 'At least one category must remain.' }
    }

    const fallbackCommittee = committees.find(committee => committee !== committeeName) || DEFAULT_COMMITTEES[0]

    setCommittees(prev => prev.filter(committee => committee !== committeeName))
    setUtilitiesByCommittee(prev => {
      const next = { ...prev }
      delete next[committeeName]
      return next
    })
    setUsers(prev => prev.map(member => (
      member.committee === committeeName ? { ...member, committee: fallbackCommittee } : member
    )))
    setUser(prev => (
      prev && prev.committee === committeeName ? { ...prev, committee: fallbackCommittee } : prev
    ))
    return { success: true }
  }

  const addUtilityItem = (committeeName, itemName) => {
    const committee = committeeName?.trim()
    const item = itemName?.trim()
    if (!committee || !item) {
      return { success: false, message: 'Category and utility item are required.' }
    }
    if (!committees.includes(committee)) {
      return { success: false, message: 'Selected category does not exist.' }
    }

    const existing = utilitiesByCommittee[committee] || []
    const duplicate = existing.some(entry => entry.toLowerCase() === item.toLowerCase())
    if (duplicate) {
      return { success: false, message: 'Utility item already exists.' }
    }

    setUtilitiesByCommittee(prev => ({
      ...prev,
      [committee]: [...(prev[committee] || []), item],
    }))
    return { success: true }
  }

  const editUtilityItem = (committeeName, oldItemName, newItemName) => {
    const committee = committeeName?.trim()
    const oldItem = oldItemName?.trim()
    const newItem = newItemName?.trim()
    if (!committee || !oldItem || !newItem) {
      return { success: false, message: 'Category, current item, and new item are required.' }
    }
    if (!committees.includes(committee)) {
      return { success: false, message: 'Selected category does not exist.' }
    }

    const existing = utilitiesByCommittee[committee] || []
    if (!existing.includes(oldItem)) {
      return { success: false, message: 'Utility item not found.' }
    }
    const duplicate = existing.some(entry => entry.toLowerCase() === newItem.toLowerCase() && entry !== oldItem)
    if (duplicate) {
      return { success: false, message: 'Utility item already exists.' }
    }

    setUtilitiesByCommittee(prev => ({
      ...prev,
      [committee]: (prev[committee] || []).map(item => (item === oldItem ? newItem : item)),
    }))
    return { success: true }
  }

  const deleteUtilityItem = (committeeName, itemName) => {
    const committee = committeeName?.trim()
    const item = itemName?.trim()
    if (!committee || !item) {
      return { success: false, message: 'Category and utility item are required.' }
    }
    if (!committees.includes(committee)) {
      return { success: false, message: 'Selected category does not exist.' }
    }

    setUtilitiesByCommittee(prev => ({
      ...prev,
      [committee]: (prev[committee] || []).filter(entry => entry !== item),
    }))
    return { success: true }
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      register,
      updateCurrentUser,
      changeCurrentUserPassword,
      loading,
      getAllMembers,
      createMember,
      deleteMembers,
      updateMember,
      addCommittee,
      editCommittee,
      deleteCommittee,
      committees,
      utilitiesByCommittee,
      addUtilityItem,
      editUtilityItem,
      deleteUtilityItem,
      submitRecruitmentApplication,
      rejectRecruitment,
      getRecruitments,
      appLanguage,
      setAppLanguage,
      users: users.map(omitPassword),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
