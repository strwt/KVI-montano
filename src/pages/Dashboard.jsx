import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Bell,
  Leaf,
  Flame,
  FileText,
  HeartPulse,
  Calendar as CalendarIcon,
  ArrowRight,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const getStoredEvents = () => {
  const stored = localStorage.getItem('kusgan_events')
  return stored ? JSON.parse(stored) : []
}

const EVENT_CATEGORIES = [
  { key: 'environmental', label: 'Environmental', icon: Leaf },
  { key: 'relief operation', label: 'Relief Operation', icon: Activity },
  { key: 'fire response', label: 'Fire Response', icon: Flame },
  { key: 'notes', label: 'Notes', icon: FileText },
  { key: 'medical', label: 'Medical', icon: HeartPulse },
]

const resolveEventDate = event => event.dateTime || event.date || null
const getEventsCategoryRoute = categoryKey => `/events?category=${encodeURIComponent(categoryKey)}`
const RECENT_ACTIVITY_LIMIT = 5
const MONTH_WINDOW = 6

const getMonthlyEvents = (events) => {
  return Array.from({ length: MONTH_WINDOW }, (_, index) => {
    const month = dayjs().subtract(MONTH_WINDOW - 1 - index, 'month')
    const count = events.filter(event => {
      const dateValue = resolveEventDate(event)
      return dateValue && dayjs(dateValue).isValid() && dayjs(dateValue).isSame(month, 'month')
    }).length
    return { label: month.format('MMM'), count }
  })
}

