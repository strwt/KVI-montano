/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const createProfileImageUrl = (name) => {
  const encodedName = encodeURIComponent(name || 'Volunteer')
  return `https://ui-avatars.com/api/?name=${encodedName}&background=dc2626&color=ffffff&bold=true`
}

const enrichUserWithProfileImage = (user) => {
  if (user?.profileImage) return user
  return {
    ...user,
    profileImage: createProfileImageUrl(user?.name),
  }
}

const parseStoredJson = (value, fallback) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const omitPassword = (account) => {
  const { password: _PASSWORD, ...userWithoutPassword } = account
  return userWithoutPassword
}

// Dummy accounts stored in localStorage
const getStoredUsers = () => {
  const stored = localStorage.getItem('kusgan_users')
  if (stored) {
    const parsed = parseStoredJson(stored, [])
    if (Array.isArray(parsed)) {
      return parsed.map(enrichUserWithProfileImage)
    }
  }
  // Default dummy accounts
  return [
    {
      id: 1,
      name: 'Admin User',
      email: 'admin@kusgan.com',
      password: 'admin123',
      role: 'admin',
      canCreateAnnouncement: true,
      canCreatePlan: true,
      address: '',
      status: 'active',
      memberSince: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'John Doe',
      email: 'john@kusgan.com',
      password: 'john123',
      role: 'member',
      canCreateAnnouncement: false,
      canCreatePlan: false,
      address: '',
      status: 'active',
      memberSince: new Date().toISOString(),
    },
    {
      id: 3,
      name: 'Jane Smith',
      email: 'jane@kusgan.com',
      password: 'jane123',
      role: 'member',
      canCreateAnnouncement: false,
      canCreatePlan: false,
      address: '',
      status: 'active',
      memberSince: new Date().toISOString(),
    },
  ]
}

const getStoredCurrentUser = () => {
  const stored = localStorage.getItem('kusgan_current_user')
  const parsed = parseStoredJson(stored, null)
  return parsed ? enrichUserWithProfileImage(parsed) : null
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
  const stored = localStorage.getItem(activityKey)
  const activity = stored ? JSON.parse(stored) : []
  const todayKey = getTodayDateKey()
  const timestamp = new Date().toISOString()

  const existingIndex = activity.findIndex(
    (entry) => entry.date === todayKey && entry.userId === loggedInUser.id
  )

  const payload = {
    date: todayKey,
    userId: loggedInUser.id,
    name: loggedInUser.name,
    email: loggedInUser.email,
    role: loggedInUser.role,
    profileImage: loggedInUser.profileImage,
    lastLoginAt: timestamp,
  }

  if (existingIndex >= 0) {
    activity[existingIndex] = payload
  } else {
    activity.push(payload)
  }

  localStorage.setItem(activityKey, JSON.stringify(activity))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredCurrentUser)
  const [users, setUsers] = useState(getStoredUsers)
  const [loading] = useState(false)

  useEffect(() => {
    // Initialize users in localStorage if not present
    if (!localStorage.getItem('kusgan_users')) {
      localStorage.setItem('kusgan_users', JSON.stringify(getStoredUsers()))
    }
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

  const login = (email, password) => {
    const foundUser = users.find(u => u.email === email && u.password === password)
    if (foundUser) {
      const userWithoutPassword = omitPassword(foundUser)
      setUser(userWithoutPassword)
      recordDailyPresence(userWithoutPassword)
      return { success: true, user: userWithoutPassword }
    }
    return { success: false, message: 'Invalid email or password' }
  }

  const register = (name, email, password) => {
    const exists = users.find(u => u.email === email)
    if (exists) {
      return { success: false, message: 'Email already registered' }
    }
    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
      role: 'member',
      canCreateAnnouncement: false,
      canCreatePlan: false,
      profileImage: createProfileImageUrl(name),
    }
    setUsers([...users, newUser])
    const userWithoutPassword = omitPassword(newUser)
    setUser(userWithoutPassword)
    recordDailyPresence(userWithoutPassword)
    return { success: true, user: userWithoutPassword }
  }

  const logout = () => {
    setUser(null)
  }

  const updateMemberPermission = (memberId, permission, value) => {
    const updatedUsers = users.map(u => {
      if (u.id === memberId) {
        return { ...u, [permission]: value }
      }
      return u
    })
    setUsers(updatedUsers)
    // Update current user if they're the one being modified
    if (user && user.id === memberId) {
      setUser({ ...user, [permission]: value })
    }
  }

  const getAllMembers = () => {
    return users.map(omitPassword)
  }

  const addUser = (userData) => {
    const resolvedId = userData.id !== undefined && userData.id !== null && String(userData.id).trim() !== ''
      ? userData.id
      : Date.now()

    const newUser = {
      id: resolvedId,
      name: userData.name,
      email: userData.email || '',
      password: userData.password || '',
      role: 'member',
      canCreateAnnouncement: false,
      canCreatePlan: false,
      address: userData.address || '',
      status: userData.status || 'active',
      memberSince: userData.memberSince || new Date().toISOString(),
    }
    setUsers([...users, newUser])
    return { success: true, user: newUser }
  }

  const deleteMembers = (memberIds) => {
    const idSet = new Set(memberIds.map(id => String(id)))
    const updatedUsers = users.filter(u => !idSet.has(String(u.id)))
    setUsers(updatedUsers)

    if (user && idSet.has(String(user.id))) {
      setUser(null)
    }
  }

  const updateMember = (memberId, updates) => {
    const updatedUsers = users.map(u => {
      if (String(u.id) === String(memberId)) {
        return { ...u, ...updates }
      }
      return u
    })
    setUsers(updatedUsers)

    if (user && String(user.id) === String(memberId)) {
      setUser(prev => ({ ...prev, ...updates }))
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      register, 
      loading,
      updateMemberPermission,
      getAllMembers,
      addUser,
      deleteMembers,
      updateMember,
      users: users.map(omitPassword)
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
