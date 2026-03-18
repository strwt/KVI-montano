import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout/Layout'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Attendance from './pages/Attendance'
import Profile from './pages/Profile'
import ChangePassword from './pages/ChangePassword'
import EditAccount from './pages/EditAccount'
import Members from './pages/Members'
import MemberDetail from './pages/MemberDetail'
import Report from './pages/Report'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Recruitment from './pages/Recruitment'
import Settings from './pages/Settings'
import { AuthProvider, useAuth } from './context/AuthContext'
import './index.css'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/landing" replace />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

// Public Route - Redirects to dashboard if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  // Don't block public pages (login/landing/recruitment) while auth bootstraps.
  // This keeps the login page responsive even if Supabase is slow/unreachable.
  if (loading && !user) return children

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/recruitment" element={<PublicRoute><Recruitment /></PublicRoute>} />
      <Route path="/register" element={<Navigate to="/login" replace />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="events" element={<Calendar listOnly />} />
        <Route path="report" element={<AdminRoute><Report /></AdminRoute>} />
        <Route path="profile" element={<Profile />} />
        <Route path="account/edit" element={<EditAccount />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="settings" element={<Settings />} />
        <Route path="members" element={<Members />} />
        <Route path="members/:id" element={<MemberDetail />} />
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App
