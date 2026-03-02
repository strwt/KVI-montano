import { useEffect, useMemo, useState } from 'react'
import { Activity, Bell, Leaf, Flame, FileText, HeartPulse, Calendar as CalendarIcon, PlusCircle, ChartColumn, Users, ChevronLeft, ChevronRight } from 'lucide-react'
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
const CALENDAR_FILTERS_KEY = 'kusgan_calendar_filters'
const getEventsCategoryRoute = categoryKey => `/events?category=${encodeURIComponent(categoryKey)}`

const getIconThemeClass = categoryKey => {
  if (categoryKey === 'environmental') return 'icon-theme-environmental'
  if (categoryKey === 'relief operation') return 'icon-theme-relief'
  if (categoryKey === 'fire response') return 'icon-theme-fire'
  if (categoryKey === 'notes') return 'icon-theme-notes'
  if (categoryKey === 'medical') return 'icon-theme-medical'
  return ''
}

const SHORTCUT_CARDS = [
  {
    id: 'create-event',
    title: 'Create Event',
    description: 'Open the event form and add a new community activity.',
    icon: PlusCircle,
    iconTheme: 'icon-theme-notes',
    onClick: navigate => navigate('/calendar', { state: { openCreateEventForm: true, preserveFilters: true } }),
  },
  {
    id: 'view-reports',
    title: 'View Reports',
    description: 'Open the analytics dashboard with filters and exports.',
    icon: ChartColumn,
    iconTheme: 'icon-theme-relief',
    onClick: navigate => navigate('/report'),
  },
  {
    id: 'manage-members',
    title: 'Manage Members',
    description: 'Add, filter, and organize volunteers by committee and category.',
    icon: Users,
    iconTheme: 'icon-theme-medical',
    onClick: navigate => navigate('/members'),
  },
]

const QUICK_ACTION_THEMES = [
  { card: 'from-cyan-500 via-sky-500 to-blue-600', glow: 'shadow-cyan-500/30', iconBg: 'bg-white/90 text-cyan-700' },
  { card: 'from-orange-500 via-amber-500 to-yellow-500', glow: 'shadow-orange-500/30', iconBg: 'bg-white/90 text-orange-700' },
  { card: 'from-violet-500 via-fuchsia-500 to-purple-600', glow: 'shadow-violet-500/30', iconBg: 'bg-white/90 text-violet-700' },
  { card: 'from-emerald-500 via-teal-500 to-cyan-600', glow: 'shadow-emerald-500/30', iconBg: 'bg-white/90 text-emerald-700' },
  { card: 'from-rose-500 via-pink-500 to-red-500', glow: 'shadow-rose-500/30', iconBg: 'bg-white/90 text-rose-700' },
  { card: 'from-lime-500 via-green-500 to-emerald-600', glow: 'shadow-lime-500/30', iconBg: 'bg-white/90 text-lime-700' },
  { card: 'from-indigo-500 via-blue-500 to-cyan-500', glow: 'shadow-indigo-500/30', iconBg: 'bg-white/90 text-indigo-700' },
  { card: 'from-red-500 via-orange-500 to-amber-500', glow: 'shadow-red-500/30', iconBg: 'bg-white/90 text-red-700' },
]

