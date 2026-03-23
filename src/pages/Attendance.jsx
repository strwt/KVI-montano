import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, ClipboardList, Clock, Users } from 'lucide-react'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled, mapEventRowToEvent } from '../lib/supabaseEvents'

const LOGIN_ACTIVITY_KEY = 'kusgan_login_activity'
const LOGIN_ACTIVITY_UPDATED_EVENT = 'kusgan-login-activity-updated'
const LOGIN_ACTIVITY_CHANNEL = 'kusgan-attendance-sync'
const LOGIN_ACTIVITY_OUTBOX_KEY = 'kusgan_login_activity_outbox'

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

function Attendance() {
  const { user, eventCategories } = useAuth()
  const supabaseEnabled = isSupabaseEnabled()
  const [localLoginActivity, setLocalLoginActivity] = useState(getStoredLoginActivity)
  const [supabaseLoginActivity, setSupabaseLoginActivity] = useState([])
  const [events, setEvents] = useState([])
  const [offlineMenuOpen, setOfflineMenuOpen] = useState(false)

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
      .replace(/_/g, ' ')
      .replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1))

  const categoryLabelByKey = useMemo(() => {
    const map = {}
    const entries = Array.isArray(eventCategories) ? eventCategories : []
    entries.forEach(name => {
      const key = String(name || '').trim()
      if (!key) return
      map[key] = titleCaseFromKey(key)
    })
    return map
  }, [eventCategories])

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
        .select('date,is_present,present_at,status,time_in,time_out,time_out_reason')
        .eq('user_id', user.id)
        .eq('is_present', true)
        .order('date', { ascending: true })

      if (!active) return
      const mapped = Array.isArray(data)
        ? data.map(row => ({
            date: row.date,
            userId: user.id,
          isPresent: Boolean(row.is_present),
          status: row.status || null,
          presentAt: row.present_at || null,
          timeIn: row.time_in || null,
          timeOut: row.time_out || null,
          timeOutReason: row.time_out_reason || '',
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
    ;(effectiveSupabaseLoginActivity || []).forEach(entry => {
      if (!entry?.date || !entry?.userId) return
      map.set(`${entry.date}-${entry.userId}`, entry)
    })
    ;(localLoginActivity || []).forEach(entry => {
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
        status: entry?.status || (entry?.isPresent ? 'Present' : 'Absent'),
        presentAt: entry?.timeIn || entry?.presentAt || null,
        timeOut: entry?.timeOut || null,
        timeOutReason: entry?.timeOutReason || '',
      }
    })
  }, [mergedLoginActivity, userId])

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
    const wasLunch = todayEntry?.timeOutReason === 'Lunch'
    const patch = {
      date: todayKey,
      userId: user.id,
      isPresent: true,
      status: 'Present',
      presentAt: nowIso,
      timeIn: todayEntry?.timeIn || nowIso,
      timeOut: wasLunch ? null : (todayEntry?.timeOut || null),
      timeOutReason: wasLunch ? '' : (todayEntry?.timeOutReason || ''),
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
      time_out: wasLunch ? null : (todayEntry?.timeOut || null),
      time_out_reason: wasLunch ? null : (todayEntry?.timeOutReason || null),
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

  const markOffline = async (reason) => {
    if (!user?.id) return
    const nowIso = dayjs().toISOString()
    const nextStatus = reason === 'Halfday' ? 'Halfday' : 'Present'
    const baseTimeIn = todayEntry?.timeIn || todayEntry?.presentAt || nowIso
    const patch = {
      date: todayKey,
      userId: user.id,
      isPresent: false,
      status: nextStatus,
      presentAt: baseTimeIn,
      timeIn: baseTimeIn,
      timeOut: nowIso,
      timeOutReason: reason,
    }

    updateLocalEntry(patch)

    if (!supabaseEnabled) return

    const dbPayload = {
      user_id: user.id,
      date: todayKey,
      is_present: false,
      present_at: baseTimeIn,
      status: nextStatus,
      time_in: baseTimeIn,
      time_out: nowIso,
      time_out_reason: reason,
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
    <div className="animate-fade-in space-y-6">
      <section className="rounded-2xl border border-red-600 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-300">Attendance</p>
            <h1 className="text-[28px] font-semibold text-neutral-900 dark:text-zinc-100">
              {user?.name || 'Member'} Attendance Summary
            </h1>
            <p className="text-[14px] text-neutral-500 dark:text-neutral-300">
              {dayjs().format('MMMM YYYY')}
            </p>
          </div>
          {!isPresentToday ? (
            <button
              type="button"
              onClick={markOnline}
              disabled={!userId}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-5 py-2 text-[14px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-700"
            >
              <CalendarCheck size={16} />
              I'm Online
            </button>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOfflineMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-500 bg-slate-700 px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-slate-800"
              >
                I'm Offline
              </button>
              {offlineMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setOfflineMenuOpen(false)
                      markOffline('End of Work')
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    End of Work
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOfflineMenuOpen(false)
                      markOffline('Lunch')
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-amber-600 hover:bg-amber-50"
                  >
                    Lunch
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOfflineMenuOpen(false)
                      markOffline('Halfday')
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-purple-700 hover:bg-purple-50"
                  >
                    Halfday
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-red-600 bg-white p-4 shadow-sm dark:border-red-600 dark:bg-zinc-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Present Days</p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-zinc-100">{presentCount}</p>
        </div>
        <div className="rounded-2xl border border-red-600 bg-white p-4 shadow-sm dark:border-red-600 dark:bg-zinc-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Absent Days</p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-zinc-100">{absentCount}</p>
        </div>
        <div className="rounded-2xl border border-red-600 bg-white p-4 shadow-sm dark:border-red-600 dark:bg-zinc-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Assigned Activities</p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-zinc-100">{assignedEvents.length}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-red-600 bg-white p-5 shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-red-600" />
            <h2 className="text-[20px] font-semibold text-neutral-900 dark:text-zinc-100">Monthly Attendance</h2>
          </div>
          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {attendanceRows.map(row => (
              <div
                key={row.dateKey}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                  row.status === 'Present'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                <span>{row.label}</span>
                <div className="flex items-center gap-2">
                  {row.presentAt && (
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <Clock size={12} />
                      {dayjs(row.presentAt).format('h:mm A')}
                    </span>
                  )}
                  <span className="text-xs font-semibold">{row.status}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-red-600 bg-white p-5 shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <Users size={18} className="text-red-600" />
            <h2 className="text-[20px] font-semibold text-neutral-900 dark:text-zinc-100">Assigned Activities</h2>
          </div>
          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {assignedEvents.map((event, index) => (
              <div key={`${event.id || 'event'}-${index}`} className="rounded-xl border border-red-100 bg-red-50/30 p-3">
                <p className="text-sm font-semibold text-neutral-900">{event.title || 'Untitled Event'}</p>
                <p className="text-xs text-neutral-500 mt-1">{dayjs(event.dateTime).format('MMM D, YYYY h:mm A')}</p>
                <p className="text-xs text-neutral-500 mt-1">Category: {getCategoryLabel(event.category || 'notes')}</p>
                <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  event.status === 'done'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                  {event.status === 'done' ? 'Done' : 'On-going'}
                </span>
              </div>
            ))}
            {assignedEvents.length === 0 && (
              <p className="text-sm text-neutral-500">No assigned activities yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}

export default Attendance
