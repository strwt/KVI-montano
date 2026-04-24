import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Droplets,
  Leaf,
  Flame,
  FileText,
  HeartPulse,
  HandHeart,
  Sparkles,
  Tags,
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
import { fetchSupabaseEvents, invalidateSupabaseEventsCache, isSupabaseEnabled } from '../lib/supabaseEvents'
import { fetchMyNotifications } from '../lib/supabaseNotifications'
import { useConfirm } from '../context/ConfirmContext'

const normalizeCategoryKey = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

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
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()

const CATEGORY_COLOR_SEEDS = {
  tuli: '#eab308', // yellow
  blood_letting: '#f59e0b', // amber
  donations: '#f59e0b', // amber
  environmental: '#22c55e', // green
  relief_operation: '#3b82f6', // blue
  fire_response: '#f97316', // orange
  water_distribution: '#06b6d4', // cyan
  notes: '#6366f1', // indigo
  medical: '#ec4899', // pink
  uncategorized: '#94a3b8', // slate
}

const hashInt = (key) => {
  const input = String(key || '')
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const hexToRgb = (hex) => {
  const raw = String(hex || '').trim().replace(/^#/, '')
  const normalized = raw.length === 3 ? raw.split('').map(ch => `${ch}${ch}`).join('') : raw
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

const rgbToHue = (rgb) => {
  if (!rgb) return null
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  if (delta === 0) return 0

  let hue = 0
  if (max === r) hue = ((g - b) / delta) % 6
  else if (max === g) hue = (b - r) / delta + 2
  else hue = (r - g) / delta + 4

  hue *= 60
  if (hue < 0) hue += 360
  return hue
}

const hueDistance = (a, b) => {
  const diff = Math.abs(a - b) % 360
  return Math.min(diff, 360 - diff)
}

const getHueFromColor = (color) => {
  const raw = String(color || '').trim()
  const hslMatch = raw.match(/hsl\(\s*([0-9.]+)/i)
  if (hslMatch) {
    const hue = Number(hslMatch[1])
    if (Number.isFinite(hue)) return ((hue % 360) + 360) % 360
  }

  const rgb = hexToRgb(raw)
  const hue = rgbToHue(rgb)
  return Number.isFinite(hue) ? hue : null
}

const buildCategoryColorMap = (keys = []) => {
  const inputKeys = Array.isArray(keys) ? keys : []
  const normalizedKeys = inputKeys
    .map(key => canonicalizeOperationKey(normalizeCategoryKey(key)))
    .filter(Boolean)
  const uniqueKeys = [...new Set(normalizedKeys)].sort((a, b) => a.localeCompare(b))

  const map = {}
  const usedHues = []
  const usedColors = new Set()

  const rememberHue = (color) => {
    const hue = getHueFromColor(color)
    if (Number.isFinite(hue)) usedHues.push(hue)
  }

  uniqueKeys.forEach((key) => {
    const seeded = CATEGORY_COLOR_SEEDS[key]
    if (!seeded) return
    map[key] = seeded
    usedColors.add(seeded)
    rememberHue(seeded)
  })

  uniqueKeys.forEach((key) => {
    if (map[key]) return

    const hash = hashInt(key)
    let hue = hash % 360
    const saturation = 78 + (hash % 10) // 78..87
    const lightness = 44 + ((hash >>> 8) % 10) // 44..53

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const minDistance = usedHues.length ? Math.min(...usedHues.map(existing => hueDistance(existing, hue))) : 999
      if (minDistance >= 18) break
      hue = (hue + 137.508) % 360
    }

    const color = `hsl(${hue.toFixed(0)}, ${saturation}%, ${lightness}%)`
    map[key] = color
    usedColors.add(color)
    usedHues.push(hue)
  })

  return map
}

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

const ICON_BY_KEY = {
  tags: Tags,
  sparkles: Sparkles,
  activity: Activity,
  heart_pulse: HeartPulse,
  leaf: Leaf,
  flame: Flame,
  droplets: Droplets,
  file_text: FileText,
  hand_heart: HandHeart,
}

const resolveIconKey = (value) => {
  const raw = String(value || '').trim()
  if (raw && ICON_BY_KEY[raw]) return raw
  return ''
}

const normalizeHexColor = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const normalized = raw.startsWith('#') ? raw : `#${raw}`
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) return ''
  return normalized.toLowerCase()
}

const getEventMatchKey = event => {
  const baseId = event?.id
  if (baseId !== undefined && baseId !== null && String(baseId).trim()) return `id:${baseId}`
  const dateValue = resolveEventDate(event) || ''
  const title = event?.title || ''
  const category = event?.category || ''
  return `fallback:${dateValue}|${title}|${category}`
}

function Dashboard() {
  const { user, categories } = useAuth()
  const { t } = useI18n()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const userCommitteeRole = user?.committeeRole || user?.committee_role || 'Member'
  const userType = userCommitteeRole === 'OIC' ? 'oic' : (isAdmin ? 'admin' : 'member')
  const supabaseEnabled = isSupabaseEnabled()
  const [animatedStats, setAnimatedStats] = useState(false)
  const [events, setEvents] = useState([])
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [categoryMetaByKey, setCategoryMetaByKey] = useState({})

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
      setEvents([])
      invalidateSupabaseEventsCache()
      const { data } = await fetchSupabaseEvents({ force: true })
      if (!active) return
      setEvents(data)
    }

    void load()

    return () => {
      active = false
    }
  }, [categories, supabaseEnabled, user?.id])

  useEffect(() => {
    if (!supabaseEnabled) {
      setCategoryMetaByKey({})
      return
    }

    let active = true
    const loadCategoryMeta = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('name,icon_key,color')
          .order('name', { ascending: true })
        if (!active) return
        if (error) throw error

        const next = {}
        ;(Array.isArray(data) ? data : []).forEach(row => {
          const key = canonicalizeOperationKey(normalizeCategoryKey(row?.name))
          if (!key) return
          const iconKey = resolveIconKey(row?.icon_key)
          const color = normalizeHexColor(row?.color)
          next[key] = { iconKey, color }
        })
        setCategoryMetaByKey(next)
      } catch {
        if (active) setCategoryMetaByKey({})
      }
    }

    void loadCategoryMeta()
    return () => {
      active = false
    }
  }, [supabaseEnabled])

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

    const mapRow = (row) => ({
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
    })

    const loadInitial = async () => {
      const { data } = await fetchMyNotifications(user.id, 80)
      if (!active) return
      setNotifications(data.map(mapRow))
    }

    void loadInitial()

    const channel = supabase
      .channel('kusgan-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (!active) return
          const eventType = payload?.eventType
          if (eventType === 'INSERT' && payload?.new?.id) {
            const row = mapRow(payload.new)
            setNotifications(prev => {
              const list = Array.isArray(prev) ? prev : []
              if (list.some(item => item.id === row.id)) return list
              return [row, ...list].slice(0, 80)
            })
            return
          }
          if (eventType === 'UPDATE' && payload?.new?.id) {
            const row = mapRow(payload.new)
            setNotifications(prev => {
              const list = Array.isArray(prev) ? prev : []
              const idx = list.findIndex(item => item.id === row.id)
              if (idx === -1) return [row, ...list].slice(0, 80)
              const next = [...list]
              next[idx] = { ...next[idx], ...row }
              return next
            })
            return
          }
          if (eventType === 'DELETE' && payload?.old?.id) {
            const deletedId = payload.old.id
            setNotifications(prev => (Array.isArray(prev) ? prev : []).filter(item => item.id !== deletedId))
          }
        }
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

  const categoryLabelByKey = useMemo(() => {
    const map = {}
    const entries = Array.isArray(categories) ? categories : []
    entries.forEach(name => {
      const key = canonicalizeOperationKey(normalizeCategoryKey(name))
      if (!key) return
      map[key] = titleCaseFromKey(key)
    })
    return map
  }, [categories])

  const getCategoryLabel = (value) => {
    const key = canonicalizeOperationKey(normalizeCategoryKey(value))
    if (!key) return t('Uncategorized')
    return categoryLabelByKey[key] || OPERATION_META[key]?.label || titleCaseFromKey(key) || t('Uncategorized')
  }

  const operations = useMemo(() => {
    const keySet = new Set(Object.keys(categoryLabelByKey))
    events.forEach(event => {
      const key = canonicalizeOperationKey(normalizeCategoryKey(event.category))
      if (!key) return
      keySet.add(key)
    })

    const keys = Array.from(keySet)
    const unknownKeys = keys
      .filter(key => !DEFAULT_OPERATION_ORDER.includes(key))
      .sort((a, b) =>
        (categoryLabelByKey[a] || titleCaseFromKey(a)).localeCompare(categoryLabelByKey[b] || titleCaseFromKey(b))
      )
    const orderedKeys = [
      ...DEFAULT_OPERATION_ORDER.filter(key => keySet.has(key)),
      ...unknownKeys,
    ]

    return orderedKeys.map(key => ({
      key,
      label: categoryLabelByKey[key] || OPERATION_META[key]?.label || titleCaseFromKey(key) || 'Uncategorized',
      icon: ICON_BY_KEY[categoryMetaByKey?.[key]?.iconKey] || OPERATION_META[key]?.icon || FileText,
    }))
  }, [categoryLabelByKey, categoryMetaByKey, events])

  const categoryColorByKey = useMemo(
    () => {
      const base = buildCategoryColorMap(operations.map(category => category.key))
      Object.entries(categoryMetaByKey || {}).forEach(([key, meta]) => {
        const forced = normalizeHexColor(meta?.color)
        if (forced) base[key] = forced
      })
      return base
    },
    [categoryMetaByKey, operations]
  )

  const categoryCounts = useMemo(() => {
    const counts = {}
    events.forEach(event => {
      const key = canonicalizeOperationKey(normalizeCategoryKey(event.category))
      if (!key) return
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
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
    const ok = await confirm({
      title: t('Remove notification'),
      description: 'Remove this notification? You can still view the event in Calendar.',
      confirmText: t('Remove'),
      cancelText: t('Cancel'),
      danger: true,
    })
    if (!ok) return
    const updated = notifications.filter(item => item.id !== notificationId)
    setNotifications(updated)
    await supabase.from('notifications').delete().eq('id', notificationId)
  }

  return (
    <div className="animate-fade-in space-y-6 text-white">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-yellow-400/15 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-[32px] font-semibold leading-tight">
              {t('Welcome back,')} <span className="text-yellow-300">{user?.name || t('Volunteer')}</span>
            </h1>
            <p className="text-[14px] text-white/70">KUSGAN Volunteer Inc. - Cares Department</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-[14px] text-yellow-200">
                {userType === 'admin' ? t('Administrator') : (userType === 'oic' ? 'OIC' : t('Member'))}
              </span>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            {!isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(prev => !prev)
                  }}
                  data-notification-button
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-yellow-300 transition-all duration-200 hover:scale-[1.02] hover:bg-white/10 backdrop-blur-md"
                  aria-label={t('Notifications')}
                  title={t('Notifications')}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-yellow-400 ring-2 ring-blue-900" />
                  )}
                </button>
                {notificationsOpen && (
                  <div
                    data-notification-panel
                    className="absolute right-0 top-12 z-20 w-[320px] rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_16px_30px_rgba(15,23,42,0.18)]"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {t('Notifications')}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-yellow-400/40 bg-yellow-400/15 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
                          {unreadCount} {t('unread')}
                        </span>
                        {unreadCount === 0 && (
                          <button
                            type="button"
                            onClick={() => setNotificationsOpen(false)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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
                          <div
                            key={`${notification.id || 'note'}-${index}`}
                            onClick={() => {
                              handleOpenNotification(notification)
                              setNotificationsOpen(false)
                            }}
                            onKeyDown={event => {
                              if (event.target !== event.currentTarget) return
                              if (event.key !== 'Enter' && event.key !== ' ') return
                              event.preventDefault()
                              handleOpenNotification(notification)
                              setNotificationsOpen(false)
                            }}
                            role="button"
                            tabIndex={0}
                            className={`flex w-full items-start gap-3 border-b border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                              notification.readAt ? '' : 'bg-yellow-50/60'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-slate-900">
                                {notification.title || t('Untitled Event')}
                              </p>
                              <p className="mt-1 text-[12px] text-slate-600">
                                {hasValidDate ? dayjs(notification.dateTime).format('MMM D, YYYY h:mm A') : t('Date TBA')}
                              </p>
                              {notification.details && (
                                <p className="mt-1 line-clamp-2 text-[12px] text-slate-700">
                                  {notification.details}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!notification.readAt && (
                                <span className="mt-1 h-2 w-2 rounded-full bg-yellow-400" />
                              )}
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation()
                                  dismissNotification(notification.id)
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label={t('Remove notification')}
                                title={t('Remove notification')}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      {visibleNotifications.length === 0 && (
                        <p className="px-4 py-6 text-center text-[13px] text-white/70">
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
                className="inline-flex cursor-pointer items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-yellow-400 text-[14px] font-semibold text-slate-900 hover:-translate-y-0.5 transition-all duration-200 hover:bg-yellow-300"
                style={{ boxShadow: '0 8px 24px rgba(250,204,21,0.35)' }}
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
          <h2 className="mb-3 text-[24px] font-semibold text-white">{t('Events by Category')}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {operations.map((category, index) => {
              const color = categoryColorByKey[category.key] || CATEGORY_COLOR_SEEDS.uncategorized
              return (
                  <button
                   key={category.key}
                  type="button"
                  onClick={() => navigate(getEventsCategoryRoute(category.key))}
                  className={`group relative h-full cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-yellow-50/60 hover:shadow-[0_16px_28px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/45 active:scale-[0.99] ${
                    animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{
                    animationDelay: `${index * 0.06}s`,
                    background: '#ffffff',
                    borderColor: color,
                    color: '#0f172a',
                    boxShadow: '0 14px 28px rgba(15,23,42,0.12)',
                  }}
                >
                  <div className="relative">
                    <div
                      className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-transparent"
                    >
                      <category.icon
                        size={18}
                        style={{ color }}
                      />
                    </div>
                    <p className="text-[14px] text-slate-600">{t(category.label)}</p>
                    <p className="text-[18px] font-semibold text-slate-900">{categoryCounts[category.key] || 0}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>
      <section className="grid grid-cols-12 gap-4">
        <article className="col-span-12 rounded-2xl border border-slate-200 bg-[#ffffff] p-5 text-slate-900 shadow-[0_14px_28px_rgba(15,23,42,0.12)] md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[24px] font-semibold text-[#041221]">{t('Recent Activity')}</h2>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="cursor-pointer rounded-lg border border-slate-200 bg-[#ffffff] px-4 py-2 text-[14px] font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:bg-[#ffffff] hover:border-slate-300 hover:shadow-sm"
              >
                {t('View All')}
              </button>
            )}
          </div>
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {recentEvents.map((event, index) => {
              const eventCategoryKey = canonicalizeOperationKey(normalizeCategoryKey(event.category)) || 'uncategorized'
              const color =
                categoryColorByKey[eventCategoryKey] ||
                CATEGORY_COLOR_SEEDS[eventCategoryKey] ||
                CATEGORY_COLOR_SEEDS.uncategorized
              return (
                <button
                  type="button"
                  key={`${event.id || 'event'}-${resolveEventDate(event) || 'no-date'}-${index}`}
                  onClick={() => handleOpenEventInCalendar(event)}
                  className={`group flex w-full cursor-pointer items-start gap-4 rounded-xl border border-slate-200 bg-[#ffffff] p-3 text-left text-slate-900 transition-all duration-200 hover:scale-[1.02] hover:bg-[#ffffff] hover:border-slate-300 hover:shadow-[0_14px_24px_rgba(15,23,42,0.14)] md:p-4 ${
                    animatedStats ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className="relative flex flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-slate-900">
                      <CalendarIcon size={14} />
                    </span>
                    {index !== recentEvents.length - 1 && <span className="mt-2 h-12 w-px bg-slate-200" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[18px] font-medium text-slate-900">
                      {event.title || t('Untitled Event')}
                    </p>
                    <p className="mt-1 text-[14px] text-slate-500">
                      {dayjs(resolveEventDate(event)).format('MMM D, YYYY h:mm A')}
                    </p>
                  </div>
                  <span
                    className="rounded-md border px-2 py-1 text-[14px] capitalize"
                    style={{ borderColor: color, color }}
                  >
                    {getCategoryLabel(event.category)}
                  </span>
                </button>
              )
            })}
            {recentEvents.length === 0 && <p className="py-4 text-center text-[14px] text-slate-500">{t('No activity yet')}</p>}
          </div>
        </article>
      </section>

    </div>
  )
}

export default Dashboard
