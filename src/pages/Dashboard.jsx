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
  Bell,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useI18n } from '../i18n/useI18n'
import { supabase } from '../lib/supabaseClient'
import { fetchSupabaseEvents, isSupabaseEnabled } from '../lib/supabaseEvents'
import { fetchMyNotifications } from '../lib/supabaseNotifications'

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
const LOGIN_ACTIVITY_UPDATED_EVENT = 'kusgan-login-activity-updated'

const getEventMatchKey = event => {
  const baseId = event?.id
  if (baseId !== undefined && baseId !== null && String(baseId).trim()) return `id:${baseId}`
  const dateValue = resolveEventDate(event) || ''
  const title = event?.title || ''
  const category = event?.category || ''
  return `fallback:${dateValue}|${title}|${category}`
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
  const supabaseEnabled = isSupabaseEnabled()
  const [animatedStats, setAnimatedStats] = useState(false)
  const [events, setEvents] = useState([])
  const [recentLogins, setRecentLogins] = useState([])
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStats(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setEvents([])
      return
    }

    let active = true

    const load = async () => {
      const { data } = await fetchSupabaseEvents()
      if (!active) return
      setEvents(data)
    }

    load()

    const channel = supabase
      .channel('kusgan-events-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => load())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabaseEnabled, user?.id])

  useEffect(() => {
    if (!user?.id || !isAdmin) {
      setRecentLogins([])
      return
    }

    let active = true

      const load = async () => {
      const { data } = await supabase
        .from('login_activity')
        .select('date,last_login_at,is_online,last_status_at,user_id,profiles(name,email,role,profile_image)')
        .order('last_login_at', { ascending: false })
        .limit(LOGIN_ACTIVITY_LIMIT)

      if (!active) return
      const mapped = Array.isArray(data)
        ? data.map(row => ({
            date: row.date,
            userId: row.user_id,
            name: row.profiles?.name || '',
            email: row.profiles?.email || '',
            role: row.profiles?.role || 'member',
            profileImage: row.profiles?.profile_image || '',
            lastLoginAt: row.last_login_at,
            isOnline: Boolean(row.is_online),
            lastStatusAt: row.last_status_at || null,
          }))
        : []
      setRecentLogins(mapped)
    }

    load()

    const channel = supabase
      .channel('kusgan-login-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'login_activity' }, () => load())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabaseEnabled, user?.id, isAdmin])

  useEffect(() => {
    if (!notificationsOpen) return
    const handleClickOutside = event => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-notification-panel]') || target.closest('[data-notification-button]')) return
      setNotificationsOpen(false)
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [notificationsOpen])

  useEffect(() => {
    if (!supabaseEnabled) return
    if (!user?.id) {
      setNotifications([])
      return
    }

    let active = true

    const load = async () => {
      const { data } = await fetchMyNotifications(80)
      if (!active) return
      const mapped = data.map(row => ({
        id: row.id,
        type: row.type,
        userId: row.user_id,
        eventId: row.event_id,
        title: row.title,
        category: row.category,
        dateTime: row.date_time,
        details: row.details || '',
        assignedBy: row.assigned_by || 'Admin',
        createdAt: row.created_at,
        readAt: row.read_at,
      }))
      setNotifications(mapped)
    }

    load()

    const channel = supabase
      .channel('kusgan-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabaseEnabled, user?.id])

  const recentEvents = useMemo(() => {
    return [...events]
      .filter(event => resolveEventDate(event) && dayjs(resolveEventDate(event)).isValid())
      .sort((a, b) => dayjs(resolveEventDate(b)).valueOf() - dayjs(resolveEventDate(a)).valueOf())
      .slice(0, RECENT_ACTIVITY_LIMIT)
  }, [events])

  const userNotifications = useMemo(() => {
    const userId = String(user?.id || '')
    if (!userId) return []
    return [...notifications]
      .filter(notification => String(notification.userId) === userId)
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
  }, [notifications, user?.id])

  const unreadCount = useMemo(
    () => userNotifications.filter(notification => !notification.readAt).length,
    [userNotifications]
  )

  const visibleNotifications = useMemo(
    () => userNotifications.slice(0, 6),
    [userNotifications]
  )

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
    const keySet = new Set(keysFromCommittees)
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
      label: labelByKey[key] || OPERATION_META[key]?.label || titleCaseFromKey(key) || 'Uncategorized',
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

  const markNotificationRead = async (notificationId) => {
    if (!notificationId) return
    const updated = notifications.map(item =>
      item.id === notificationId && !item.readAt
        ? { ...item, readAt: dayjs().toISOString() }
        : item
    )
    setNotifications(updated)
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId)
  }

  const handleOpenNotification = notification => {
    if (!notification) return
    markNotificationRead(notification.id)
    navigate('/calendar', {
      state: {
        focusEventId: notification.eventId,
        forceFocusEvent: true,
        scrollToEvent: true,
      },
    })
  }

  const dismissNotification = async (notificationId) => {
    if (!notificationId) return
    const updated = notifications.filter(item => item.id !== notificationId)
    setNotifications(updated)
    await supabase.from('notifications').delete().eq('id', notificationId)
  }

  return (
    <div className="animate-fade-in space-y-6">
      <section className="relative rounded-2xl border border-red-600 bg-gradient-to-br from-white to-neutral-100 p-6 text-neutral-900 shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-colors dark:from-black dark:to-neutral-900 dark:text-zinc-100 dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
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
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(prev => !prev)
                  }}
                  data-notification-button
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-600 bg-white text-red-600 transition-all duration-200 hover:scale-[1.02] hover:bg-red-50 dark:border-red-600 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30"
                  aria-label={t('Notifications')}
                  title={t('Notifications')}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600 ring-2 ring-white dark:ring-zinc-900" />
                  )}
                </button>
                {notificationsOpen && (
                  <div
                    data-notification-panel
                    className="absolute right-0 top-12 z-20 w-[320px] rounded-2xl border border-red-600 bg-white shadow-[0_16px_30px_rgba(0,0,0,0.12)] dark:border-red-600 dark:bg-zinc-950"
                  >
                    <div className="flex items-center justify-between border-b border-red-100 px-4 py-3 dark:border-red-900/40">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-zinc-100">
                        {t('Notifications')}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-red-600 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                          {unreadCount} {t('unread')}
                        </span>
                        {unreadCount === 0 && (
                          <button
                            type="button"
                            onClick={() => setNotificationsOpen(false)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            aria-label={t('Close notifications')}
                            title={t('Close notifications')}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-visible">
                      {visibleNotifications.map((notification, index) => {
                        const hasValidDate = notification.dateTime && dayjs(notification.dateTime).isValid()
                        return (
                          <button
                            type="button"
                            key={`${notification.id || 'note'}-${index}`}
                            onClick={() => {
                              handleOpenNotification(notification)
                              setNotificationsOpen(false)
                            }}
                            className={`flex w-full items-start gap-3 border-b border-red-100 px-4 py-3 text-left transition-colors hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/40 ${
                              notification.readAt ? '' : 'bg-red-50/50 dark:bg-red-950/30'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-neutral-900 dark:text-zinc-100">
                                {notification.title || t('Untitled Event')}
                              </p>
                              <p className="mt-1 text-[12px] text-neutral-500 dark:text-zinc-400">
                                {hasValidDate ? dayjs(notification.dateTime).format('MMM D, YYYY h:mm A') : t('Date TBA')}
                              </p>
                              {notification.details && (
                                <p className="mt-1 line-clamp-2 text-[12px] text-neutral-600 dark:text-zinc-300">
                                  {notification.details}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!notification.readAt && (
                                <span className="mt-1 h-2 w-2 rounded-full bg-red-600" />
                              )}
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation()
                                  dismissNotification(notification.id)
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                aria-label={t('Remove notification')}
                                title={t('Remove notification')}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </button>
                        )
                      })}
                      {visibleNotifications.length === 0 && (
                        <p className="px-4 py-6 text-center text-[13px] text-neutral-500 dark:text-zinc-400">
                          {t('No notifications yet.')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
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
                  const isOnline = entry.isOnline === true
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