const buildLinePath = (data, width, height, padding) => {
  const max = Math.max(...data.map(item => item.count), 1)
  const chartWidth = width - (padding * 2)
  const chartHeight = height - (padding * 2)
  const step = data.length > 1 ? chartWidth / (data.length - 1) : 0

  const points = data.map((item, index) => ({
    x: padding + (step * index),
    y: height - padding - ((item.count / max) * chartHeight),
  }))

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

const getCategorySlices = (counts) => {
  const values = Object.values(counts)
  const total = values.reduce((acc, value) => acc + value, 0) || 1
  let offset = 0

  return EVENT_CATEGORIES.map((category, index) => {
    const value = counts[category.key] || 0
    const dash = (value / total) * 100
    const slice = {
      key: category.key,
      label: category.label,
      value,
      dash,
      offset,
      stroke: index % 2 === 0 ? '#DC143C' : '#525252',
    }
    offset += dash
    return slice
  })
}

function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const [animatedStats, setAnimatedStats] = useState(false)
  const [events] = useState(getStoredEvents)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStats(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const totalEvents = events.length
  const recentEvents = useMemo(() => {
    return [...events]
      .filter(event => resolveEventDate(event) && dayjs(resolveEventDate(event)).isValid())
      .sort((a, b) => dayjs(resolveEventDate(b)).valueOf() - dayjs(resolveEventDate(a)).valueOf())
      .slice(0, RECENT_ACTIVITY_LIMIT)
  }, [events])

  const categoryCounts = useMemo(() => {
    return EVENT_CATEGORIES.reduce((acc, category) => {
      acc[category.key] = events.filter(event => (event.category || '').toLowerCase() === category.key).length
      return acc
    }, {})
  }, [events])

  const monthlyEvents = useMemo(() => getMonthlyEvents(events), [events])
  const linePath = useMemo(() => buildLinePath(monthlyEvents, 640, 220, 20), [monthlyEvents])
  const maxMonthlyCount = useMemo(() => Math.max(...monthlyEvents.map(item => item.count), 1), [monthlyEvents])

  const volunteerBars = useMemo(() => {
    const map = {}
    events.forEach(event => {
      const names = (event.membersInvolve || '')
        .split(',')
        .map(name => name.trim())
        .filter(Boolean)
      names.forEach(name => {
        map[name] = (map[name] || 0) + 1
      })
    })
    const items = Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    return items.length ? items : [{ name: 'No assigned volunteers', count: 0 }]
  }, [events])

  const maxVolunteerCount = useMemo(() => Math.max(...volunteerBars.map(item => item.count), 1), [volunteerBars])
  const categorySlices = useMemo(() => getCategorySlices(categoryCounts), [categoryCounts])
  const eventsThisMonth = useMemo(() => {
    return events.filter(event => {
      const dateValue = resolveEventDate(event)
      return dateValue && dayjs(dateValue).isValid() && dayjs(dateValue).isSame(dayjs(), 'month')
    }).length
  }, [events])

  const categoriesUsed = useMemo(() => {
    return Object.values(categoryCounts).filter(value => value > 0).length
  }, [categoryCounts])

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
    <div className="animate-fade-in space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-black to-neutral-900 p-6 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#DC143C]/25 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-300">Volunteer Management</p>
            <h1 className="text-[32px] font-semibold leading-tight">
              Welcome back, <span className="text-[#DC143C]">{user?.name || 'Volunteer'}</span>
            </h1>
            <p className="text-[14px] text-neutral-300">KUSGAN Volunteer Inc. - Cares Department</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-[14px]">{eventsThisMonth} this month</span>
              <span className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-[14px]">{categoriesUsed} active categories</span>
              <span className="rounded-lg border border-[#B01030]/60 bg-[#DC143C]/15 px-3 py-1 text-[14px]">{isAdmin ? 'Administrator' : 'Member'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#DC143C] bg-[#DC143C] px-6 py-2 text-[14px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-[#B01030]"
          >
            Create Event
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-4">
        <article className="col-span-12 rounded-2xl border border-neutral-900 bg-black p-6 text-white shadow-[0_12px_24px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-[1.02] md:col-span-6">
          <p className="mt-2 text-[48px] font-semibold leading-none text-[#DC143C]">{totalEvents}</p>
          <p className="mt-2 text-[18px] text-white">Total Events</p>
        </article>

        <article className="col-span-12 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] transition-all duration-200 hover:scale-[1.02] sm:col-span-6 md:col-span-3">
          <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-500">This Month</p>
          <p className="mt-2 text-[32px] font-semibold text-black">{eventsThisMonth}</p>
          <p className="mt-2 text-[14px] text-neutral-500">events created</p>
        </article>

        <article className="col-span-12 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] transition-all duration-200 hover:scale-[1.02] sm:col-span-6 md:col-span-3">
          <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-500">Recent Activity</p>
          <p className="mt-2 text-[32px] font-semibold text-black">{recentEvents.length}</p>
          <p className="mt-2 text-[14px] text-neutral-500">latest records</p>
        </article>
      </section>

      <section className="grid grid-cols-12 gap-4">
        <article className="col-span-12 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] md:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[24px] font-semibold text-black">Recent Activity</h2>
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="cursor-pointer rounded-lg border border-[#DC143C] bg-white px-4 py-2 text-[14px] font-medium text-[#DC143C] transition-all duration-200 hover:scale-[1.02] hover:bg-[rgba(220,20,60,0.08)]"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentEvents.map((event, index) => (
              <button
                type="button"
                key={`${event.id || 'event'}-${resolveEventDate(event) || 'no-date'}-${index}`}
                onClick={() => handleOpenEventInCalendar(event)}
                className={`group flex w-full cursor-pointer items-start gap-4 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_10px_16px_rgba(0,0,0,0.08)] ${
                  animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="relative flex flex-col items-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DC143C] text-white">
                    <CalendarIcon size={14} />
                  </span>
                  {index !== recentEvents.length - 1 && <span className="mt-2 h-12 w-px bg-neutral-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-medium text-black">{event.title || 'Untitled Event'}</p>
                  <p className="mt-1 text-[14px] text-neutral-500">
                    {dayjs(resolveEventDate(event)).format('MMM D, YYYY h:mm A')}
                  </p>
                </div>
                <span className="rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 text-[14px] capitalize text-neutral-700">
                  {event.category || 'Uncategorized'}
                </span>
              </button>
            ))}
            {recentEvents.length === 0 && <p className="py-4 text-center text-[14px] text-neutral-500">No activity yet</p>}
          </div>
        </article>

        <article className="col-span-12 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] md:col-span-5">
          <h2 className="mb-4 text-[24px] font-semibold text-black">Events by Category</h2>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_CATEGORIES.map((category, index) => (
              <button
                key={category.key}
                type="button"
                onClick={() => navigate(getEventsCategoryRoute(category.key))}
                className={`cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:border-[#DC143C]/40 hover:shadow-[0_8px_14px_rgba(0,0,0,0.08)] ${
                  animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-[#DC143C]">
                  <category.icon size={18} className={getIconThemeClass(category.key)} />
                </div>
                <p className="text-[14px] text-neutral-500">{category.label}</p>
                <p className="text-[18px] font-semibold text-black">{categoryCounts[category.key] || 0}</p>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-12 gap-4">
        <article className="col-span-12 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] md:col-span-6">
          <h2 className="mb-4 text-[24px] font-semibold text-black">Monthly Events</h2>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <svg viewBox="0 0 640 220" className="h-[220px] min-w-[560px] w-full">
              <defs>
                <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DC143C" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#DC143C" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M 20 200 L 620 200" stroke="#d4d4d4" strokeWidth="1" />
              <path d={linePath} fill="none" stroke="#DC143C" strokeWidth="3" strokeLinecap="round" />
              <path d={`${linePath} L 620 200 L 20 200 Z`} fill="url(#lineFill)" />
              {monthlyEvents.map((item, index) => {
                const x = 20 + ((600 / (monthlyEvents.length - 1 || 1)) * index)
                const y = 200 - ((item.count / maxMonthlyCount) * 160)
                return (
                  <g key={item.label}>
                    <circle cx={x} cy={y} r="4" fill="#DC143C" />
                    <text x={x} y="214" textAnchor="middle" fontSize="12" fill="#525252">{item.label}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </article>

        <article className="col-span-12 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] md:col-span-3">
          <h2 className="mb-4 text-[24px] font-semibold text-black">Category Share</h2>
          <div className="flex flex-col items-center gap-4">
            <svg viewBox="0 0 220 220" className="h-48 w-48">
              <circle cx="110" cy="110" r="76" fill="none" stroke="#e5e5e5" strokeWidth="20" />
              {categorySlices.map(slice => (
                <circle
                  key={slice.key}
                  cx="110"
                  cy="110"
                  r="76"
                  fill="none"
                  stroke={slice.stroke}
                  strokeWidth="20"
                  strokeDasharray={`${slice.dash} ${100 - slice.dash}`}
                  strokeDashoffset={-slice.offset}
                  pathLength="100"
                  transform="rotate(-90 110 110)"
                />
              ))}
            </svg>
            <div className="w-full space-y-2">
              {categorySlices.map(slice => (
                <div key={slice.key} className="flex items-center justify-between text-[14px]">
                  <span className="flex items-center gap-2 text-neutral-600">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.stroke }} />
                    {slice.label}
                  </span>
                  <span className="font-medium text-black">{slice.value}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="col-span-12 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] md:col-span-3">
          <h2 className="mb-4 text-[24px] font-semibold text-black">Volunteer Participation</h2>
          <div className="space-y-4">
            {volunteerBars.map((item, index) => {
              const width = (item.count / maxVolunteerCount) * 100
              return (
                <div key={`${item.name}-${index}`} className="space-y-1">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="flex items-center gap-2 truncate text-neutral-600">
                      <Users size={14} className="text-[#DC143C]" />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-medium text-black">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-200">
                    <div className="h-2 rounded-full bg-[#DC143C] transition-all duration-200" style={{ width: `${width || 4}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>
    </div>
  )
}

const getIconThemeClass = categoryKey => {
  if (categoryKey === 'environmental') return 'icon-theme-environmental'
  if (categoryKey === 'relief operation') return 'icon-theme-relief'
  if (categoryKey === 'fire response') return 'icon-theme-fire'
  if (categoryKey === 'notes') return 'icon-theme-notes'
  if (categoryKey === 'medical') return 'icon-theme-medical'
  return ''
}

export default Dashboard
