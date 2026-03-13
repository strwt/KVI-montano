import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Droplets,
  Leaf,
  Flame,
  FileText,
  HeartPulse,
  Calendar as CalendarIcon,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useI18n } from '../i18n/useI18n'

const getStoredEvents = () => {
  const stored = localStorage.getItem('kusgan_events')
  return stored ? JSON.parse(stored) : []
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

const canonicalizeOperationKey = key => OPERATION_KEY_ALIASES[key] || key

const titleCaseFromKey = key =>
  String(key || '')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1))

const OPERATION_META = {
  tuli: { label: 'Tuli', icon: HeartPulse },
  blood_letting: { label: 'Blood Letting', icon: Activity },
  donations: { label: 'Donations', icon: FileText },
  environmental: { label: 'Environmental', icon: Leaf },
  relief_operation: { label: 'Relief Operation', icon: Activity },
  fire_response: { label: 'Fire Response', icon: Flame },
  water_distribution: { label: 'Water Distribution', icon: Droplets },
  notes: { label: 'Notes', icon: FileText },
  medical: { label: 'Medical', icon: HeartPulse },
}

const DEFAULT_OPERATION_ORDER = [
  'tuli',
  'blood_letting',
  'donations',
  'environmental',
  'relief_operation',
  'fire_response',
  'water_distribution',
  'notes',
  'medical',
]

const resolveEventDate = event => event.dateTime || event.date || null
const getEventsCategoryRoute = categoryKey => `/events?category=${encodeURIComponent(categoryKey)}`
const RECENT_ACTIVITY_LIMIT = 5
const LOGIN_ACTIVITY_LIMIT = 8

const getEventMatchKey = event => {
  const baseId = event?.id
  if (baseId !== undefined && baseId !== null && String(baseId).trim()) return `id:${baseId}`
  const dateValue = resolveEventDate(event) || ''
  const title = event?.title || ''
  const category = event?.category || ''
  return `fallback:${dateValue}|${title}|${category}`
}

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

const getIconThemeClass = categoryKey => {
  if (categoryKey === 'environmental') return 'icon-theme-environmental'
  if (categoryKey === 'relief_operation') return 'icon-theme-relief'
  if (categoryKey === 'fire_response') return 'icon-theme-fire'
  if (categoryKey === 'notes') return 'icon-theme-notes'
  if (categoryKey === 'medical') return 'icon-theme-medical'
  return ''
}

