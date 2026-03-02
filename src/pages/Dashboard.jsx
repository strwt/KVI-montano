import { useEffect, useMemo, useState } from 'react'
import { Activity, Bell, Leaf, Flame, FileText, HeartPulse, Calendar as CalendarIcon, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const getStoredEvents = () => {
  const stored = localStorage.getItem('kusgan_events')
  return stored ? JSON.parse(stored) : []
}

const EVENT_CATEGORIES = [
  { key: 'environmental', label: 'Environmental', icon: Leaf, color: 'bg-green-100 text-green-700', borderColor: 'border-green-200' },
  { key: 'relief operation', label: 'Relief Operation', icon: Activity, color: 'bg-blue-100 text-blue-700', borderColor: 'border-blue-200' },
  { key: 'fire response', label: 'Fire Response', icon: Flame, color: 'bg-orange-100 text-orange-700', borderColor: 'border-orange-200' },
  { key: 'notes', label: 'Notes', icon: FileText, color: 'bg-purple-100 text-purple-700', borderColor: 'border-purple-200' },
  { key: 'medical', label: 'Medical', icon: HeartPulse, color: 'bg-pink-100 text-pink-700', borderColor: 'border-pink-200' },
]

const resolveEventDate = event => event.dateTime || event.date || null
const getEventsCategoryRoute = categoryKey => `/events?category=${encodeURIComponent(categoryKey)}`
const RECENT_ACTIVITY_LIMIT = 5

const getIconThemeClass = categoryKey => {
  if (categoryKey === 'environmental') return 'icon-theme-environmental'
  if (categoryKey === 'relief operation') return 'icon-theme-relief'
  if (categoryKey === 'fire response') return 'icon-theme-fire'
  if (categoryKey === 'notes') return 'icon-theme-notes'
  if (categoryKey === 'medical') return 'icon-theme-medical'
  return ''
}

function Dashboard() {
  const { user, users } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const [animatedStats, setAnimatedStats] = useState(false)
  const [events] = useState(getStoredEvents)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStats(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const recentEvents = useMemo(() => {
    return [...events]
      .filter(event => resolveEventDate(event) && dayjs(resolveEventDate(event)).isValid())
      .sort((a, b) => dayjs(resolveEventDate(b)).valueOf() - dayjs(resolveEventDate(a)).valueOf())
      .slice(0, RECENT_ACTIVITY_LIMIT)
  }, [events])

  const loggedInMembers = useMemo(() => {
    return users.filter(member => member.accountStatus === 'Active')
  }, [users])

  const categoryCounts = useMemo(() => {
    return EVENT_CATEGORIES.reduce((acc, category) => {
      acc[category.key] = events.filter(event => (event.category || '').toLowerCase() === category.key).length
      return acc
    }, {})
  }, [events])

  const handleOpenEventInCalendar = (event) => {
    navigate('/calendar', {
      state: {
        focusEventId: event.id,
        preserveFilters: true,
        scrollToEvent: true,
      },
    })
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-black p-6 mb-6 text-white rounded-2xl shadow-md relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#F50000] rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, <span className="text-[#F50000]">{user?.name || 'Volunteer'}</span>!
          </h2>
          <p className="text-white">KUSGAN Volunteer Inc. - Community Service under Cares Department</p>
          <div className="mt-4">
            <span className="px-3 py-1 bg-red-600/30 text-red-400 rounded-full text-sm">
              {isAdmin ? 'Administrator' : 'Member'}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Events by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {EVENT_CATEGORIES.map((category, index) => (
            <button
              key={category.key}
              className={`bg-white border border-gray-100 layout-glow text-left rounded-xl p-5 transition-all duration-300 hover:shadow-md ${
                animatedStats ? 'animate-fade-in-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => navigate(getEventsCategoryRoute(category.key))}
            >
              <div className={`statcard-icon-3d ${getIconThemeClass(category.key)} w-11 h-11 rounded-xl ${category.color} flex items-center justify-center mb-3`}>
                <category.icon size={20} />
              </div>
              <p className="text-gray-600 text-sm">{category.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{categoryCounts[category.key] || 0}</p>
              <p className="text-gray-500 text-sm mt-1">events</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
        <div className="xl:col-span-4 bg-white rounded-xl shadow-md p-5 layout-glow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={20} className="text-green-600" />
            Logged In Members
          </h3>
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {loggedInMembers.map((member, index) => (
              <div
                key={`${member.id}-${member.idNumber || member.email || index}`}
                className={`p-3 rounded-lg border border-green-100 bg-green-50/60 ${
                  animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">{member.role === 'admin' ? 'Administrator' : 'Member'}</p>
                <p className="text-xs text-gray-500 mt-1">Committee: {member.committee || 'Unassigned'}</p>
              </div>
            ))}
            {loggedInMembers.length === 0 && <p className="text-sm text-gray-500 text-center py-3">No logged in members</p>}
          </div>
        </div>

        <div className="xl:col-span-8 bg-white rounded-xl shadow-md p-6 layout-glow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bell size={20} className="text-red-500" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {recentEvents.map((event, index) => (
              <div
                key={`${event.id || 'event'}-${resolveEventDate(event) || 'no-date'}-${index}`}
                className={`flex items-start gap-4 p-4 bg-gray-50 rounded-lg transition-all hover:bg-gray-100 hover:shadow-md cursor-pointer ${
                  animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${(index + 5) * 0.08}s` }}
                onClick={() => handleOpenEventInCalendar(event)}
              >
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <CalendarIcon size={16} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 font-medium truncate">{event.title}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {dayjs(resolveEventDate(event)).format('MMM D, YYYY h:mm A')}
                  </p>
                </div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                  {event.category || 'Uncategorized'}
                </span>
              </div>
            ))}
            {recentEvents.length === 0 && <p className="text-gray-500 text-center py-4">No activity yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
