import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
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
import { useI18n } from '../i18n/useI18n'

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
const LOGIN_ACTIVITY_LIMIT = 8

const getStoredLoginActivity = () => {
  const stored = localStorage.getItem('kusgan_login_activity')
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(entry => entry?.lastLoginAt && dayjs(entry.lastLoginAt).isValid())
      .sort((a, b) => dayjs(b.lastLoginAt).valueOf() - dayjs(a.lastLoginAt).valueOf())
      .slice(0, LOGIN_ACTIVITY_LIMIT)
  } catch {
    return []
  }
}

const getCategorySlices = counts => {
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
      stroke: index % 2 === 0 ? 'var(--dashboard-accent-stroke)' : 'var(--dashboard-muted-stroke)',
    }
    offset += dash
    return slice
  })
}

const getIconThemeClass = categoryKey => {
  if (categoryKey === 'environmental') return 'icon-theme-environmental'
  if (categoryKey === 'relief operation') return 'icon-theme-relief'
  if (categoryKey === 'fire response') return 'icon-theme-fire'
  if (categoryKey === 'notes') return 'icon-theme-notes'
  if (categoryKey === 'medical') return 'icon-theme-medical'
  return ''
}

function Dashboard() {
  const { user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const [animatedStats, setAnimatedStats] = useState(false)
  const [events] = useState(getStoredEvents)
  const [recentLogins] = useState(getStoredLoginActivity)

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
    return items.length ? items : [{ name: t('No assigned volunteers'), count: 0 }]
  }, [events, t])

  const maxVolunteerCount = useMemo(() => Math.max(...volunteerBars.map(item => item.count), 1), [volunteerBars])
  const categorySlices = useMemo(() => getCategorySlices(categoryCounts), [categoryCounts])
  const eventsThisMonth = useMemo(() => {
    return events.filter(event => {
      const dateValue = resolveEventDate(event)
      return dateValue && dayjs(dateValue).isValid() && dayjs(dateValue).isSame(dayjs(), 'month')
    }).length
  }, [events])

  const handleOpenEventInCalendar = event => {
    navigate('/calendar', {
      state: {
        focusEventId: event.id,
        preserveFilters: true,
        scrollToEvent: true,
      },
    })
  }

  const onlineUserId = String(user?.id || '')

  return (
    <div className="animate-fade-in space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-red-600 bg-gradient-to-br from-white to-neutral-100 p-6 text-neutral-900 shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-colors dark:from-black dark:to-neutral-900 dark:text-zinc-100 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-red-600/15 blur-3xl dark:bg-red-600/25" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-300">{t('Volunteer Management')}</p>
            <h1 className="text-[32px] font-semibold leading-tight">
              {t('Welcome back,')} <span className="text-red-500">{user?.name || t('Volunteer')}</span>
            </h1>
            <p className="text-[14px] text-neutral-300">KUSGAN Volunteer Inc. - Cares Department</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-lg border border-red-700/60 bg-red-600/15 px-3 py-1 text-[14px]">
                {isAdmin ? t('Administrator') : t('Member')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-600 bg-red-600 px-6 py-2 text-[14px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-red-700"
          >
            {t('Create Event')}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <h2 className="mb-3 text-[24px] font-semibold text-black">{t('Events by Category')}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {EVENT_CATEGORIES.map((category, index) => (
              <button
                key={category.key}
                type="button"
                onClick={() => navigate(getEventsCategoryRoute(category.key))}
                className={`h-full cursor-pointer rounded-xl border border-red-600 bg-white p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:border-red-700 hover:shadow-[0_8px_14px_rgba(0,0,0,0.08)] dark:bg-zinc-900 ${
                  animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-red-600 dark:bg-zinc-800">
                  <category.icon size={18} className={getIconThemeClass(category.key)} />
                </div>
                <p className="text-[14px] text-neutral-500">{t(category.label)}</p>
                <p className="text-[18px] font-semibold text-black">{categoryCounts[category.key] || 0}</p>
              </button>
            ))}
          </div>
          </div> 
	      </section>

      <section className="grid grid-cols-12 items-stretch gap-4">
        <article className="col-span-12 rounded-2xl border border-red-600 bg-black p-4 md:p-5 text-white shadow-[0_12px_24px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-[1.02] md:col-span-6">
          <p className="mt-1 text-[36px] font-semibold leading-none text-red-500">{totalEvents}</p>
          <p className="mt-2 text-[18px] text-white">{t('Total Events')}</p>
        </article>
      </section>

        <article className="col-span-12 rounded-2xl border border-red-600 bg-white p-4 md:p-5 shadow-[0_10px_20px_rgba(0,0,0,0.08)] transition-all duration-200 hover:scale-[1.02] sm:col-span-6 md:col-span-6 flex flex-col justify-center">
          <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-500">{t('This Month')}</p>
          <p className="mt-1 text-[30px] font-semibold text-black">{eventsThisMonth}</p>
          <p className="mt-2 text-[14px] text-neutral-500">{t('events created')}</p>
        </article>

      {isAdmin && (
        <section className="grid grid-cols-12 gap-4">
          <article className="col-span-12 rounded-2xl border border-red-600 bg-white p-5 md:p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[24px] font-semibold text-black">{t('Logged in Members')}</h2>
              <span className="rounded-lg border border-red-600 bg-red-50 px-3 py-1 text-[14px] text-red-700">
                {recentLogins.filter(entry => entry.role === 'member').length} {t('recent')}
              </span>
            </div>
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {recentLogins
                .filter(entry => entry.role === 'member')
                .map((entry, index) => {
                  const isOnline = String(entry.userId) === onlineUserId
                  return (
                    <div
                      key={`${entry.userId}-${entry.lastLoginAt}-${index}`}
                      className="grid grid-cols-12 items-center gap-3 rounded-xl border border-red-600 bg-white p-3"
                    >
                      <div className="col-span-12 flex items-center gap-3 md:col-span-5">
                        <img
                          src={entry.profileImage || '/image-removebg-preview.png'}
                          alt={entry.name || t('Member')}
                          className="h-9 w-9 rounded-full border border-neutral-300 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[18px] font-medium text-black">{entry.name || t('Unknown Member')}</p>
                          <p className="truncate text-[14px] capitalize text-neutral-500">{entry.role || 'member'}</p>
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-5">
                        <p className="text-[14px] text-neutral-700">{dayjs(entry.lastLoginAt).format('MMM D, YYYY h:mm A')}</p>
                      </div>
                      <div className="col-span-12 md:col-span-2">
                        <span className={`inline-flex rounded-lg border px-2 py-1 text-[14px] ${
                          isOnline ? 'border-red-600 bg-red-50 text-red-700' : 'border-neutral-300 bg-neutral-100 text-neutral-600'
                        }`}>
                          {isOnline ? t('Online') : t('Offline')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              {recentLogins.filter(entry => entry.role === 'member').length === 0 && (
                 <p className="py-2 text-[14px] text-neutral-500">{t('No recent member logins yet.')}</p>
              )}
            </div>
          </article>
        </section>
      )}

      {isAdmin && (
        <section className="grid grid-cols-12 gap-4">
          <article className="col-span-12 rounded-2xl border border-red-600 bg-white p-5 md:p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[24px] font-semibold text-black">{t('Recent Activity')}</h2>
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="cursor-pointer rounded-lg border border-red-600 bg-white px-4 py-2 text-[14px] font-medium text-red-600 transition-all duration-200 hover:scale-[1.02] hover:bg-red-50"
              >
                {t('View All')}
              </button>
            </div>
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {recentEvents.map((event, index) => (
                <button
                  type="button"
                  key={`${event.id || 'event'}-${resolveEventDate(event) || 'no-date'}-${index}`}
                  onClick={() => handleOpenEventInCalendar(event)}
                  className={`group flex w-full cursor-pointer items-start gap-4 rounded-xl border border-red-600 bg-white p-3 md:p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_10px_16px_rgba(0,0,0,0.08)] ${
                    animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className="relative flex flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white">
                      <CalendarIcon size={14} />
                    </span>
                    {index !== recentEvents.length - 1 && <span className="mt-2 h-12 w-px bg-neutral-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[18px] font-medium text-black">{event.title || t('Untitled Event')}</p>
                    <p className="mt-1 text-[14px] text-neutral-500">
                      {dayjs(resolveEventDate(event)).format('MMM D, YYYY h:mm A')}
                    </p>
                  </div>
                  <span className="rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 text-[14px] capitalize text-neutral-700">
                    {event.category || t('Uncategorized')}
                  </span>
                </button>
              ))}
              {recentEvents.length === 0 && <p className="py-4 text-center text-[14px] text-neutral-500">{t('No activity yet')}</p>}
            </div>
          </article>
        </section>
      )}

	      <section className="grid grid-cols-12 items-stretch gap-4">
        {isAdmin && (
          <article className="col-span-12 rounded-2xl border border-red-600 bg-white p-5 md:p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] md:col-span-6 min-h-[400px] flex flex-col">
            <h2 className="mb-3 text-[24px] font-semibold text-black">{t('Category Share')}</h2>
            <div className="flex flex-1 flex-col items-center gap-4">
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
                       {t(slice.label)}
                    </span>
                    <span className="font-medium text-black">{`${Math.round(slice.dash)}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        )}

        <article className={`col-span-12 rounded-2xl border border-red-600 bg-white shadow-[0_10px_20px_rgba(0,0,0,0.08)] flex flex-col ${
          isAdmin ? 'p-5 md:p-6 min-h-[400px] md:col-span-6' : 'p-4 md:p-5 md:col-span-6'
        }`}>
          <h2 className="mb-3 text-[24px] font-semibold text-black">{t('Volunteer Participation')}</h2>
          <div className="space-y-4">
            {volunteerBars.map((item, index) => {
              const width = (item.count / maxVolunteerCount) * 100
              return (
                <div key={`${item.name}-${index}`} className="space-y-1">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="flex items-center gap-2 truncate text-neutral-600 dark:text-zinc-400">
                      <Users size={14} className="text-red-600" />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-zinc-100">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-200 dark:bg-zinc-700">
                    <div className="h-2 rounded-full bg-red-600 transition-all duration-200" style={{ width: `${width || 4}%` }} />
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

export default Dashboard
