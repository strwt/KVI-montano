import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, ClipboardCheck, Clock, UserCheck, UserX, Users } from 'lucide-react'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled, mapEventRowToEvent } from '../lib/supabaseEvents'

const LOGIN_ACTIVITY_KEY = 'kusgan_login_activity'
const LOGIN_ACTIVITY_UPDATED_EVENT = 'kusgan-login-activity-updated'
const LOGIN_ACTIVITY_CHANNEL = 'kusgan-attendance-sync'
const LOGIN_ACTIVITY_OUTBOX_KEY = 'kusgan_login_activity_outbox'
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const getStoredLoginActivity = () => {
  const stored = localStorage.getItem(LOGIN_ACTIVITY_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveLoginActivity = (items) => {
  localStorage.setItem(LOGIN_ACTIVITY_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(LOGIN_ACTIVITY_UPDATED_EVENT))
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel(LOGIN_ACTIVITY_CHANNEL)
    channel.postMessage({ type: 'attendance-updated', at: Date.now() })
    channel.close()
  }
}

const getStoredOutbox = () => {
  const stored = localStorage.getItem(LOGIN_ACTIVITY_OUTBOX_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveOutbox = (items) => {
  localStorage.setItem(LOGIN_ACTIVITY_OUTBOX_KEY, JSON.stringify(items))
}

const getEventMatchKey = event => {
  const baseId = event?.id
  if (baseId !== undefined && baseId !== null && String(baseId).trim()) return `id:${baseId}`
  const dateValue = event?.dateTime || event?.date || ''
  const title = event?.title || ''
  const category = event?.category || ''
  return `fallback:${dateValue}|${title}|${category}`
}

function Attendance() {
  const { user, categories } = useAuth()
  const navigate = useNavigate()
  const supabaseEnabled = isSupabaseEnabled()
  const [localLoginActivity, setLocalLoginActivity] = useState(getStoredLoginActivity)
  const [supabaseLoginActivity, setSupabaseLoginActivity] = useState([])
  const [events, setEvents] = useState([])

  useEffect(() => {
    const refresh = () => setLocalLoginActivity(getStoredLoginActivity())
    const onStorage = event => {
      if (event?.key === LOGIN_ACTIVITY_KEY) refresh()
    }
    refresh()
    window.addEventListener('storage', onStorage)
    window.addEventListener(LOGIN_ACTIVITY_UPDATED_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(LOGIN_ACTIVITY_UPDATED_EVENT, refresh)
    }
  }, [supabaseEnabled])

  const titleCaseFromKey = key =>
    String(key || '')
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toUpperCase()

  const categoryLabelByKey = useMemo(() => {
    const map = {}
    const entries = Array.isArray(categories) ? categories : []
    entries.forEach(name => {
      const key = String(name || '').trim()
      if (!key) return
      map[key] = titleCaseFromKey(key)
    })
    return map
  }, [categories])

  const getCategoryLabel = key => {
    const normalized = String(key || '').trim()
    if (!normalized) return 'Notes'
    return categoryLabelByKey[normalized] || titleCaseFromKey(normalized) || 'Notes'
  }

  useEffect(() => {
    if (!supabaseEnabled || !user?.id) return
    let active = true

    const load = async () => {
      const { data } = await supabase
        .from('login_activity')
        .select('date,is_present,present_at,status,time_in,time_out')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (!active) return
      const mapped = Array.isArray(data)
        ? data.map(row => ({
            date: row.date,
            userId: user.id,
            isPresent: Boolean(row.is_present),
            status: row.status === 'Halfday' ? 'Present' : (row.status || null),
            presentAt: row.present_at || null,
            timeIn: row.time_in || null,
            timeOut: row.time_out || null,
          }))
        : []
      setSupabaseLoginActivity(mapped)
    }

    void load()

    return () => {
      active = false
    }
  }, [supabaseEnabled, user?.id])

  useEffect(() => {
    if (!supabaseEnabled || !user?.id) return undefined

    let disposed = false

    const refresh = async () => {
      try {
        const { data } = await supabase
          .from('login_activity')
          .select('date,is_present,present_at,status,time_in,time_out')
          .eq('user_id', user.id)
          .order('date', { ascending: true })
        if (disposed) return
        const mapped = Array.isArray(data)
          ? data.map(row => ({
              date: row.date,
              userId: user.id,
              isPresent: Boolean(row.is_present),
              status: row.status === 'Halfday' ? 'Present' : (row.status || null),
              presentAt: row.present_at || null,
              timeIn: row.time_in || null,
              timeOut: row.time_out || null,
            }))
          : []
        setSupabaseLoginActivity(mapped)
      } catch {
        // ignore
      }
    }

    const channel = supabase
      .channel(`attendance-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'login_activity', filter: `user_id=eq.${user.id}` },
        () => {
          void refresh()
        }
      )
      .subscribe()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [supabaseEnabled, user?.id])
  useEffect(() => {

    if (!supabaseEnabled || !user?.id) return
    let active = true

    const flushOutbox = async () => {
      if (!active) return
      const queued = getStoredOutbox()
      if (!queued.length) return
      const remaining = []

      for (const item of queued) {
        try {
          const { error } = await supabase
            .from('login_activity')
            .upsert(item, { onConflict: 'user_id,date' })
          if (error) remaining.push(item)
        } catch {
          remaining.push(item)
        }
      }

      saveOutbox(remaining)
    }

    const intervalId = window.setInterval(flushOutbox, 10_000)
    flushOutbox()

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [supabaseEnabled, user?.id])

  useEffect(() => {
    if (!supabaseEnabled || !user?.id) return
    let active = true

    const load = async () => {
      const { data } = await supabase
        .from('events')
        .select('id,title,category,date_time,status,assigned_member_ids')
        .contains('assigned_member_ids', [user.id])
        .order('date_time', { ascending: false })

      if (!active) return
      const mapped = Array.isArray(data) ? data.map(mapEventRowToEvent).filter(Boolean) : []
      setEvents(mapped)
    }

    void load()

    return () => {
      active = false
    }
  }, [supabaseEnabled, user?.id])

  const userId = String(user?.id || '')
  const effectiveSupabaseLoginActivity = useMemo(
    () => (userId ? supabaseLoginActivity : []),
    [userId, supabaseLoginActivity]
  )
  const effectiveEvents = useMemo(
    () => (userId ? events : []),
    [userId, events]
  )

  const mergedLoginActivity = useMemo(() => {
    const map = new Map()
    ;(localLoginActivity || []).forEach(entry => {
      if (!entry?.date || !entry?.userId) return
      map.set(`${entry.date}-${entry.userId}`, entry)
    })
    ;(effectiveSupabaseLoginActivity || []).forEach(entry => {
      if (!entry?.date || !entry?.userId) return
      map.set(`${entry.date}-${entry.userId}`, entry)
    })
    return Array.from(map.values())
  }, [localLoginActivity, effectiveSupabaseLoginActivity])

  const attendanceRows = useMemo(() => {
    const monthStart = dayjs().startOf('month')
    const daysInMonth = monthStart.daysInMonth()
    const activityForUser = mergedLoginActivity.filter(entry => String(entry.userId) === userId)
    const activityByDate = activityForUser.reduce((acc, entry) => {
      if (!entry?.date) return acc
      acc[entry.date] = entry
      return acc
    }, {})

    return Array.from({ length: daysInMonth }, (_, idx) => {
      const date = monthStart.add(idx, 'day')
      const dateKey = date.format('YYYY-MM-DD')
      const entry = activityByDate[dateKey]
      return {
        dateKey,
        label: date.format('MMM D, YYYY'),
        status: entry?.status === 'Halfday'
          ? 'Present'
          : (entry?.status || (entry?.isPresent ? 'Present' : 'Absent')),
        presentAt: entry?.timeIn || entry?.presentAt || null,
        timeOut: entry?.timeOut || null,
      }
    })
  }, [mergedLoginActivity, userId])

  const calendarCells = useMemo(() => {
    const monthKey = dayjs().format('YYYY-MM')
    const monthStart = dayjs(`${monthKey}-01`).startOf('month')
    const offset = monthStart.isValid() ? monthStart.day() : 0
    const blanks = Array.from({ length: offset }, (_, idx) => ({ key: `blank-${idx}`, blank: true }))
    const days = attendanceRows.map(row => ({ ...row, blank: false }))
    return [...blanks, ...days]
  }, [attendanceRows])

  const presentCount = useMemo(
    () => attendanceRows.filter(row => row.status === 'Present').length,
    [attendanceRows]
  )
  const absentCount = useMemo(
    () => attendanceRows.filter(row => row.status === 'Absent').length,
    [attendanceRows]
  )

  const assignedEvents = useMemo(() => {
    if (!userId) return []
    return effectiveEvents
      .filter(event => Array.isArray(event.assignedMemberIds))
      .filter(event => event.assignedMemberIds.map(id => String(id)).includes(userId))
      .filter(event => event.dateTime && dayjs(event.dateTime).isValid())
      .sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf())
  }, [effectiveEvents, userId])

  const todayKey = dayjs().format('YYYY-MM-DD')
  const todayEntry = useMemo(
    () => mergedLoginActivity.find(entry => entry?.date === todayKey && String(entry.userId) === userId) || null,
    [mergedLoginActivity, todayKey, userId]
  )
  const isPresentToday = Boolean(todayEntry?.isPresent)

  const updateLocalEntry = (patch) => {
    setLocalLoginActivity(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      const idx = next.findIndex(entry => entry?.date === todayKey && String(entry.userId) === userId)
      if (idx >= 0) next[idx] = { ...next[idx], ...patch }
      else next.push(patch)
      saveLoginActivity(next)
      return next
    })
  }

  const markOnline = async () => {
    if (!user?.id) return
    const nowIso = dayjs().toISOString()
    const patch = {
      date: todayKey,
      userId: user.id,
      isPresent: true,
      status: 'Present',
      presentAt: nowIso,
      timeIn: todayEntry?.timeIn || nowIso,
      timeOut: todayEntry?.timeOut || null,
    }

    updateLocalEntry(patch)

    if (!supabaseEnabled) return

    const dbPayload = {
      user_id: user.id,
      date: todayKey,
      is_present: true,
      present_at: patch.timeIn,
      status: 'Present',
      time_in: patch.timeIn,
      time_out: todayEntry?.timeOut || null,
      time_out_reason: null,
    }

    const { error } = await supabase
      .from('login_activity')
      .upsert(dbPayload, { onConflict: 'user_id,date' })

    if (error) {
      console.warn('Unable to mark online.', error)
      const queued = getStoredOutbox()
      saveOutbox([...queued, dbPayload])
    }
  }

  const markOffline = async () => {
    if (!user?.id) return
    const nowIso = dayjs().toISOString()
    const baseTimeIn = todayEntry?.timeIn || todayEntry?.presentAt || nowIso
    const patch = {
      date: todayKey,
      userId: user.id,
      isPresent: false,
      status: 'Present',
      presentAt: baseTimeIn,
      timeIn: baseTimeIn,
      timeOut: nowIso,
    }

    updateLocalEntry(patch)

    if (!supabaseEnabled) return

    const dbPayload = {
      user_id: user.id,
      date: todayKey,
      is_present: false,
      present_at: baseTimeIn,
      status: 'Present',
      time_in: baseTimeIn,
      time_out: nowIso,
      time_out_reason: null,
    }

    const { error } = await supabase
      .from('login_activity')
      .upsert(dbPayload, { onConflict: 'user_id,date' })

    if (error) {
      console.warn('Unable to mark offline.', error)
      const queued = getStoredOutbox()
      saveOutbox([...queued, dbPayload])
    }
  }

  return (
    <div className="relative isolate animate-fade-in space-y-6 text-white">
      <div className="fixed inset-0 -z-10 bg-[#4169E1]" />
      <section className="rounded-2xl border border-white/10 bg-[#4169E1]/80 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[14px] uppercase tracking-[0.12em] text-white/70">Attendance</p>
            <h1 className="text-[28px] font-semibold text-white">
              {user?.name || 'Member'} Attendance Summary
            </h1>
            <p className="text-[14px] text-white/70">
              {dayjs().format('MMMM YYYY')}
            </p>
          </div>
          {!isPresentToday ? (
            <button
              type="button"
              onClick={markOnline} 
              disabled={!userId}
              className="inline-flex items-center gap-2 rounded-xl border border-yellow-300/30 bg-yellow-400 px-5 py-2 text-[14px] font-semibold text-slate-900 transition-all duration-200 hover:scale-[1.02] hover:bg-yellow-300"
            >
              <CalendarCheck size={16} />
              Time In
            </button>
          ) : (
            <button
              type="button"
              onClick={markOffline}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-white/15"
            >
              Time Out
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#4169E1]/70 p-4 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-emerald-200">
            <UserCheck size={18} />
            <p className="text-sm font-semibold">Present Days</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">{presentCount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#4169E1]/70 p-4 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-white/70">
            <UserX size={18} />
            <p className="text-sm font-semibold">Absent Days</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">{absentCount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#4169E1]/70 p-4 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-yellow-200">
            <Users size={18} />
            <p className="text-sm font-semibold">Assigned Activities</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">{assignedEvents.length}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <article className="rounded-2xl border border-white/10 bg-[#4169E1]/70 p-5 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-yellow-300" />
            <h2 className="text-[20px] font-semibold text-white">Monthly Attendance</h2>
          </div>
          <div className="rounded-2xl bg-[#ffffff] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-4">
            <div className="overflow-x-auto">
              <div className="min-w-[560px] sm:min-w-[720px] md:min-w-[840px] lg:min-w-[980px]">
                <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-600 sm:gap-2.5 sm:text-xs lg:gap-3 lg:text-sm">
                  {WEEKDAY_LABELS.map(label => (
                    <div key={label}>{label}</div>
                  ))}
                </div>
                <div className="mt-2 sm:mt-3 grid grid-cols-7 gap-2 sm:gap-2.5 lg:gap-3">
                  {calendarCells.map((cell, index) => {
                if (cell.blank) {
                  return <div key={cell.key || `blank-${index}`} className="h-[84px] sm:h-[100px] lg:h-[120px] rounded-xl" />
                }

                const isToday = cell.dateKey === dayjs().format('YYYY-MM-DD')
                const dayNumber = dayjs(cell.dateKey).date()
                const timeInLabel = cell.presentAt && dayjs(cell.presentAt).isValid()
                  ? dayjs(cell.presentAt).format('h:mm A')
                  : null
                const timeOutLabel = cell.timeOut && dayjs(cell.timeOut).isValid()
                  ? dayjs(cell.timeOut).format('h:mm A')
                  : null

                const tone = cell.status === 'Present'
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : 'border-slate-200 bg-slate-50/70'

                const badgeTone = cell.status === 'Present'
                  ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                  : 'border-slate-200 bg-slate-100 text-slate-700'

                const titleParts = [`${cell.label}: ${cell.status}`]
                if (timeInLabel) titleParts.push(`In: ${timeInLabel}`)
                if (timeOutLabel) titleParts.push(`Out: ${timeOutLabel}`)

                return (
                  <div
                    key={cell.dateKey || `day-${index}`}
                    className={`flex h-[84px] sm:h-[100px] lg:h-[120px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-2 sm:p-2.5 lg:p-3 ${tone} ${
                      isToday ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-white' : ''
                    }`}
                    title={titleParts.join(' | ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 sm:text-sm">{dayNumber}</span>
                      <span className={`inline-flex max-w-[64px] sm:max-w-[80px] lg:max-w-[92px] truncate rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${badgeTone}`}>
                        {cell.status}
                      </span>
                    </div>
                    {(timeInLabel || timeOutLabel) ? (
                      <div className="min-w-0 space-y-0.5 text-[10px] text-slate-600 sm:space-y-1 sm:text-xs">
                        {timeInLabel && (
                          <div className="flex min-w-0 items-center gap-1">
                            <Clock size={12} className="shrink-0" />
                            <span className="truncate">In {timeInLabel}</span>
                          </div>
                        )}
                        {timeOutLabel && (
                          <div className="flex min-w-0 items-center gap-1">
                            <Clock size={12} className="shrink-0" />
                            <span className="truncate">Out {timeOutLabel}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 sm:text-xs">No record</span>
                    )}
                  </div>
                )
                  })}
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#4169E1]/70 p-5 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="mb-4 flex items-center gap-2">
            <Users size={18} className="text-yellow-300" />
            <h2 className="text-[20px] font-semibold text-white">Assigned Activities</h2>
          </div>
          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {assignedEvents.map((event, index) => (
              <button
                type="button"
                key={`${event.id || 'event'}-${index}`}
                onClick={() =>
                  navigate('/calendar', {
                    state: {
                      focusEventId: event.id,
                      focusEventKey: getEventMatchKey(event),
                      forceFocusEvent: true,
                      scrollToEvent: true,
                    },
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-[#ffffff] p-3 text-left transition-colors hover:bg-slate-50"
              >
                <p className="text-sm font-semibold text-slate-900">{event.title || 'Untitled Event'}</p>
                <p className="mt-1 text-xs text-slate-500">{dayjs(event.dateTime).format('MMM D, YYYY h:mm A')}</p>
                <p className="mt-1 text-xs text-slate-500">Category: {getCategoryLabel(event.category || 'notes')}</p>
                <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  event.status === 'done'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-yellow-300 bg-yellow-50 text-yellow-800'
                }`}>
                  {event.status === 'done' ? 'Done' : 'On-going'}
                </span>
              </button>
            ))}
            {assignedEvents.length === 0 && (
              <p className="text-sm text-white/70">No assigned activities yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}

export default Attendance
