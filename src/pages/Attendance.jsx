import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, ClipboardList, Clock, Users } from 'lucide-react'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled, mapEventRowToEvent } from '../lib/supabaseEvents'

function Attendance() {
  const { user } = useAuth()
  const supabaseEnabled = isSupabaseEnabled()
  const [loginActivity, setLoginActivity] = useState([])
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!supabaseEnabled) return
    if (!user?.id) {
      setLoginActivity([])
      return
    }

    let active = true

    const load = async () => {
      const { data } = await supabase
        .from('login_activity')
        .select('date,last_login_at,is_online,last_status_at')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (!active) return
      const mapped = Array.isArray(data)
        ? data.map(row => ({
            date: row.date,
            userId: user.id,
            lastLoginAt: row.last_login_at,
            lastStatusAt: row.last_status_at || null,
            isOnline: Boolean(row.is_online),
          }))
        : []
      setLoginActivity(mapped)
    }

    load()

    const channel = supabase
      .channel('kusgan-login-activity-self')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'login_activity', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabaseEnabled, user?.id])

  useEffect(() => {
    if (!supabaseEnabled) return
    if (!user?.id) {
      setEvents([])
      return
    }

    let active = true

    const load = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .contains('assigned_member_ids', [user.id])
        .order('date_time', { ascending: false })

      if (!active) return
      const mapped = Array.isArray(data) ? data.map(mapEventRowToEvent).filter(Boolean) : []
      setEvents(mapped)
    }

    load()

    const channel = supabase
      .channel('kusgan-events-assigned')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => load())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabaseEnabled, user?.id])

  const userId = String(user?.id || '')

  const attendanceRows = useMemo(() => {
    const monthStart = dayjs().startOf('month')
    const daysInMonth = monthStart.daysInMonth()
    const activityForUser = loginActivity.filter(entry => String(entry.userId) === userId)
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
        status: entry ? 'Present' : 'Absent',
        lastLoginAt: entry?.lastLoginAt || null,
      }
    })
  }, [loginActivity, userId])

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
    return events
      .filter(event => Array.isArray(event.assignedMemberIds))
      .filter(event => event.assignedMemberIds.map(id => String(id)).includes(userId))
      .filter(event => event.dateTime && dayjs(event.dateTime).isValid())
      .sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf())
  }, [events, userId])

  const todayKey = dayjs().format('YYYY-MM-DD')
  const todayEntry = useMemo(
    () => loginActivity.find(entry => entry?.date === todayKey && String(entry.userId) === userId) || null,
    [loginActivity, todayKey, userId]
  )
  const isOnline = Boolean(todayEntry?.isOnline)

  const markOnline = () => {
    if (!userId) return
    const nowIso = dayjs().toISOString()
    const activity = Array.isArray(loginActivity) ? [...loginActivity] : []
    const existingIndex = activity.findIndex(
      entry => entry?.date === todayKey && String(entry.userId) === userId
    )

    const nextIsOnline = !isOnline
    const payload = {
      date: todayKey,
      userId: user?.id,
      name: user?.name || 'Member',
      email: user?.email || '',
      role: user?.role || 'member',
      profileImage: user?.profileImage || '/image-removebg-preview.png',
      lastLoginAt: nextIsOnline ? nowIso : (todayEntry?.lastLoginAt || nowIso),
      lastStatusAt: nowIso,
      isOnline: nextIsOnline,
    }

    if (existingIndex >= 0) {
      activity[existingIndex] = payload
    } else {
      activity.push(payload)
    }

    if (supabaseEnabled) {
      supabase
        .from('login_activity')
        .upsert(
          {
            user_id: user.id,
            date: todayKey,
            last_login_at: nextIsOnline ? nowIso : (todayEntry?.lastLoginAt || nowIso),
            is_online: nextIsOnline,
            last_status_at: nowIso,
          },
          { onConflict: 'user_id,date' }
        )
      setLoginActivity(activity)
      return
    }
    setLoginActivity(activity)
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
          <button
            type="button"
            onClick={markOnline}
            className="inline-flex items-center gap-2 rounded-xl border border-red-600 bg-red-600 px-5 py-2 text-[14px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-red-700"
          >
            <CalendarCheck size={16} />
            {isOnline ? 'I’m Offline' : 'I’m Online'}
          </button>
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
                  {row.lastLoginAt && (
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <Clock size={12} />
                      {dayjs(row.lastLoginAt).format('h:mm A')}
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
                <p className="text-xs text-neutral-500 mt-1">Category: {event.category || 'notes'}</p>
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
