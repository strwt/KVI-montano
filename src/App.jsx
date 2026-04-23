import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout/Layout'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Attendance from './pages/Attendance'
import AttendanceManagement from './pages/AttendanceManagement'
import Profile from './pages/Profile'
import ChangePassword from './pages/ChangePassword'
import EditAccount from './pages/EditAccount'
import Members from './pages/Members'
import MemberDetail from './pages/MemberDetail'
import Donations from './pages/Donations'
import Report from './pages/Report'
import AchievementsManagement from './pages/AchievementsManagement'
import Login from './pages/Login'
import Landing from './pages/Landing'
import NewsArticle from './pages/NewsArticle'
import Recruitment from './pages/Recruitment'
import OrganizationStructure from './pages/OrganizationStructure'
import WhoWeAre from './pages/WhoWeAre'
import Settings from './pages/Settings'
import CategoryManagement from './pages/CategoryManagement'
import CommitteeManagement from './pages/CommitteeManagement'
import ChatbotWidget from './components/ChatbotWidget'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ConfirmProvider } from './context/ConfirmContext'
import './index.css'

function AuthPendingState({ title = 'Loading your session...' }) {
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 h-10 w-40 animate-pulse rounded-xl bg-white shadow-sm" />
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="hidden rounded-2xl bg-white p-4 shadow-sm md:block">
            <div className="mb-3 h-6 w-28 animate-pulse rounded bg-gray-200" />
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
              <p className="text-sm font-medium text-gray-700">{title}</p>
            </div>
            <div className="space-y-3">
              <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, authResolved, loading } = useAuth()

  if (!authResolved && !user) return <AuthPendingState />
  if (user && !user.role) return <AuthPendingState title="Loading account access..." />
  if (user && loading) return <AuthPendingState title="Loading your data..." />

  if (!user) {
    return <Navigate to="/landing" replace />
  }

  return children
}

function AdminRoute({ children }) {
  const { user, authResolved, loading } = useAuth()

  if (!authResolved && !user) return <AuthPendingState title="Checking admin access..." />
  if (user && !user.role) return <AuthPendingState title="Loading account access..." />
  if (user && loading) return <AuthPendingState title="Loading your data..." />

  if (!user) {
    return <Navigate to="/landing" replace />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

function MemberRoute({ children }) {
  const { user, authResolved, loading } = useAuth()

  if (!authResolved && !user) return <AuthPendingState title="Checking member access..." />
  if (user && !user.role) return <AuthPendingState title="Loading account access..." />
  if (user && loading) return <AuthPendingState title="Loading your data..." />

  if (!user) {
    return <Navigate to="/landing" replace />
  }

  if (user.role === 'admin') {
    return <Navigate to="/attendance-management" replace />
  }

  return children
}

// Public Route - Redirects to dashboard if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (user?.role && !loading) {
    return <Navigate to="/" replace />
  }

  return children
}

function ChatbotGate() {
  const { user } = useAuth()
  if (user?.role === 'admin') return null
  return <ChatbotWidget />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/recruitment" element={<PublicRoute><Recruitment /></PublicRoute>} />
      <Route path="/news/:id" element={<NewsArticle />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/organization/board" element={<OrganizationStructure mode="board" />} />
      <Route path="/organization/kusgan" element={<OrganizationStructure mode="kusgan" />} />
      <Route path="/who-we-are/overview" element={<WhoWeAre mode="overview" />} />
      <Route path="/who-we-are/mission-vision" element={<WhoWeAre mode="mission-vision" />} />
      <Route path="/who-we-are/news" element={<WhoWeAre mode="news" />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="attendance" element={<MemberRoute><Attendance /></MemberRoute>} />
        <Route path="attendance-management" element={<AdminRoute><AttendanceManagement /></AdminRoute>} />
        <Route path="events" element={<Calendar listOnly />} />
        <Route path="report" element={<AdminRoute><Report /></AdminRoute>} />
        <Route path="achievements" element={<AdminRoute><AchievementsManagement /></AdminRoute>} />
        <Route path="category-management" element={<AdminRoute><CategoryManagement /></AdminRoute>} />
        <Route path="committee-management" element={<AdminRoute><CommitteeManagement /></AdminRoute>} />
        <Route path="profile" element={<Profile />} />
        <Route path="account/edit" element={<EditAccount />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="settings" element={<Settings />} />
        <Route path="members" element={<AdminRoute><Members /></AdminRoute>} />
        <Route path="members/:id" element={<AdminRoute><MemberDetail /></AdminRoute>} />
        <Route path="donations" element={<AdminRoute><Donations /></AdminRoute>} />
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Router>
          <AppRoutes />
          <ChatbotGate />
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  )
}

export default App
