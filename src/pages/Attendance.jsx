import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, ClipboardList, Clock, Users } from 'lucide-react'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'

const LOGIN_ACTIVITY_KEY = 'kusgan_login_activity'
const EVENTS_KEY = 'kusgan_events'
const LOGIN_ACTIVITY_UPDATED_EVENT = 'kusgan-login-activity-updated'

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

const getStoredEvents = () => {
  const stored = localStorage.getItem(EVENTS_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function Attendance() {
  const { user } = useAuth()
  const [loginActivity, setLoginActivity] = useState(getStoredLoginActivity)
  const [events, setEvents] = useState(getStoredEvents)

  useEffect(() => {
    const refreshLogin = () => setLoginActivity(getStoredLoginActivity())
    const onStorage = event => {
      if (event?.key === LOGIN_ACTIVITY_KEY) refreshLogin()
    }
    refreshLogin()
    window.addEventListener('storage', onStorage)
    window.addEventListener(LOGIN_ACTIVITY_UPDATED_EVENT, refreshLogin)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(LOGIN_ACTIVITY_UPDATED_EVENT, refreshLogin)
    }
  }, [])

  useEffect(() => {
    const refreshEvents = () => setEvents(getStoredEvents())
    const onStorage = event => {
      if (event?.key === EVENTS_KEY) refreshEvents()
    }
    refreshEvents()
    window.addEventListener('storage', onStorage)
    window.addEventListener('kusgan-events-updated', refreshEvents)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('kusgan-events-updated', refreshEvents)
    }
  }, [])

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

    localStorage.setItem(LOGIN_ACTIVITY_KEY, JSON.stringify(activity))
    window.dispatchEvent(new Event(LOGIN_ACTIVITY_UPDATED_EVENT))
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