function Dashboard() {
  const { user, committees } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const [animatedStats, setAnimatedStats] = useState(false)
  const [events, setEvents] = useState(getStoredEvents)
  const [recentLogins] = useState(getStoredLoginActivity)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStats(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const reloadEvents = () => setEvents(getStoredEvents())
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') reloadEvents()
    }

    reloadEvents()
    window.addEventListener('storage', reloadEvents)
    window.addEventListener('focus', reloadEvents)
    window.addEventListener('kusgan-events-updated', reloadEvents)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('storage', reloadEvents)
      window.removeEventListener('focus', reloadEvents)
      window.removeEventListener('kusgan-events-updated', reloadEvents)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const recentEvents = useMemo(() => {
    return [...events]
      .filter(event => resolveEventDate(event) && dayjs(resolveEventDate(event)).isValid())
      .sort((a, b) => dayjs(resolveEventDate(b)).valueOf() - dayjs(resolveEventDate(a)).valueOf())
      .slice(0, RECENT_ACTIVITY_LIMIT)
  }, [events])

  const operations = useMemo(() => {
    const committeeEntries = Array.isArray(committees) ? committees : []
    const labelByKey = {}
    committeeEntries.forEach(entry => {
      const { category } = splitCategoryAndType(entry)
      const key = canonicalizeOperationKey(normalizeCategoryKey(category))
      if (!key) return
      if (!labelByKey[key]) labelByKey[key] = category.trim()
    })

    const keysFromCommittees = Object.keys(labelByKey)
    const keysFromEvents = events
      .map(event => canonicalizeOperationKey(normalizeCategoryKey(event.category)))
      .filter(Boolean)

    const keySet = new Set([...DEFAULT_OPERATION_ORDER, ...keysFromCommittees, ...keysFromEvents])
    const keys = Array.from(keySet)
    const unknownKeys = keys
      .filter(key => !DEFAULT_OPERATION_ORDER.includes(key))
      .sort((a, b) => titleCaseFromKey(a).localeCompare(titleCaseFromKey(b)))
    const orderedKeys = [
      ...DEFAULT_OPERATION_ORDER.filter(key => keySet.has(key)),
      ...unknownKeys,
    ]

    return orderedKeys.map(key => ({
      key,
      label: OPERATION_META[key]?.label || labelByKey[key] || titleCaseFromKey(key) || 'Uncategorized',
      icon: OPERATION_META[key]?.icon || FileText,
    }))
  }, [events, committees])

  const categoryCounts = useMemo(() => {
    const counts = {}
    events.forEach(event => {
      const key = canonicalizeOperationKey(normalizeCategoryKey(event.category))
      if (!key) return
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
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
        focusEventKey: getEventMatchKey(event),
        forceFocusEvent: true,
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
            <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-300">{t('Volunteer Management')}</p>
            <h1 className="text-[32px] font-semibold leading-tight">
              {t('Welcome back,')} <span className="text-red-500">{user?.name || t('Volunteer')}</span>
            </h1>
            <p className="text-[14px] text-neutral-500 dark:text-neutral-300">KUSGAN Volunteer Inc. - Cares Department</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-lg border border-red-700/60 bg-red-600/15 px-3 py-1 text-[14px]">
                {isAdmin ? t('Administrator') : t('Member')}
              </span>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                navigate('/calendar', {
                  state: { openCreateEventForm: true },
                })
              }
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-600 bg-red-600 px-6 py-2 text-[14px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-red-700"
            >
              {t('Create Event')}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <h2 className="mb-3 text-[24px] font-semibold text-black dark:text-zinc-100">{t('Events by Category')}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {operations.map((category, index) => (
              <button
                key={category.key}
                type="button"
                onClick={() => navigate(getEventsCategoryRoute(category.key))}
                className={`h-full cursor-pointer rounded-xl border border-red-600 bg-white p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:border-red-700 hover:shadow-[0_8px_14px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900 ${
                  animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-red-600 dark:bg-zinc-800">
                  <category.icon size={18} className={getIconThemeClass(category.key)} />
                </div>
                <p className="text-[14px] text-neutral-500 dark:text-zinc-400">{t(category.label)}</p>
                <p className="text-[18px] font-semibold text-black dark:text-zinc-100">{categoryCounts[category.key] || 0}</p>
              </button>
            ))}
          </div>
          </div> 
	      </section>


      {isAdmin && (
        <section className="grid grid-cols-12 gap-4">
          <article className="col-span-12 rounded-2xl border border-red-600 bg-white p-5 md:p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[24px] font-semibold text-black dark:text-zinc-100">{t('Logged in Members')}</h2>
              <span className="rounded-lg border border-red-600 bg-red-50 px-3 py-1 text-[14px] text-red-700 dark:bg-red-950/30 dark:text-red-300">
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
                      className="grid grid-cols-12 items-center gap-3 rounded-xl border border-red-600 bg-white p-3 dark:border-red-600 dark:bg-zinc-950"
                    >
                      <div className="col-span-12 flex items-center gap-3 md:col-span-5">
                        <img
                          src={entry.profileImage || '/image-removebg-preview.png'}
                          alt={entry.name || t('Member')}
                          className="h-9 w-9 rounded-full border border-neutral-300 object-cover dark:border-zinc-700"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[18px] font-medium text-black dark:text-zinc-100">{entry.name || t('Unknown Member')}</p>
                          <p className="truncate text-[14px] capitalize text-neutral-500 dark:text-zinc-400">{entry.role || 'member'}</p>
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-5">
                        <p className="text-[14px] text-neutral-700 dark:text-zinc-300">{dayjs(entry.lastLoginAt).format('MMM D, YYYY h:mm A')}</p>
                      </div>
                      <div className="col-span-12 md:col-span-2">
                        <span className={`inline-flex rounded-lg border px-2 py-1 text-[14px] ${
                          isOnline ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          {isOnline ? t('Online') : t('Offline')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              {recentLogins.filter(entry => entry.role === 'member').length === 0 && (
                 <p className="py-2 text-[14px] text-neutral-500 dark:text-zinc-400">{t('No recent member logins yet.')}</p>
              )}
            </div>
          </article>
        </section>
      )}

      <section className="grid grid-cols-12 gap-4">
        <article className="col-span-12 rounded-2xl border border-red-600 bg-white p-5 md:p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[24px] font-semibold text-black dark:text-zinc-100">{t('Recent Activity')}</h2>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="cursor-pointer rounded-lg border border-red-600 bg-white px-4 py-2 text-[14px] font-medium text-red-600 transition-all duration-200 hover:scale-[1.02] hover:bg-red-50 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                {t('View All')}
              </button>
            )}
          </div>
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {recentEvents.map((event, index) => (
              <button
                type="button"
                key={`${event.id || 'event'}-${resolveEventDate(event) || 'no-date'}-${index}`}
                onClick={() => handleOpenEventInCalendar(event)}
                className={`group flex w-full cursor-pointer items-start gap-4 rounded-xl border border-red-600 bg-white p-3 md:p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_10px_16px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-950 ${
                  animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="relative flex flex-col items-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white">
                    <CalendarIcon size={14} />
                  </span>
                  {index !== recentEvents.length - 1 && <span className="mt-2 h-12 w-px bg-neutral-300 dark:bg-zinc-700" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-medium text-black dark:text-zinc-100">{event.title || t('Untitled Event')}</p>
                  <p className="mt-1 text-[14px] text-neutral-500 dark:text-zinc-400">
                    {dayjs(resolveEventDate(event)).format('MMM D, YYYY h:mm A')}
                  </p>
                </div>
                <span className="rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 text-[14px] capitalize text-neutral-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {event.category || t('Uncategorized')}
                </span>
              </button>
            ))}
            {recentEvents.length === 0 && <p className="py-4 text-center text-[14px] text-neutral-500 dark:text-zinc-400">{t('No activity yet')}</p>}
          </div>
        </article>
      </section>

	    </div>
	  )
	}

export default Dashboard