function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const [animatedStats, setAnimatedStats] = useState(false)
  const [events] = useState(getStoredEvents)
  const [calendarMonth, setCalendarMonth] = useState(dayjs().startOf('month'))

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStats(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const recentEvents = useMemo(() => {
    return [...events]
      .filter(event => resolveEventDate(event) && dayjs(resolveEventDate(event)).isValid())
      .sort((a, b) => dayjs(resolveEventDate(b)).valueOf() - dayjs(resolveEventDate(a)).valueOf())
      .slice(0, 5)
  }, [events])

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

  const categoryShortcuts = useMemo(
    () =>
      EVENT_CATEGORIES.map(category => ({
        id: `category-${category.key}`,
        title: category.label,
        description: `Open Calendar filtered to ${category.label} events.`,
        icon: category.icon,
        iconTheme: getIconThemeClass(category.key),
        onClick: navigate => {
          localStorage.setItem(
            CALENDAR_FILTERS_KEY,
            JSON.stringify({
              searchQuery: '',
              selectedCategory: category.label,
            })
          )
          navigate(getEventsCategoryRoute(category.key))
        },
      })),
    []
  )

  const allShortcuts = [...SHORTCUT_CARDS, ...categoryShortcuts]
  const memberShortcuts = [...categoryShortcuts]
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(event => {
      const eventDate = resolveEventDate(event)
      if (!eventDate || !dayjs(eventDate).isValid()) return
      const key = dayjs(eventDate).format('YYYY-MM-DD')
      map[key] = (map[key] || 0) + 1
    })
    return map
  }, [events])

  const calendarCells = useMemo(() => {
    const startOfMonth = calendarMonth.startOf('month')
    const endOfMonth = calendarMonth.endOf('month')
    const leading = startOfMonth.day()
    const daysInMonth = endOfMonth.date()
    const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7

    return Array.from({ length: totalCells }, (_, index) => {
      const dayOffset = index - leading
      const dateObj = startOfMonth.add(dayOffset, 'day')
      const isCurrentMonth = dateObj.month() === calendarMonth.month()
      const dateKey = dateObj.format('YYYY-MM-DD')
      return {
        date: dateObj,
        dateKey,
        dayNumber: dateObj.date(),
        isCurrentMonth,
        isToday: dateKey === dayjs().format('YYYY-MM-DD'),
        count: eventsByDate[dateKey] || 0,
      }
    })
  }, [calendarMonth, eventsByDate])

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
              {user?.role === 'admin' ? 'Administrator' : 'Member'}
            </span>
          </div>
        </div>
      </div>

      {isAdmin ? (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
        <div className="xl:col-span-8 min-w-0 layout-glow rounded-2xl p-4 sm:p-5 bg-white animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Quick Shortcuts</h3>
            <span className="text-xs sm:text-sm text-gray-500">Navigate instantly without page reload</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {allShortcuts.map((card, index) => (
              <button
                key={card.id}
                onClick={() => card.onClick(navigate)}
                className={`relative overflow-hidden text-left rounded-2xl p-6 min-h-[150px] transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.015] active:scale-[0.985] shadow-xl ${QUICK_ACTION_THEMES[index % QUICK_ACTION_THEMES.length].glow} ${
                  animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${QUICK_ACTION_THEMES[index % QUICK_ACTION_THEMES.length].card}`} />
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_46%)]" />
                <div className="flex items-start gap-4">
                  <div className={`relative z-10 statcard-icon-3d ${card.iconTheme} w-12 h-12 rounded-xl ${QUICK_ACTION_THEMES[index % QUICK_ACTION_THEMES.length].iconBg} flex items-center justify-center flex-shrink-0`}>
                    <card.icon size={20} />
                  </div>
                  <div className="relative z-10 min-w-0">
                    <p className="text-white font-semibold text-lg">{card.title}</p>
                    <p className="text-white/85 text-sm mt-1 leading-relaxed">{card.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-4 min-w-0 animate-fade-in-up space-y-4">
          <div className="w-full rounded-2xl border border-transparent [background:linear-gradient(#ffffff,#ffffff)_padding-box,linear-gradient(135deg,rgba(14,165,233,.55),rgba(99,102,241,.45),rgba(20,184,166,.42))_border-box] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 px-4 pt-4">
                <CalendarIcon size={18} className="text-sky-600" />
                <h3 className="text-lg font-semibold text-gray-800">Monthly Calendar</h3>
              </div>
              <div className="flex items-center gap-1 px-4 pt-4">
                <button
                  type="button"
                  onClick={() => setCalendarMonth(prev => prev.subtract(1, 'month'))}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(prev => prev.add(1, 'month'))}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 px-4 mb-2">{calendarMonth.format('MMMM YYYY')}</p>
            <div className="grid grid-cols-7 gap-0 border-t border-b border-gray-200">
              {weekdayLabels.map(label => (
                <div key={label} className="text-[11px] font-semibold text-gray-500 text-center py-2 border-r border-gray-200 last:border-r-0">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0">
              {calendarCells.map(cell => (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() =>
                    navigate('/calendar', {
                      state: {
                        openMonthKey: cell.date.format('YYYY-MM'),
                        focusDate: cell.dateKey,
                      },
                    })
                  }
                  className={`relative min-h-[44px] sm:min-h-[50px] border-r border-b border-gray-200 transition-all px-1 py-1.5 text-center overflow-hidden ${
                    cell.isCurrentMonth
                      ? 'bg-white hover:bg-sky-50'
                      : 'bg-gray-50 text-gray-400'
                  } ${cell.isToday ? 'ring-2 ring-inset ring-sky-300' : ''}`}
                >
                  <span className={`text-xs sm:text-sm font-medium ${cell.isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                    {cell.dayNumber}
                  </span>
                  {cell.count > 0 && cell.isCurrentMonth && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 min-w-4 h-4 px-1 rounded-full bg-sky-100 text-sky-700 text-[10px] inline-flex items-center justify-center">
                      {cell.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 px-4 py-3">Click a date to open Calendar events for that day.</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 layout-glow">
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Bell size={18} className="text-red-500" />
              Latest Activity
            </h3>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {recentEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 p-3 bg-gray-50 rounded-lg transition-all hover:bg-gray-100 hover:shadow-sm cursor-pointer ${
                    animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${(index + 5) * 0.08}s` }}
                  onClick={() => handleOpenEventInCalendar(event)}
                >
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon size={14} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 font-medium truncate">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {dayjs(resolveEventDate(event)).format('MMM D, YYYY h:mm A')}
                    </p>
                  </div>
                </div>
              ))}
              {recentEvents.length === 0 && <p className="text-sm text-gray-500 text-center py-3">No activity yet</p>}
            </div>
          </div>
        </div>
      </div>
      ) : (
        <>
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
            <div className="xl:col-span-8 min-w-0 layout-glow rounded-2xl p-4 sm:p-5 bg-white animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Quick Shortcuts</h3>
                <span className="text-xs sm:text-sm text-gray-500">Navigate instantly without page reload</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {memberShortcuts.map((card, index) => (
                  <button
                    key={card.id}
                    onClick={() => card.onClick(navigate)}
                    className={`relative overflow-hidden text-left rounded-2xl p-6 min-h-[150px] transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.015] active:scale-[0.985] shadow-xl ${QUICK_ACTION_THEMES[index % QUICK_ACTION_THEMES.length].glow} ${
                      animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                    }`}
                    style={{ animationDelay: `${index * 0.06}s` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${QUICK_ACTION_THEMES[index % QUICK_ACTION_THEMES.length].card}`} />
                    <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_46%)]" />
                    <div className="flex items-start gap-4">
                      <div className={`relative z-10 statcard-icon-3d ${card.iconTheme} w-12 h-12 rounded-xl ${QUICK_ACTION_THEMES[index % QUICK_ACTION_THEMES.length].iconBg} flex items-center justify-center flex-shrink-0`}>
                        <card.icon size={20} />
                      </div>
                      <div className="relative z-10 min-w-0">
                        <p className="text-white font-semibold text-lg">{card.title}</p>
                        <p className="text-white/85 text-sm mt-1 leading-relaxed">{card.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="xl:col-span-4 min-w-0 animate-fade-in-up">
              <div className="w-full rounded-2xl border border-transparent [background:linear-gradient(#ffffff,#ffffff)_padding-box,linear-gradient(135deg,rgba(14,165,233,.55),rgba(99,102,241,.45),rgba(20,184,166,.42))_border-box] shadow-xl overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 px-4 pt-4">
                    <CalendarIcon size={18} className="text-sky-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Monthly Calendar</h3>
                  </div>
                  <div className="flex items-center gap-1 px-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(prev => prev.subtract(1, 'month'))}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(prev => prev.add(1, 'month'))}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-700 px-4 mb-2">{calendarMonth.format('MMMM YYYY')}</p>
                <div className="grid grid-cols-7 gap-0 border-t border-b border-gray-200">
                  {weekdayLabels.map(label => (
                    <div key={label} className="text-[11px] font-semibold text-gray-500 text-center py-2 border-r border-gray-200 last:border-r-0">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0">
                  {calendarCells.map(cell => (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() =>
                        navigate('/calendar', {
                          state: {
                            openMonthKey: cell.date.format('YYYY-MM'),
                            focusDate: cell.dateKey,
                          },
                        })
                      }
                      className={`relative min-h-[44px] sm:min-h-[50px] border-r border-b border-gray-200 transition-all px-1 py-1.5 text-center overflow-hidden ${
                        cell.isCurrentMonth
                          ? 'bg-white hover:bg-sky-50'
                          : 'bg-gray-50 text-gray-400'
                      } ${cell.isToday ? 'ring-2 ring-inset ring-sky-300' : ''}`}
                    >
                      <span className={`text-xs sm:text-sm font-medium ${cell.isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                        {cell.dayNumber}
                      </span>
                      {cell.count > 0 && cell.isCurrentMonth && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 min-w-4 h-4 px-1 rounded-full bg-sky-100 text-sky-700 text-[10px] inline-flex items-center justify-center">
                          {cell.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 px-4 py-3">Click a date to open Calendar events for that day.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 layout-glow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Bell size={20} className="text-red-500" />
              Latest Activity
            </h3>
            <div className="space-y-4">
              {recentEvents.map((event, index) => (
                <div
                  key={event.id}
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
        </>
      )}
    </div>
  )
}

export default Dashboard
