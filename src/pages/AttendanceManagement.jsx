import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Clock, Download, Pencil, Save, ShieldCheck, UserCheck, UserX, X } from 'lucide-react'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled } from '../lib/supabaseEvents'

const LOGIN_ACTIVITY_KEY = 'kusgan_login_activity'
const LOGIN_ACTIVITY_UPDATED_EVENT = 'kusgan-login-activity-updated'
const LOGIN_ACTIVITY_CHANNEL = 'kusgan-attendance-sync'
const ADMIN_ATTENDANCE_CACHE_KEY = 'kusgan_admin_attendance_cache'

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
  const [editingAttendance, setEditingAttendance] = useState({
    status: 'Present',
    isOnline: false,
    timeIn: '',
    timeOut: '',
    timeOutReason: '',
  })

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
        .select('date,user_id,is_present,status,present_at,time_in,time_out,time_out_reason')
        .eq('date', selectedDate)

      if (!active) return
      const mapped = Array.isArray(data)
        ? data.map(row => ({
            date: row.date,
            userId: row.user_id,
            isOnline: Boolean(row.is_present),
            status: row.status || 'Present',
            presentAt: row.present_at || null,
            timeIn: row.time_in || row.present_at || null,
            timeOut: row.time_out || null,
            timeOutReason: row.time_out_reason || '',
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
            status: row.status || 'Present',
            presentAt: row.present_at || null,
            timeIn: row.time_in || row.present_at || null,
            timeOut: row.time_out || null,
            timeOutReason: row.time_out_reason || '',
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
      const isHalfday = activity?.status === 'Halfday' || activity?.timeOutReason === 'Halfday'
      const hasTimeIn = Boolean(
        activity?.timeIn || activity?.presentAt || activity?.firstLoginAt || activity?.lastLoginAt
      )
      const hasTimeOut = Boolean(
        activity?.timeOut || activity?.lastLogoutAt || activity?.lastStatusAt
      )
      const status = activity
        ? (isHalfday
          ? 'Halfday'
          : (activity?.status && activity?.status !== 'Absent'
            ? activity.status
            : (hasTimeIn || hasTimeOut ? 'Present' : 'Absent')))
        : 'Absent'
      const isOnline = activity?.isOnline !== undefined
        ? Boolean(activity?.isOnline)
        : Boolean(activity?.isPresent)

      const timeInRaw = activity?.timeIn || activity?.presentAt || activity?.firstLoginAt || activity?.lastLoginAt || null
      const timeOutRaw = activity?.isOnline
        ? null
        : (activity?.timeOut || activity?.lastLogoutAt || activity?.lastStatusAt || null)
      const timeOutReason = activity?.timeOutReason || ''

      return {
        member,
        memberId,
        status,
        isOnline,
        timeInRaw,
        timeOutRaw,
        timeOutReason,
      }
    })
  }, [members, activityByUser])

  const presentCount = rows.filter(row => row.status === 'Present').length
  const absentCount = rows.filter(row => row.status === 'Absent').length
  const halfdayCount = rows.filter(row => row.status === 'Halfday').length

  const startEditing = (memberId) => {
    const existing = activityByUser[String(memberId)]
    const isOnline = Boolean(existing?.isOnline ?? existing?.isPresent)
    const timeInValue = existing?.timeIn || existing?.presentAt || existing?.firstLoginAt || existing?.lastLoginAt || ''
    const timeOutValue = existing?.timeOut || existing?.lastLogoutAt || existing?.lastStatusAt || ''
    const status = existing?.status || (existing ? 'Present' : 'Absent')
    setEditingUserId(memberId)
    setEditingAttendance({
      status,
      isOnline,
      timeIn: timeInValue && dayjs(timeInValue).isValid() ? dayjs(timeInValue).format('HH:mm') : '',
      timeOut: timeOutValue && dayjs(timeOutValue).isValid() ? dayjs(timeOutValue).format('HH:mm') : '',
      timeOutReason: existing?.timeOutReason || '',
    })
  }

  const cancelEditing = () => {
    setEditingUserId(null)
    setEditingAttendance({
      status: 'Present',
      isOnline: false,
      timeIn: '',
      timeOut: '',
      timeOutReason: '',
    })
  }

  const resolveDateTime = (timeValue) => {
    if (!timeValue) return null
    const candidate = dayjs(`${selectedDate}T${timeValue}`)
    return candidate.isValid() ? candidate.toISOString() : null
  }

  const saveAttendanceFor = async (memberId) => {
    const status = editingAttendance.status || 'Present'
    const isPresent = status !== 'Absent'
    const timeInIso = resolveDateTime(editingAttendance.timeIn)
    const timeOutIso = resolveDateTime(editingAttendance.timeOut)
    const timeOutReason = editingAttendance.timeOutReason || ''

    const payload = {
      date: selectedDate,
      userId: memberId,
      isPresent,
      isOnline: Boolean(editingAttendance.isOnline),
      status,
      presentAt: timeInIso,
      timeIn: timeInIso,
      timeOut: timeOutIso,
      timeOutReason,
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
        is_present: isPresent,
        present_at: timeInIso,
        status,
        time_in: timeInIso,
        time_out: timeOutIso,
        time_out_reason: timeOutReason || null,
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
        isOnline: Boolean(editingAttendance.isOnline),
        status,
        presentAt: timeInIso,
        timeIn: timeInIso,
        timeOut: timeOutIso,
        timeOutReason,
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
      const timeOutReason = row.timeOutReason || '-'
      return `
        <tr>
          <td>${row.member?.name || 'Member'}</td>
          <td>${row.member?.idNumber || row.memberId}</td>
          <td>${row.member?.committee || ''}</td>
          <td>${row.status}</td>
          <td>${timeIn}</td>
          <td>${timeOut}</td>
          <td>${timeOutReason}</td>
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
                <th>Status</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Time Out Reason</th>
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <ShieldCheck size={18} />
            <p className="text-sm font-semibold">Halfday</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{halfdayCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-red-600 bg-white p-5 shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardCheck size={18} className="text-red-600" />
          <h2 className="text-[20px] font-semibold text-neutral-900 dark:text-zinc-100">Daily Attendance Table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-neutral-500">
                <th className="pb-3">Member</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Time In</th>
                <th className="pb-3">Time Out</th>
                <th className="pb-3">Time Out Reason</th>
                <th className="pb-3">Online</th>
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
                        <p className="font-semibold text-neutral-900">{row.member?.name || 'Member'}</p>
                        <p className="text-xs text-neutral-500">{row.member?.committee || 'Unassigned'}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <select
                          value={editingAttendance.status}
                          onChange={event =>
                            setEditingAttendance(prev => ({ ...prev, status: event.target.value }))
                          }
                          className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 focus:border-red-500 focus:outline-none"
                        >
                          <option value="Present">Present</option>
                          <option value="Halfday">Halfday</option>
                          <option value="Absent">Absent</option>
                        </select>
                      ) : (
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          row.status === 'Present'
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : row.status === 'Halfday'
                              ? 'border-purple-200 bg-purple-50 text-purple-700'
                              : 'border-gray-200 bg-gray-50 text-gray-700'
                        }`}>
                          {row.status}
                        </span>
                      )}
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
                        <select
                          value={editingAttendance.timeOutReason}
                          onChange={event =>
                            setEditingAttendance(prev => ({ ...prev, timeOutReason: event.target.value }))
                          }
                          className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 focus:border-red-500 focus:outline-none"
                        >
                          <option value="">None</option>
                          <option value="End of Work">End of Work</option>
                          <option value="Lunch">Lunch</option>
                          <option value="Halfday">Halfday</option>
                        </select>
                      ) : (
                        <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                          {row.timeOutReason || '-'}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2 text-xs text-neutral-600">
                          <input
                            type="checkbox"
                            checked={editingAttendance.isOnline}
                            onChange={event =>
                              setEditingAttendance(prev => ({ ...prev, isOnline: event.target.checked }))
                            }
                            className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
                          />
                          Online
                        </label>
                      ) : (
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          row.isOnline
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                        }`}>
                          {row.isOnline ? 'Online' : 'Offline'}
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
    </div>
  )
}

export default AdminAttendance
