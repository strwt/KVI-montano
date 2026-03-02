/* eslint-disable react-refresh/only-export-component */
import { createContext, useContext, useState, useEffect } from 'react'
import dayjs from 'dayjs'

const AuthContext = createContext(null)

const DEFAULT_COMMITTEES = ['Operations', 'Logistics', 'Outreach']
const DEFAULT_MEMBER_CATEGORY = 'General Member'
const RECRUITMENT_STORAGE_KEY = 'kusgan_recruitments'

const buildFallbackIdNumber = (user) => {
  if (user.idNumber) return user.idNumber
  if (user.email) {
    return user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  }
  return `USER${user.id}`
}

const normalizeUsers = (storedUsers = []) => {
  return storedUsers.map(user => ({
    ...user,
    idNumber: buildFallbackIdNumber(user),
    committee: user.committee || 'Unassigned',
    category: user.category || (user.role === 'admin' ? 'Administrator' : DEFAULT_MEMBER_CATEGORY),
  }))
}

const DEMO_ADMIN = {
  id: 1,
  name: 'Admin User',
  email: 'admin@kusgan.com',
  idNumber: 'ADMIN001',
  password: 'admin123',
  accountStatus: 'Active',
  role: 'admin',
  committee: 'Leadership',
  category: 'Administrator',
}

const ensureDemoAdmin = (users = []) => {
  const hasAdmin = users.some(
    u => (u.idNumber || '').toLowerCase() === DEMO_ADMIN.idNumber.toLowerCase()
  )

  if (hasAdmin) {
    return users.map(u => {
      if ((u.idNumber || '').toLowerCase() === DEMO_ADMIN.idNumber.toLowerCase()) {
        return { ...u, ...DEMO_ADMIN, id: u.id || DEMO_ADMIN.id }
      }
      return u
    })
  }

  return [DEMO_ADMIN, ...users]
}

// Dummy accounts stored in localStorage
const getStoredUsers = () => {
  const stored = localStorage.getItem('kusgan_users')
  if (stored) {
    try {
      return ensureDemoAdmin(normalizeUsers(JSON.parse(stored)))
    } catch {
      localStorage.removeItem('kusgan_users')
    }
  }
  // Default dummy accounts
  return ensureDemoAdmin(normalizeUsers([
    {
      id: 2,
      name: 'John Doe',
      email: 'john@kusgan.com',
      idNumber: 'JOHN001',
      password: 'john123',
      accountStatus: 'Active',
      role: 'member',
      committee: 'Operations',
      category: 'Field Volunteer',
    },
    {
      id: 3,
      name: 'Jane Smith',
      email: 'jane@kusgan.com',
      idNumber: 'JANE001',
      password: 'jane123',
      accountStatus: 'Active',
      role: 'member',
      committee: 'Outreach',
      category: 'Coordinator',
    },
  ]))
}

const getStoredCommittees = () => {
  const stored = localStorage.getItem('kusgan_committees')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch {
      localStorage.removeItem('kusgan_committees')
    }
  }
  return DEFAULT_COMMITTEES
}

const getStoredCurrentUser = () => {
  const stored = localStorage.getItem('kusgan_current_user')
  return stored ? JSON.parse(stored) : null
}

