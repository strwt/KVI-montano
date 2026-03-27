import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Clock, Download, Pencil, Save, UserCheck, UserX, X } from 'lucide-react'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled } from '../lib/supabaseEvents'

const LOGIN_ACTIVITY_KEY = 'kusgan_login_activity'
const LOGIN_ACTIVITY_UPDATED_EVENT = 'kusgan-login-activity-updated'
const LOGIN_ACTIVITY_CHANNEL = 'kusgan-attendance-sync'
const ADMIN_ATTENDANCE_CACHE_KEY = 'kusgan_admin_attendance_cache'
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const getAdminAttendanceCache = () => {
  const stored = localStorage.getItem(ADMIN_ATTENDANCE_CACHE_KEY)
  if (!stored) return {}
  try {
    const parsed = JSON.parse(stored)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const saveAdminAttendanceCache = (cache) => {
  localStorage.setItem(ADMIN_ATTENDANCE_CACHE_KEY, JSON.stringify(cache))
}

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

function AdminAttendance() {
  const { user, users, ensureAdminDataLoaded } = useAuth()
  const supabaseEnabled = isSupabaseEnabled()
  const isAdmin = user?.role === 'admin'
  const [localLoginActivity, setLocalLoginActivity] = useState(getStoredLoginActivity)
  const [supabaseLoginActivity, setSupabaseLoginActivity] = useState([])
  const [adminAttendanceCache, setAdminAttendanceCache] = useState(getAdminAttendanceCache)
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [editingUserId, setEditingUserId] = useState(null)
  const [editingAttendance, setEditingAttendance] = useState({ timeIn: '', timeOut: '' })
  const [historyMember, setHistoryMember] = useState(null)
  const [historyMonth, setHistoryMonth] = useState(() => dayjs().format('YYYY-MM'))
  const [historySupabaseActivity, setHistorySupabaseActivity] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    if (user?.role !== 'admin') return
    void ensureAdminDataLoaded()
  }, [ensureAdminDataLoaded, user?.role, user?.id])

  useEffect(() => {
    const refreshLogin = () => setLocalLoginActivity(getStoredLoginActivity())
    const onStorage = event => {
      if (event?.key === LOGIN_ACTIVITY_KEY) refreshLogin()
    }
    refreshLogin()
    const intervalId = window.setInterval(refreshLogin, 5000)
    let channel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel(LOGIN_ACTIVITY_CHANNEL)
      channel.onmessage = () => refreshLogin()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(LOGIN_ACTIVITY_UPDATED_EVENT, refreshLogin)
    return () => {
      window.clearInterval(intervalId)
      if (channel) channel.close()
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(LOGIN_ACTIVITY_UPDATED_EVENT, refreshLogin)
    }
  }, [])

  useEffect(() => {
    if (!supabaseEnabled || !isAdmin) return
    let active = true

    const load = async () => {
      const { data } = await supabase
        .from('login_activity')
        .select('date,user_id,is_present,status,present_at,time_in,time_out')
        .eq('date', selectedDate)

      if (!active) return
      const mapped = Array.isArray(data)
        ? data.map(row => ({
            date: row.date,
            userId: row.user_id,
            isOnline: Boolean(row.is_present),
            status: row.status === 'Halfday' ? 'Present' : (row.status || 'Present'),
            presentAt: row.present_at || null,
            timeIn: row.time_in || row.present_at || null,
            timeOut: row.time_out || null,
          }))
        : []
      setSupabaseLoginActivity(mapped)
      if (mapped.length) {
        setAdminAttendanceCache(prev => {
          const next = { ...(prev || {}) }
          next[selectedDate] = mapped
          saveAdminAttendanceCache(next)
          return next
        })
      }
    }

    void load()

    const channel = supabase
      .channel(`kusgan-login-activity-admin-${selectedDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'login_activity', filter: `date=eq.${selectedDate}` },
        (payload) => {
          if (!active) return
          const eventType = payload?.eventType
          const nextRow = payload?.new
          const oldRow = payload?.old

          const mapRow = (row) => ({
            date: row.date,
            userId: row.user_id,
            isOnline: Boolean(row.is_present),
            status: row.status === 'Halfday' ? 'Present' : (row.status || 'Present'),
            presentAt: row.present_at || null,
            timeIn: row.time_in || row.present_at || null,
            timeOut: row.time_out || null,
          })

          if ((eventType === 'INSERT' || eventType === 'UPDATE') && nextRow?.user_id) {
            const mapped = mapRow(nextRow)
            setSupabaseLoginActivity(prev => {
              const list = Array.isArray(prev) ? prev : []
              const idx = list.findIndex(item => String(item?.userId || '') === String(mapped.userId))
              const next = idx === -1 ? [...list, mapped] : list.map((item, i) => (i === idx ? { ...item, ...mapped } : item))
              setAdminAttendanceCache(cachePrev => {
                const cache = { ...(cachePrev || {}) }
                cache[selectedDate] = next
                saveAdminAttendanceCache(cache)
                return cache
              })
              return next
            })
          } else if (eventType === 'DELETE' && oldRow?.user_id) {
            const deletedUserId = oldRow.user_id
            setSupabaseLoginActivity(prev => {
              const list = Array.isArray(prev) ? prev : []
              const next = list.filter(item => String(item?.userId || '') !== String(deletedUserId))
              setAdminAttendanceCache(cachePrev => {
                const cache = { ...(cachePrev || {}) }
                cache[selectedDate] = next
                saveAdminAttendanceCache(cache)
                return cache
              })
              return next
            })
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabaseEnabled, selectedDate, isAdmin])

  useEffect(() => {
    if (!supabaseEnabled || !isAdmin) return
    const memberId = historyMember?.id
    if (!memberId || !historyMonth) return

    let active = true
    const load = async () => {
      setHistoryLoading(true)
      setHistoryError('')
      const monthStart = dayjs(`${historyMonth}-01`).startOf('month')
      const monthEnd = monthStart.endOf('month')

      const { data, error } = await supabase
        .from('login_activity')
        .select('date,user_id,is_present,status,present_at,time_in,time_out')
        .eq('user_id', memberId)
        .gte('date', monthStart.format('YYYY-MM-DD'))
        .lte('date', monthEnd.format('YYYY-MM-DD'))
        .order('date', { ascending: false })

      if (!active) return

      if (error) {
        console.warn('Unable to load attendance history.', error)
        setHistorySupabaseActivity([])
        setHistoryError(error.message || 'Unable to load attendance history.')
      } else {
        const mapped = Array.isArray(data)
          ? data.map(row => ({
              date: row.date,
              userId: row.user_id,
              isPresent: Boolean(row.is_present),
              status: (row.status === 'Halfday' ? 'Present' : row.status) || (row.is_present ? 'Present' : 'Absent'),
              presentAt: row.present_at || null,
              timeIn: row.time_in || row.present_at || null,
              timeOut: row.time_out || null,
            }))
          : []
        setHistorySupabaseActivity(mapped)
      }

      setHistoryLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [supabaseEnabled, isAdmin, historyMember?.id, historyMonth])

  const members = useMemo(() => {
    return (users || [])
      .filter(member => member?.role !== 'admin')
      .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
  }, [users])

  const activityByUser = useMemo(() => {
    const getActivityStamp = (entry) => {
      const candidate = entry?.timeOut
        || entry?.timeIn
        || entry?.presentAt
        || entry?.lastStatusAt
        || entry?.lastLogoutAt
        || entry?.lastLoginAt
        || null
      const parsed = candidate && dayjs(candidate).isValid() ? dayjs(candidate).valueOf() : 0
      return parsed || 0
    }

    const localByUser = (localLoginActivity || [])
      .filter(entry => entry?.date === selectedDate)
      .reduce((acc, entry) => {
        if (!entry?.userId) return acc
        acc[String(entry.userId)] = entry
        return acc
      }, {})

    const cachedForDate = adminAttendanceCache?.[selectedDate]
    const effectiveSupabaseActivity = !isAdmin
      ? []
      : ((supabaseLoginActivity && supabaseLoginActivity.length)
        ? supabaseLoginActivity
        : (Array.isArray(cachedForDate) ? cachedForDate : []))

    const supabaseByUser = (effectiveSupabaseActivity || [])
      .filter(entry => entry?.date === selectedDate)
      .reduce((acc, entry) => {
        if (!entry?.userId) return acc
        acc[String(entry.userId)] = entry
        return acc
      }, {})

    const merged = { ...supabaseByUser }
    Object.entries(localByUser).forEach(([userId, localEntry]) => {
      const supabaseEntry = supabaseByUser[userId]
      if (!supabaseEntry) {
        merged[userId] = localEntry
        return
      }
      const localStamp = getActivityStamp(localEntry)
      const supabaseStamp = getActivityStamp(supabaseEntry)
      merged[userId] = localStamp >= supabaseStamp ? localEntry : supabaseEntry
    })

    return merged
  }, [localLoginActivity, supabaseLoginActivity, adminAttendanceCache, selectedDate, isAdmin])

  const rows = useMemo(() => {
    return members.map(member => {
      const memberId = String(member.id)
      const activity = activityByUser[memberId]
      const isOnline = activity?.isOnline !== undefined
        ? Boolean(activity?.isOnline)
        : Boolean(activity?.isPresent)

      const timeInRaw = activity?.timeIn || activity?.presentAt || activity?.firstLoginAt || activity?.lastLoginAt || null
      const timeOutRaw = isOnline
        ? null
        : (activity?.timeOut || activity?.lastLogoutAt || activity?.lastStatusAt || null)
      const normalizedStatus = activity?.status === 'Halfday' ? 'Present' : activity?.status
      const isPresent = normalizedStatus && normalizedStatus !== 'Absent'
        ? true
        : Boolean(timeInRaw || timeOutRaw || isOnline)
      const status = isPresent ? 'Present' : 'Absent'

      return {
        member,
        memberId,
        status,
        timeInRaw,
        timeOutRaw,
      }
    })
  }, [members, activityByUser])

  const presentCount = rows.filter(row => row.status === 'Present').length
  const absentCount = rows.filter(row => row.status === 'Absent').length

  const startEditing = (memberId) => {
    const existing = activityByUser[String(memberId)]
    const timeInValue = existing?.timeIn || existing?.presentAt || existing?.firstLoginAt || existing?.lastLoginAt || ''
    const timeOutValue = existing?.timeOut || existing?.lastLogoutAt || existing?.lastStatusAt || ''
    setEditingUserId(memberId)
    setEditingAttendance({
      timeIn: timeInValue && dayjs(timeInValue).isValid() ? dayjs(timeInValue).format('HH:mm') : '',
      timeOut: timeOutValue && dayjs(timeOutValue).isValid() ? dayjs(timeOutValue).format('HH:mm') : '',
    })
  }

  const cancelEditing = () => {
    setEditingUserId(null)
    setEditingAttendance({ timeIn: '', timeOut: '' })
  }

  const openHistory = (member) => {
    if (!member) return
    setHistoryMember(member)
    setHistoryMonth(dayjs(selectedDate).format('YYYY-MM'))
    setHistoryError('')
  }

  const closeHistory = () => {
    setHistoryMember(null)
    setHistorySupabaseActivity([])
    setHistoryLoading(false)
    setHistoryError('')
  }

  const historyRows = useMemo(() => {
    const memberId = String(historyMember?.id || '')
    if (!memberId || !historyMonth) return []

    const monthStart = dayjs(`${historyMonth}-01`).startOf('month')
    const daysInMonth = monthStart.daysInMonth()
    const monthStartKey = monthStart.format('YYYY-MM-DD')
    const monthEndKey = monthStart.endOf('month').format('YYYY-MM-DD')

    const activityByDate = new Map()

    ;(historySupabaseActivity || []).forEach(entry => {
      if (!entry?.date) return
      if (String(entry?.userId || '') !== memberId) return
      activityByDate.set(entry.date, entry)
    })

    ;(localLoginActivity || []).forEach(entry => {
      if (!entry?.date) return
      if (String(entry?.userId || '') !== memberId) return
      if (entry.date < monthStartKey || entry.date > monthEndKey) return
      activityByDate.set(entry.date, entry)
    })

    return Array.from({ length: daysInMonth }, (_, idx) => {
      const date = monthStart.add(idx, 'day')
      const dateKey = date.format('YYYY-MM-DD')
      const entry = activityByDate.get(dateKey)

      return {
        dateKey,
        label: date.format('MMM D, YYYY'),
        status: entry?.status === 'Halfday'
          ? 'Present'
          : (entry?.status || (entry?.isPresent ? 'Present' : 'Absent')),
        timeIn: entry?.timeIn || entry?.presentAt || null,
        timeOut: entry?.timeOut || null,
      }
    })
  }, [historyMember?.id, historyMonth, historySupabaseActivity, localLoginActivity])

  const historyPresentCount = useMemo(
    () => historyRows.filter(row => row.status === 'Present').length,
    [historyRows]
  )

  const historyAbsentCount = useMemo(
    () => historyRows.filter(row => row.status === 'Absent').length,
    [historyRows]
  )

  const historyCalendarCells = useMemo(() => {
    const monthStart = historyMonth ? dayjs(`${historyMonth}-01`).startOf('month') : null
    const offset = monthStart?.isValid?.() ? monthStart.day() : 0
    const blanks = Array.from({ length: offset }, (_, idx) => ({ key: `blank-${idx}`, blank: true }))
    const days = historyRows.map(row => ({ ...row, blank: false }))
    return [...blanks, ...days]
  }, [historyRows, historyMonth])

  const resolveDateTime = (timeValue) => {
    if (!timeValue) return null
    const candidate = dayjs(`${selectedDate}T${timeValue}`)
    return candidate.isValid() ? candidate.toISOString() : null
  }

  const saveAttendanceFor = async (memberId) => {
    const timeInIsoRaw = resolveDateTime(editingAttendance.timeIn)
    const timeOutIsoRaw = resolveDateTime(editingAttendance.timeOut)
    const timeInIso = timeInIsoRaw || timeOutIsoRaw
    const timeOutIso = timeOutIsoRaw
    const status = (timeInIso || timeOutIso) ? 'Present' : 'Absent'
    const isOnline = Boolean(timeInIso) && !timeOutIso && status !== 'Absent'

    const payload = {
      date: selectedDate,
      userId: memberId,
      isPresent: isOnline,
      isOnline,
      status,
      presentAt: timeInIso,
      timeIn: timeInIso,
      timeOut: timeOutIso,
      updatedBy: user?.name || 'Admin',
      updatedAt: new Date().toISOString(),
    }

    setLocalLoginActivity(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      const idx = next.findIndex(
        entry => entry?.date === selectedDate && String(entry?.userId) === String(memberId)
      )
      if (idx >= 0) next[idx] = { ...next[idx], ...payload }
      else next.push(payload)
      localStorage.setItem(LOGIN_ACTIVITY_KEY, JSON.stringify(next))
      window.dispatchEvent(new Event(LOGIN_ACTIVITY_UPDATED_EVENT))
      return next
    })

    if (supabaseEnabled) {
      const dbPayload = {
        user_id: memberId,
        date: selectedDate,
        is_present: isOnline,
        present_at: timeInIso,
        status,
        time_in: timeInIso,
        time_out: timeOutIso,
        time_out_reason: null,
      }
      const { error } = await supabase
        .from('login_activity')
        .upsert(dbPayload, { onConflict: 'user_id,date' })
      if (error) console.warn('Unable to save attendance.', error)
    }

    setAdminAttendanceCache(prev => {
      const next = { ...(prev || {}) }
      const current = Array.isArray(next[selectedDate]) ? [...next[selectedDate]] : []
      const idx = current.findIndex(entry => String(entry?.userId) === String(memberId))
      const cachedEntry = {
        date: selectedDate,
        userId: memberId,
        isOnline,
        status,
        presentAt: timeInIso,
        timeIn: timeInIso,
        timeOut: timeOutIso,
      }
      if (idx >= 0) current[idx] = { ...current[idx], ...cachedEntry }
      else current.push(cachedEntry)
      next[selectedDate] = current
      saveAdminAttendanceCache(next)
      return next
    })

    cancelEditing()
  }

  const formatTime = (value) => {
    if (!value || !dayjs(value).isValid()) return '-'
    return dayjs(value).format('h:mm A')
  }

  const exportAttendancePdf = () => {
    const dateLabel = dayjs(selectedDate).isValid()
      ? dayjs(selectedDate).format('MMMM D, YYYY')
      : selectedDate

    const rowsHtml = rows.map(row => {
      const timeIn = formatTime(row.timeInRaw)
      const timeOut = formatTime(row.timeOutRaw)
      return `
        <tr>
          <td>${row.member?.name || 'Member'}</td>
          <td>${row.member?.idNumber || row.memberId}</td>
          <td>${row.member?.committee || ''}</td>
          <td>${timeIn}</td>
          <td>${timeOut}</td>
        </tr>
      `
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Attendance ${selectedDate}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, sans-serif;
              color: #111827;
              margin: 24px;
            }
            h1 { font-size: 20px; margin: 0 0 6px; }
            .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px;
              vertical-align: top;
            }
            th {
              background: #f9fafb;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              font-size: 10px;
              color: #6b7280;
              text-align: left;
            }
            @media print {
              body { margin: 12mm; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <div class="meta">Date: ${dateLabel}</div>
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>ID</th>
                <th>Committee</th>
                <th>Time In</th>
                <th>Time Out</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=1024,height=768')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <section className="rounded-2xl border border-red-600 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-300">Attendance</p>
            <h1 className="text-[28px] font-semibold text-neutral-900 dark:text-zinc-100">Attendance Management</h1>
            <p className="text-[14px] text-neutral-500 dark:text-neutral-300">
              Track member presence, absences, and admin adjustments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-neutral-500 dark:text-neutral-300" htmlFor="attendance-date">
              Select date
            </label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 shadow-sm focus:border-red-500 focus:outline-none dark:border-neutral-700 dark:bg-zinc-900 dark:text-neutral-100"
            />
            <button
              type="button"
              onClick={exportAttendancePdf}
              className="inline-flex items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-700">
            <UserCheck size={18} />
            <p className="text-sm font-semibold">Present</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-green-900">{presentCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <UserX size={18} />
            <p className="text-sm font-semibold">Absent</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{absentCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-red-600 bg-white p-5 shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardCheck size={18} className="text-red-600" />
          <h2 className="text-[20px] font-semibold text-neutral-900 dark:text-zinc-100">Daily Attendance Table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-neutral-500">
                <th className="pb-3">Member</th>
                <th className="pb-3">Time In</th>
                <th className="pb-3">Time Out</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map(row => {
                const timeIn = row.timeInRaw && dayjs(row.timeInRaw).isValid()
                  ? dayjs(row.timeInRaw).format('h:mm A')
                  : '-'
                const timeOut = row.timeOutRaw && dayjs(row.timeOutRaw).isValid()
                  ? dayjs(row.timeOutRaw).format('h:mm A')
                  : '-'
                const isEditing = String(editingUserId) === row.memberId

                return (
                  <tr key={row.memberId} className="text-neutral-700">
                    <td className="py-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => openHistory(row.member)}
                          className="text-left font-semibold text-neutral-900 hover:underline"
                          title="View monthly attendance"
                        >
                          {row.member?.name || 'Member'}
                        </button>
                        <p className="text-xs text-neutral-500">{row.member?.committee || 'Unassigned'}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <input
                          type="time"
                          value={editingAttendance.timeIn}
                          onChange={event =>
                            setEditingAttendance(prev => ({ ...prev, timeIn: event.target.value }))
                          }
                          className="w-full rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-700 focus:border-red-500 focus:outline-none"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-neutral-600">
                          <Clock size={12} />
                          {timeIn}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <input
                          type="time"
                          value={editingAttendance.timeOut}
                          onChange={event =>
                            setEditingAttendance(prev => ({ ...prev, timeOut: event.target.value }))
                          }
                          className="w-full rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-700 focus:border-red-500 focus:outline-none"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-neutral-600">
                          <Clock size={12} />
                          {timeOut}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveAttendanceFor(row.memberId)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            <Save size={12} />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-600 hover:border-neutral-300"
                          >
                            <X size={12} />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(row.memberId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:border-red-300"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {historyMember && (
        <div
          className="fixed inset-y-0 right-0 left-0 md:left-64 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeHistory}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-red-600 bg-white p-4 sm:p-6 shadow-2xl dark:border-red-600 dark:bg-zinc-900"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Attendance History</p>
                <h3 className="mt-1 text-[20px] font-semibold text-neutral-900 dark:text-zinc-100">
                  {historyMember?.name || 'Member'}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-300">{historyMember?.committee || 'Unassigned'}</p>
              </div>
              <button
                type="button"
                onClick={closeHistory}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-zinc-700 dark:text-zinc-200"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <label htmlFor="history-month" className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  Month
                </label>
                <input
                  id="history-month"
                  type="month"
                  value={historyMonth}
                  onChange={event => setHistoryMonth(event.target.value)}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 shadow-sm focus:border-red-500 focus:outline-none dark:border-neutral-700 dark:bg-zinc-900 dark:text-neutral-100"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  <UserCheck size={14} />
                  Present: {historyPresentCount}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                  <UserX size={14} />
                  Absent: {historyAbsentCount}
                </span>
              </div>
            </div>

            {historyError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {historyError}
              </p>
            )}

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white/60 p-3 sm:p-4 dark:border-zinc-700 dark:bg-zinc-950/20">
              <div className="overflow-x-auto">
                <div className="min-w-[560px] sm:min-w-[720px] md:min-w-[840px] lg:min-w-[980px]">
                  <div className="grid grid-cols-7 gap-2 sm:gap-2.5 lg:gap-3 text-center text-[11px] sm:text-xs lg:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                    {WEEKDAY_LABELS.map(label => (
                      <div key={label}>{label}</div>
                    ))}
                  </div>

                  <div className="mt-2 sm:mt-3 max-h-[320px] sm:max-h-[420px] lg:max-h-[560px] overflow-y-auto pr-1">
                {historyLoading ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-300">Loading attendance...</p>
                ) : (
                  <div className="grid grid-cols-7 gap-2 sm:gap-2.5 lg:gap-3">
                    {historyCalendarCells.map((cell, index) => {
                      if (cell.blank) {
                        return <div key={cell.key || `blank-${index}`} className="h-[84px] sm:h-[100px] lg:h-[120px] rounded-xl" />
                      }

                      const isToday = cell.dateKey === dayjs().format('YYYY-MM-DD')
                      const dayNumber = dayjs(cell.dateKey).date()
                      const timeInLabel = cell.timeIn && dayjs(cell.timeIn).isValid()
                        ? dayjs(cell.timeIn).format('h:mm A')
                        : null
                      const timeOutLabel = cell.timeOut && dayjs(cell.timeOut).isValid()
                        ? dayjs(cell.timeOut).format('h:mm A')
                        : null

                      const tone = cell.status === 'Present'
                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/50 dark:bg-emerald-950/30'
                        : 'border-neutral-200 bg-neutral-50/70 dark:border-zinc-700 dark:bg-zinc-950/20'

                      const badgeTone = cell.status === 'Present'
                        ? 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : 'border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'

                      const titleParts = [`${cell.label}: ${cell.status}`]
                      if (timeInLabel) titleParts.push(`In: ${timeInLabel}`)
                      if (timeOutLabel) titleParts.push(`Out: ${timeOutLabel}`)

                      return (
                        <div
                          key={cell.dateKey || `day-${index}`}
                          className={`flex h-[84px] sm:h-[100px] lg:h-[120px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-2 sm:p-2.5 lg:p-3 ${tone} ${
                            isToday ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900' : ''
                          }`}
                          title={titleParts.join(' | ')}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-zinc-100">{dayNumber}</span>
                            <span className={`inline-flex max-w-[64px] sm:max-w-[80px] lg:max-w-[92px] truncate rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${badgeTone}`}>
                              {cell.status}
                            </span>
                          </div>
                          {(timeInLabel || timeOutLabel) ? (
                            <div className="min-w-0 space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-300">
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
                            <span className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">No record</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAttendance

