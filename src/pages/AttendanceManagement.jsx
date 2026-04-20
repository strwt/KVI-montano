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
  const [attendanceSaveBusyId, setAttendanceSaveBusyId] = useState(null)
  const [attendanceSaveError, setAttendanceSaveError] = useState('')
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
    const refreshLogin = () => {
      const next = getStoredLoginActivity()
      setLocalLoginActivity(prev => {
        if (prev === next) return prev
        try {
          const prevJson = JSON.stringify(prev || [])
          const nextJson = JSON.stringify(next || [])
          return prevJson === nextJson ? prev : next
        } catch {
          return next
        }
      })
    }
    const onStorage = event => {
      if (event?.key === LOGIN_ACTIVITY_KEY) refreshLogin()
    }
    refreshLogin()
    const intervalId = window.setInterval(refreshLogin, 60_000)
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
        .select('date,user_id,is_present,is_online,status,present_at,time_in,time_out')
        .eq('date', selectedDate)

      if (!active) return
      const mapped = Array.isArray(data)
        ? data.map(row => ({
            date: row.date,
            userId: row.user_id,
            isPresent: Boolean(row.is_present),
            isOnline: Boolean(row.is_online),
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
            isPresent: Boolean(row.is_present),
            isOnline: Boolean(row.is_online),
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

	  const presentRows = useMemo(() => {
	    return rows.filter(row => row.status === 'Present')
	  }, [rows])

  const startEditing = (memberId) => {
    setAttendanceSaveError('')
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
    setAttendanceSaveBusyId(null)
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
    setAttendanceSaveError('')
    setAttendanceSaveBusyId(String(memberId))
    const timeInIsoRaw = resolveDateTime(editingAttendance.timeIn)
    const timeOutIsoRaw = resolveDateTime(editingAttendance.timeOut)
    const timeInIso = timeInIsoRaw || timeOutIsoRaw
    const timeOutIso = timeOutIsoRaw
    const isPresent = Boolean(timeInIso || timeOutIso)
    const status = isPresent ? 'Present' : 'Absent'
    const isOnline = isPresent && Boolean(timeInIso) && !timeOutIso

    const payload = {
      date: selectedDate,
      userId: memberId,
      isPresent,
      isOnline,
      status,
      presentAt: timeInIso,
      timeIn: timeInIso,
      timeOut: timeOutIso,
      updatedBy: user?.name || 'Admin',
      updatedAt: new Date().toISOString(),
    }

    if (supabaseEnabled) {
      const dbPayload = {
        user_id: memberId,
        date: selectedDate,
        is_present: isPresent,
        is_online: isOnline,
        present_at: timeInIso,
        status,
        time_in: timeInIso,
        time_out: timeOutIso,
        time_out_reason: null,
      }
      const { error } = await supabase
        .from('login_activity')
        .upsert(dbPayload, { onConflict: 'user_id,date' })

      if (error) {
        console.warn('Unable to save attendance.', error)
        setAttendanceSaveError(error.message || 'Unable to save attendance.')
        setAttendanceSaveBusyId(null)
        return
      }

      setSupabaseLoginActivity(prev => {
        const list = Array.isArray(prev) ? prev : []
        const idx = list.findIndex(item => String(item?.userId || '') === String(memberId) && item?.date === selectedDate)
        const mapped = {
          date: selectedDate,
          userId: memberId,
          isPresent,
          isOnline,
          status,
          presentAt: timeInIso,
          timeIn: timeInIso,
          timeOut: timeOutIso,
        }
        return idx === -1 ? [...list, mapped] : list.map((item, i) => (i === idx ? { ...item, ...mapped } : item))
      })
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

    setAdminAttendanceCache(prev => {
      const next = { ...(prev || {}) }
      const current = Array.isArray(next[selectedDate]) ? [...next[selectedDate]] : []
      const idx = current.findIndex(entry => String(entry?.userId) === String(memberId))
      const cachedEntry = {
        date: selectedDate,
        userId: memberId,
        isPresent,
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
    setAttendanceSaveBusyId(null)
  }

  const formatTime = (value) => {
    if (!value || !dayjs(value).isValid()) return '-'
    return dayjs(value).format('h:mm A')
  }

  const exportHistoryPdf = () => {
    if (!historyMember || !historyMonth || historyLoading) return

    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

    const monthStart = dayjs(`${historyMonth}-01`)
    const monthLabel = monthStart.isValid() ? monthStart.format('MMMM YYYY') : historyMonth
    const memberName = historyMember?.name || 'Member'

    const rowsHtml = historyRows.map(row => {
      const dateLabel = dayjs(row.dateKey).isValid()
        ? dayjs(row.dateKey).format('MMM D, YYYY')
        : row.label || row.dateKey
      const timeIn = formatTime(row.timeIn)
      const timeOut = formatTime(row.timeOut)
      const badgeClass = row.status === 'Present' ? 'badge badge-present' : 'badge badge-absent'

      return `
        <tr>
          <td>${escapeHtml(dateLabel)}</td>
          <td><span class="${badgeClass}">${escapeHtml(row.status)}</span></td>
          <td>${escapeHtml(timeIn)}</td>
          <td>${escapeHtml(timeOut)}</td>
        </tr>
      `
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Attendance ${escapeHtml(memberName)} ${escapeHtml(monthLabel)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, sans-serif;
              color: #111827;
              margin: 24px;
            }
            h1 { font-size: 20px; margin: 0 0 6px; }
            .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; line-height: 1.5; }
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
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              border: 1px solid transparent;
            }
            .badge-present { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
            .badge-absent { background: #f3f4f6; border-color: #e5e7eb; color: #374151; }
            @media print {
              body { margin: 12mm; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <h1>Monthly Attendance Report</h1>
          <div class="meta">
            <div><strong>Member:</strong> ${escapeHtml(memberName)}</div>
            <div><strong>ID:</strong> ${escapeHtml(historyMember?.idNumber || historyMember?.id || '')}</div>
            ${
              historyMember?.role === 'admin' || (historyMember?.committeeRole || historyMember?.committee_role) === 'OIC'
                ? ''
                : `<div><strong>Committee:</strong> ${escapeHtml(historyMember?.committee || 'Unassigned')}</div>`
            }
            <div><strong>Month:</strong> ${escapeHtml(monthLabel)}</div>
            <div><strong>Present:</strong> ${historyPresentCount} &nbsp; <strong>Absent:</strong> ${historyAbsentCount}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
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

  const exportAttendancePdf = () => {
    const dateLabel = dayjs(selectedDate).isValid()
      ? dayjs(selectedDate).format('MMMM D, YYYY')
      : selectedDate

	    const rowsHtml = presentRows.map(row => {
	      const timeIn = formatTime(row.timeInRaw)
	      const timeOut = formatTime(row.timeOutRaw)
	      return `
        <tr>
          <td>${row.member?.name || 'Member'}</td>
          <td>${row.member?.idNumber || row.memberId}</td>
          <td>${row.member?.role === 'admin' || (row.member?.committeeRole || row.member?.committee_role) === 'OIC' ? '' : (row.member?.committee || '')}</td>
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
    <div className="animate-fade-in space-y-6">    <section className="rounded-2xl border border-white/10 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[14px] uppercase tracking-[0.12em] text-white/70">Attendance</p>
            <h1 className="text-[28px] font-semibold text-white">Attendance Management</h1>
            <p className="text-[14px] text-white/70">
              Track member presence, absences, and admin adjustments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-white/70" htmlFor="attendance-date">
              Select date
            </label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-yellow-400 focus:outline-none"
              style={{
                colorScheme: 'light',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                WebkitTextFillColor: '#0f172a',
                boxShadow: 'inset 0 0 0 1000px #ffffff',
              }}
            />
            <button
              type="button"
              onClick={exportAttendancePdf}
              className="inline-flex items-center gap-2 rounded-xl border border-yellow-300/30 bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-yellow-300"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-emerald-200">
            <UserCheck size={18} />
            <p className="text-sm font-semibold">Present</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">{presentCount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-white/70">
            <UserX size={18} />
            <p className="text-sm font-semibold">Absent</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">{absentCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardCheck size={18} className="text-yellow-300" />
          <h2 className="text-[20px] font-semibold text-white">Daily Attendance Table</h2>
        </div>
        {attendanceSaveError ? (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {attendanceSaveError}
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-white/70">
                <th className="pb-3">Member</th>
                <th className="pb-3">Time In</th>
                <th className="pb-3">Time Out</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
	            <tbody className="divide-y divide-white/10">
	              {presentRows.map(row => {
	                const timeIn = row.timeInRaw && dayjs(row.timeInRaw).isValid()
	                  ? dayjs(row.timeInRaw).format('h:mm A')
	                  : '-'
                const timeOut = row.timeOutRaw && dayjs(row.timeOutRaw).isValid()
                  ? dayjs(row.timeOutRaw).format('h:mm A')
                  : '-'
                const isEditing = String(editingUserId) === row.memberId
                const isSaving = String(attendanceSaveBusyId || '') === String(row.memberId)

                return (
                  <tr key={row.memberId} className="text-white/80">
                    <td className="py-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => openHistory(row.member)}
                          className="text-left font-semibold text-white hover:underline"
                          title="View monthly attendance"
                        >
                          {row.member?.name || 'Member'}
                        </button>
                        {row.member?.role === 'admin' || (row.member?.committeeRole || row.member?.committee_role) === 'OIC' ? null : (
                          <p className="text-xs text-white/70">{row.member?.committee || 'Unassigned'}</p>
                        )}
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
                          style={{
                            colorScheme: 'light',
                            backgroundColor: '#ffffff',
                            color: '#0f172a',
                            WebkitTextFillColor: '#0f172a',
                            boxShadow: 'inset 0 0 0 1000px #ffffff',
                          }}
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-white">
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
                          style={{
                            colorScheme: 'light',
                            backgroundColor: '#ffffff',
                            color: '#0f172a',
                            WebkitTextFillColor: '#0f172a',
                            boxShadow: 'inset 0 0 0 1000px #ffffff',
                          }}
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-white">
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
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSaving}
                          >
                            <Save size={12} />
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-semibold text-white hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSaving}
                          >
                            <X size={12} />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(row.memberId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-white hover:border-red-300"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
	              })}
	              {presentRows.length === 0 && (
	                <tr>
	                  <td className="py-6 text-center text-white/70" colSpan={4}>
	                    No present members recorded for this date.
	                  </td>
	                </tr>
	              )}
	            </tbody>
          </table>
        </div>
      </section>

      {historyMember && (
        <div
          className="fixed inset-y-0 right-0 left-0 md:left-64 z-50 flex items-center justify-center bg-transparent p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeHistory}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl sm:p-5"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            onClick={event => event.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.05)]"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Attendance History</p>
                <h3 className="mt-1 text-[20px] font-semibold text-slate-900">
                  {historyMember?.name || 'Member'}
                </h3>
                {historyMember?.role === 'admin' || (historyMember?.committeeRole || historyMember?.committee_role) === 'OIC' ? null : (
                  <p className="text-sm text-slate-500">{historyMember?.committee || 'Unassigned'}</p>
                )}
              </div>
              <button
                type="button"
                onClick={closeHistory}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div
              className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.05)] md:flex-row md:items-center md:justify-between"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              <div className="flex items-center gap-2">
                <label htmlFor="history-month" className="text-sm font-medium text-slate-600">
                  Month
                </label>
                <input
                  id="history-month"
                  type="month"
                  value={historyMonth}
                  onChange={event => setHistoryMonth(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-yellow-400 focus:outline-none"
                  style={{
                    colorScheme: 'light',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    WebkitTextFillColor: '#0f172a',
                    boxShadow: 'inset 0 0 0 1000px #ffffff',
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <UserCheck size={14} />
                  Present: {historyPresentCount}
                </span>
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <UserX size={14} />
                  Absent: {historyAbsentCount}
                </span>
                <button
                  type="button"
                  onClick={exportHistoryPdf}
                  disabled={historyLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-yellow-400 bg-white px-4 py-1 text-xs font-semibold text-amber-700 shadow-sm transition-all duration-200 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <Download size={14} />
                  Export PDF
                </button>
              </div>
            </div>

            {historyError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {historyError}
              </p>
            )}

            <div
              className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-4"
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
              }}
            >
              <div className="overflow-x-auto">
                <div className="min-w-[560px] sm:min-w-[720px] md:min-w-[840px] lg:min-w-[980px]">
                  <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-600 sm:gap-2.5 sm:text-xs lg:gap-3 lg:text-sm">
                    {WEEKDAY_LABELS.map(label => (
                      <div key={label}>{label}</div>
                    ))}
                  </div>

                  <div className="mt-2 rounded-2xl bg-white sm:mt-3 max-h-[320px] sm:max-h-[420px] lg:max-h-[560px] overflow-y-auto pr-1">
                {historyLoading ? (
                  <p className="text-sm text-slate-500">Loading attendance...</p>
                ) : (
                  <div className="grid grid-cols-7 gap-2 rounded-2xl bg-white p-1 sm:gap-2.5 lg:gap-3">
                    {historyCalendarCells.map((cell, index) => {
                      if (cell.blank) {
                        return <div key={cell.key || `blank-${index}`} className="h-[84px] sm:h-[100px] lg:h-[120px] rounded-xl bg-white" style={{ backgroundColor: '#ffffff' }} />
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
                        ? 'border-emerald-200 bg-white'
                        : 'border-slate-200 bg-white'

                      const badgeTone = cell.status === 'Present'
                        ? 'border-emerald-300 bg-white text-emerald-700'
                        : 'border-slate-300 bg-white text-slate-700'

                      const titleParts = [`${cell.label}: ${cell.status}`]
                      if (timeInLabel) titleParts.push(`In: ${timeInLabel}`)
                      if (timeOutLabel) titleParts.push(`Out: ${timeOutLabel}`)

                      return (
                        <div
                          key={cell.dateKey || `day-${index}`}
                          className={`flex h-[84px] sm:h-[100px] lg:h-[120px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-2 sm:p-2.5 lg:p-3 ${tone} ${
                            isToday ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-white' : ''
                          }`}
                          style={{ boxShadow: '0 8px 18px rgba(15,23,42,0.04)', backgroundColor: '#ffffff', color: '#0f172a' }}
                          title={titleParts.join(' | ')}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-slate-900">{dayNumber}</span>
                            <span className={`inline-flex max-w-[64px] sm:max-w-[80px] lg:max-w-[92px] truncate rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${badgeTone}`}>
                              {cell.status}
                            </span>
                          </div>
                          {(timeInLabel || timeOutLabel) ? (
                            <div className="min-w-0 space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-slate-700">
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
                            <span className="text-[10px] sm:text-xs text-slate-500">No record</span>
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