const getStoredRecruitments = () => {
  const stored = localStorage.getItem(RECRUITMENT_STORAGE_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    localStorage.removeItem(RECRUITMENT_STORAGE_KEY)
    return []
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredCurrentUser)
  const [users, setUsers] = useState(getStoredUsers)
  const [committees, setCommittees] = useState(getStoredCommittees)
  const [recruitments, setRecruitments] = useState(getStoredRecruitments)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize users in localStorage if not present
    if (!localStorage.getItem('kusgan_users')) {
      localStorage.setItem('kusgan_users', JSON.stringify(getStoredUsers()))
    }
    if (!localStorage.getItem('kusgan_committees')) {
      localStorage.setItem('kusgan_committees', JSON.stringify(getStoredCommittees()))
    }
    if (!localStorage.getItem(RECRUITMENT_STORAGE_KEY)) {
      localStorage.setItem(RECRUITMENT_STORAGE_KEY, JSON.stringify(getStoredRecruitments()))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Persist current user to localStorage
    if (user) {
      localStorage.setItem('kusgan_current_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('kusgan_current_user')
    }
  }, [user])

  useEffect(() => {
    // Persist users to localStorage
    localStorage.setItem('kusgan_users', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    localStorage.setItem('kusgan_committees', JSON.stringify(committees))
  }, [committees])

  useEffect(() => {
    localStorage.setItem(RECRUITMENT_STORAGE_KEY, JSON.stringify(recruitments))
  }, [recruitments])

  const login = (idNumber, password) => {
    const normalizedIdNumber = idNumber.trim().toLowerCase()
    const foundUser = users.find(
      u => (u.idNumber || '').toLowerCase() === normalizedIdNumber && u.password === password
    )

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser
      setUser(userWithoutPassword)
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
      committee: committees[0] || 'Unassigned',
      category: DEFAULT_MEMBER_CATEGORY,
    }
    setUsers([...users, newUser])
    const { password: _, ...userWithoutPassword } = newUser
    setUser(userWithoutPassword)
    return { success: true, user: userWithoutPassword }
  }

  const logout = () => {
    setUser(null)
  }

  const updateCurrentUser = (updates) => {
    if (!user) {
      return { success: false, message: 'User not found' }
    }

    const name = updates.name?.trim()
    const email = updates.email?.trim().toLowerCase()
    const idNumber = updates.idNumber?.trim()

    if (!name || !email || !idNumber) {
      return { success: false, message: 'All fields are required.' }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: 'Please enter a valid email address.' }
    }

    if (!/^[a-zA-Z0-9]+$/.test(idNumber)) {
      return { success: false, message: 'ID Number must be alphanumeric.' }
    }

    const idTaken = users.some(
      u => u.id !== user.id && (u.idNumber || '').toLowerCase() === idNumber.toLowerCase()
    )

    if (idTaken) {
      return { success: false, message: 'ID Number already exists' }
    }

    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return {
          ...u,
          name,
          email,
          idNumber,
        }
      }
      return u
    })

    setUsers(updatedUsers)
    const updatedCurrent = updatedUsers.find(u => u.id === user.id)
    const { password: _, ...userWithoutPassword } = updatedCurrent
    setUser(userWithoutPassword)
    return { success: true, user: userWithoutPassword }
  }

  const getAllMembers = () => {
    return users.map(({ password, ...u }) => u)
  }

  const createMember = (memberData) => {
    const name = memberData.name?.trim()
    const email = memberData.email?.trim().toLowerCase()
    const idNumber = memberData.idNumber?.trim()
    const password = memberData.password
    const committee = memberData.committee?.trim()
    const category = memberData.category?.trim()

    if (!name || !email || !idNumber || !password || !committee || !category) {
      return { success: false, message: 'All fields are required.' }
    }

    if (!committees.includes(committee)) {
      return { success: false, message: 'Please select a valid committee.' }
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
      role: 'member',
      committee,
      category,
    }

    setUsers(prev => [...prev, newUser])
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
    const idNumber = applicationData.idNumber?.trim()

    if (!fullName || !email || !idNumber) {
      return { success: false, message: 'All fields are required.' }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: 'Please enter a valid email address.' }
    }

    if (!/^[a-zA-Z0-9]+$/.test(idNumber)) {
      return { success: false, message: 'ID Number must be alphanumeric.' }
    }

    const existingUserId = users.some(
      member => (member.idNumber || '').toLowerCase() === idNumber.toLowerCase()
    )
    if (existingUserId) {
      return { success: false, message: 'ID Number already exists in member records.' }
    }

    const existingUserEmail = users.some(
      member => (member.email || '').toLowerCase() === email
    )
    if (existingUserEmail) {
      return { success: false, message: 'Email already exists in member records.' }
    }

    const existingRecruitment = recruitments.some(
      item =>
        (item.idNumber || '').toLowerCase() === idNumber.toLowerCase() ||
        (item.email || '').toLowerCase() === email
    )

    if (existingRecruitment) {
      return { success: false, message: 'This Email or ID Number already has a recruitment entry.' }
    }

    const newRecruitment = {
      id: Date.now(),
      fullName,
      email,
      idNumber,
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
      return { success: false, message: 'Committee name is required.' }
    }

    const exists = committees.some(
      committee => committee.toLowerCase() === normalizedName.toLowerCase()
    )
    if (exists) {
      return { success: false, message: 'Committee already exists.' }
    }

    setCommittees(prev => [...prev, normalizedName])
    return { success: true }
  }

  const deleteCommittee = (committeeName) => {
    if (committees.length <= 1) {
      return { success: false, message: 'At least one committee must remain.' }
    }

    const inUse = users.some(
      member => member.role === 'member' && member.committee === committeeName
    )

    if (inUse) {
      return { success: false, message: 'Committee is assigned to existing members.' }
    }

    setCommittees(prev => prev.filter(committee => committee !== committeeName))
    return { success: true }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      register, 
      updateCurrentUser,
      loading,
      getAllMembers,
      createMember,
      deleteMembers,
      addCommittee,
      deleteCommittee,
      committees,
      submitRecruitmentApplication,
      rejectRecruitment,
      getRecruitments,
      users: users.map(({ password, ...u }) => u)
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
