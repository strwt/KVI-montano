
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Activity,
  Flame,
  HeartPulse,
  Leaf,
  FileText,
  Filter,
  BarChart3,
  PieChart,
  Download,
  Search,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const CATEGORY_META = {
  environmental: { label: 'Environmental', icon: Leaf, light: 'bg-green-50', text: 'text-green-700' },
  'relief operation': { label: 'Relief Operation', icon: Activity, light: 'bg-blue-50', text: 'text-blue-700' },
  'fire response': { label: 'Fire Response', icon: Flame, light: 'bg-orange-50', text: 'text-orange-700' },
  notes: { label: 'Notes', icon: FileText, light: 'bg-indigo-50', text: 'text-indigo-700' },
  medical: { label: 'Medical', icon: HeartPulse, light: 'bg-pink-50', text: 'text-pink-700' },
}

const CATEGORY_KEYS = Object.keys(CATEGORY_META)

const CATEGORY_COLORS = {
  environmental: '#22c55e',
  'relief operation': '#3b82f6',
  'fire response': '#f97316',
  notes: '#6366f1',
  medical: '#ec4899',
}

const REPORT_COLUMNS = [
  { key: 'title', label: 'Event Title' },
  { key: 'content', label: 'Content' },
  { key: 'category', label: 'Category' },
  { key: 'branch', label: 'Field' },
  { key: 'membersInvolve', label: 'Members Involve' },
  { key: 'dateTime', label: 'Date and Time' },
  { key: 'address', label: 'Address' },
  { key: 'seedlingsUsed', label: 'Seedlings Used' },
  { key: 'foodPacks', label: 'Food Packs' },
  { key: 'familiesAccommodated', label: 'Families Accommodated' },
  { key: 'gallons', label: 'Gallons' },
  { key: 'tank', label: 'Tank' },
  { key: 'cubicWater', label: 'Cubic Water' },
  { key: 'respondedFireAccident', label: 'Responded Fire Accident' },
  { key: 'trainings', label: 'Trainings' },
  { key: 'medicalEquipmentUsed', label: 'Medical Equipment Used' },
  { key: 'expenses', label: 'Expenses' },
]

const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
})

const getStoredEvents = () => {
  const stored = localStorage.getItem('kusgan_events')
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeCategory = category => (category || '').toLowerCase()

const resolveEventDate = event => {
  const raw = event.dateTime || event.date || null
  if (!raw || !dayjs(raw).isValid()) return null
  return dayjs(raw)
}

const toNumber = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getFieldValue = (event, key, fallbackKeys = []) => {
  if (event?.categoryData && event.categoryData[key] !== undefined && event.categoryData[key] !== null && event.categoryData[key] !== '') {
    return event.categoryData[key]
  }
  for (const fallbackKey of fallbackKeys) {
    if (event?.[fallbackKey] !== undefined && event[fallbackKey] !== null && event[fallbackKey] !== '') {
      return event[fallbackKey]
    }
  }
  return ''
}

const getMostActiveMonthLabel = countByMonth => {
  const entries = Object.entries(countByMonth)
  if (entries.length === 0) return 'N/A'
  const [monthKey] = entries.sort((a, b) => b[1] - a[1])[0]
  return dayjs(`${monthKey}-01`).format('MMMM YYYY')
}

const getDateWindow = preset => {
  const now = dayjs()
  if (preset === 'monthly') return { start: now.startOf('month'), end: now.endOf('month') }
  if (preset === 'quarterly') {
    const quarterStartMonth = Math.floor(now.month() / 3) * 3
    const start = now.month(quarterStartMonth).startOf('month')
    const end = start.add(2, 'month').endOf('month')
    return { start, end }
  }
  if (preset === 'annually') return { start: now.startOf('year'), end: now.endOf('year') }
  return { start: null, end: null }
}

const escapeCsv = value => {
  const safe = String(value ?? '')
  if (safe.includes('"') || safe.includes(',') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

let jsPdfLoaderPromise = null
const loadJsPdf = () => {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF)
  if (jsPdfLoaderPromise) return jsPdfLoaderPromise

  jsPdfLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('jspdf-cdn')
    if (existing && window.jspdf?.jsPDF) {
      resolve(window.jspdf.jsPDF)
      return
    }
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'jspdf-cdn'
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
      script.async = true
      script.onload = () => resolve(window.jspdf?.jsPDF || null)
      script.onerror = () => reject(new Error('Failed to load PDF library'))
      document.body.appendChild(script)
      return
    }
    existing.addEventListener('load', () => resolve(window.jspdf?.jsPDF || null))
    existing.addEventListener('error', () => reject(new Error('Failed to load PDF library')))
  })

  return jsPdfLoaderPromise
}

function Report() {
  const { user } = useAuth()
  const [events, setEvents] = useState(getStoredEvents)
  const [datePreset, setDatePreset] = useState('monthly')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportingType, setExportingType] = useState('')

  const isAdmin = user?.role === 'admin'
  const { start, end } = getDateWindow(datePreset)

  const branchOptions = useMemo(() => {
    return Array.from(
      new Set(
        events
          .map(event => ({ ...event, _date: resolveEventDate(event), _category: normalizeCategory(event.category) }))
          .filter(event => Boolean(event._date) && CATEGORY_KEYS.includes(event._category))
          .filter(event => {
            if (selectedCategory !== 'all' && event._category !== selectedCategory) return false
            if (start && event._date.isBefore(start)) return false
            if (end && event._date.isAfter(end)) return false
            return Boolean(event.branch)
          })
          .map(event => event.branch)
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [events, selectedCategory, start, end])

  useEffect(() => {
    if (selectedBranch !== 'all' && !branchOptions.includes(selectedBranch)) {
      setSelectedBranch('all')
    }
  }, [branchOptions, selectedBranch])

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

  const filteredEvents = useMemo(() => {
    return events
      .map(event => ({ ...event, _date: resolveEventDate(event), _category: normalizeCategory(event.category) }))
      .filter(event => Boolean(event._date) && CATEGORY_KEYS.includes(event._category))
      .filter(event => {
        if (selectedCategory !== 'all' && event._category !== selectedCategory) return false
        if (selectedBranch !== 'all' && event.branch !== selectedBranch) return false
        if (start && event._date.isBefore(start)) return false
        if (end && event._date.isAfter(end)) return false

        const searchLower = searchQuery.toLowerCase().trim()
        if (!searchLower) return true

        const bucket = [
          event.title,
          event.content,
          event.address,
          event.membersInvolve,
          CATEGORY_META[event._category]?.label || event._category,
          ...Object.values(event.categoryData || {}),
        ]
          .join(' ')
          .toLowerCase()

        return bucket.includes(searchLower)
      })
  }, [events, selectedCategory, selectedBranch, start, end, searchQuery])

  const stats = useMemo(() => {
    const template = {
      environmental: { eventCount: 0, seedlingsUsed: 0, expenses: 0, monthlyCount: {} },
      'relief operation': { eventCount: 0, foodPacks: 0, familiesAccommodated: 0, expenses: 0, monthlyCount: {} },
      'fire response': { eventCount: 0, gallons: 0, tank: 0, cubicWater: 0, expenses: 0 },
      notes: { trainings: 0, monthlyTrainingCount: {}, monthlyEventCount: {} },
      medical: { eventCount: 0, medicalEquipmentUsed: 0, expenses: 0 },
    }

    filteredEvents.forEach(event => {
      const category = event._category
      const monthKey = event._date.format('YYYY-MM')

      if (category === 'environmental') {
        template.environmental.eventCount += 1
        template.environmental.seedlingsUsed += toNumber(getFieldValue(event, 'seedlingsUsed', ['seedlings']))
        template.environmental.expenses += toNumber(getFieldValue(event, 'expenses', ['expenses']))
        template.environmental.monthlyCount[monthKey] = (template.environmental.monthlyCount[monthKey] || 0) + 1
      }

      if (category === 'relief operation') {
        template['relief operation'].eventCount += 1
        template['relief operation'].foodPacks += toNumber(getFieldValue(event, 'foodPacks', ['foodPacks']))
        template['relief operation'].familiesAccommodated += toNumber(getFieldValue(event, 'familiesAccommodated', ['familiesAccommodated']))
        template['relief operation'].expenses += toNumber(getFieldValue(event, 'expenses', ['expenses']))
        template['relief operation'].monthlyCount[monthKey] = (template['relief operation'].monthlyCount[monthKey] || 0) + 1
      }

      if (category === 'fire response') {
        template['fire response'].eventCount += 1
        template['fire response'].gallons += toNumber(getFieldValue(event, 'gallons', ['gallonsWater']))
        template['fire response'].tank += toNumber(getFieldValue(event, 'tank', ['tankWater']))
        template['fire response'].cubicWater += toNumber(getFieldValue(event, 'cubicWater', ['cubicWater']))
        template['fire response'].expenses += toNumber(getFieldValue(event, 'expenses', ['expenses']))
      }

      if (category === 'notes') {
        const trainings = toNumber(getFieldValue(event, 'trainings', ['trainings']))
        template.notes.trainings += trainings
        template.notes.monthlyTrainingCount[monthKey] = (template.notes.monthlyTrainingCount[monthKey] || 0) + trainings
        template.notes.monthlyEventCount[monthKey] = (template.notes.monthlyEventCount[monthKey] || 0) + 1
      }

      if (category === 'medical') {
        template.medical.eventCount += 1
        const medicalField = getFieldValue(event, 'medicalEquipmentUsed', ['medicalEquipmentsUsed'])
        const asNumber = Number(medicalField)
        if (String(medicalField).trim() !== '') {
          if (Number.isFinite(asNumber)) template.medical.medicalEquipmentUsed += asNumber
          else template.medical.medicalEquipmentUsed += String(medicalField).split(',').map(x => x.trim()).filter(Boolean).length || 1
        }
        template.medical.expenses += toNumber(getFieldValue(event, 'expenses', ['expenses']))
      }
    })

    return template
  }, [filteredEvents])

  const eventCountByCategory = useMemo(() => {
    return CATEGORY_KEYS.reduce((acc, key) => {
      acc[key] = filteredEvents.filter(event => event._category === key).length
      return acc
    }, {})
  }, [filteredEvents])

  const reportRows = useMemo(() => {
    return filteredEvents.map(event => ({
      title: event.title || '',
      content: event.content || '',
      category: CATEGORY_META[event._category]?.label || event._category,
      branch: event.branch || '',
      membersInvolve: event.membersInvolve || '',
      dateTime: event._date.format('YYYY-MM-DD HH:mm'),
      address: event.address || '',
      seedlingsUsed: getFieldValue(event, 'seedlingsUsed', ['seedlings']),
      foodPacks: getFieldValue(event, 'foodPacks', ['foodPacks']),
      familiesAccommodated: getFieldValue(event, 'familiesAccommodated', ['familiesAccommodated']),
      gallons: getFieldValue(event, 'gallons', ['gallonsWater']),
      tank: getFieldValue(event, 'tank', ['tankWater']),
      cubicWater: getFieldValue(event, 'cubicWater', ['cubicWater']),
      respondedFireAccident: getFieldValue(event, 'respondedFireAccident', ['responseFireAccident']),
      trainings: getFieldValue(event, 'trainings', ['trainings']),
      medicalEquipmentUsed: getFieldValue(event, 'medicalEquipmentUsed', ['medicalEquipmentsUsed']),
      expenses: getFieldValue(event, 'expenses', ['expenses']),
    }))
  }, [filteredEvents])

  const distributionCategoryKeys = CATEGORY_KEYS.filter(key => key !== 'notes')
  const totalEvents = distributionCategoryKeys.reduce((sum, key) => sum + eventCountByCategory[key], 0)
  const categoryBarKeys = CATEGORY_KEYS.filter(key => key !== 'notes')
  const maxBarValue = Math.max(1, ...categoryBarKeys.map(key => eventCountByCategory[key]))
  const pieSegments = distributionCategoryKeys.map(key => {
    const value = eventCountByCategory[key]
    const percent = totalEvents > 0 ? (value / totalEvents) * 100 : 0
    return { key, value, percent }
  })

  const pieGradient = useMemo(() => {
    if (totalEvents === 0) return 'conic-gradient(#e5e7eb 0 100%)'
    let current = 0
    const pieces = pieSegments.map(segment => {
      const startPct = current
      const endPct = current + segment.percent
      current = endPct
      return `${CATEGORY_COLORS[segment.key]} ${startPct}% ${endPct}%`
    })
    return `conic-gradient(${pieces.join(', ')})`
  }, [pieSegments, totalEvents])

  const summaryLines = [
    `Total Environmental Events: ${stats.environmental.eventCount}`,
    `Total Seedlings Used: ${stats.environmental.seedlingsUsed}`,
    `Environmental Expenses: ${CURRENCY.format(stats.environmental.expenses)}`,
    `Total Relief Operations: ${stats['relief operation'].eventCount}`,
    `Total Food Packs Distributed: ${stats['relief operation'].foodPacks}`,
    `Total Families Accommodated: ${stats['relief operation'].familiesAccommodated}`,
    `Relief Expenses: ${CURRENCY.format(stats['relief operation'].expenses)}`,
    `Total Fire Responses: ${stats['fire response'].eventCount}`,
    `Total Gallons Used: ${stats['fire response'].gallons}`,
    `Total Tank Usage: ${stats['fire response'].tank}`,
    `Total Cubic Water: ${stats['fire response'].cubicWater}`,
    `Fire Response Expenses: ${CURRENCY.format(stats['fire response'].expenses)}`,
    `Total Trainings Conducted: ${stats.notes.trainings}`,
    `Most Active Training Month: ${getMostActiveMonthLabel(stats.notes.monthlyEventCount)}`,
    `Total Medical Events: ${stats.medical.eventCount}`,
    `Total Medical Equipment Used: ${stats.medical.medicalEquipmentUsed}`,
    `Medical Expenses: ${CURRENCY.format(stats.medical.expenses)}`,
  ]

  const downloadCsv = async () => {
    const filename = `kusgan_report_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    const lines = []
    lines.push('KUSGAN Report Export')
    lines.push(`Generated At,${dayjs().format('YYYY-MM-DD HH:mm:ss')}`)
    lines.push(`Date Filter,${datePreset}`)
    lines.push(`Category Filter,${selectedCategory}`)
    lines.push(`Field Filter,${selectedBranch}`)
    lines.push(`Search Query,${searchQuery || 'N/A'}`)
    lines.push('')
    lines.push('Summary Statistics')
    summaryLines.forEach(line => lines.push(escapeCsv(line)))
    lines.push('')
    lines.push(REPORT_COLUMNS.map(col => escapeCsv(col.label)).join(','))
    reportRows.forEach(row => {
      lines.push(REPORT_COLUMNS.map(col => escapeCsv(row[col.key])).join(','))
    })

    const csv = lines.join('\n')
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
  }

  const downloadDoc = async () => {
    const filename = `kusgan_report_${dayjs().format('YYYYMMDD_HHmmss')}.doc`
    const summaryHtml = summaryLines.map(line => `<li>${line}</li>`).join('')
    const headerHtml = REPORT_COLUMNS.map(col => `<th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">${col.label}</th>`).join('')
    const rowsHtml = reportRows
      .map(
        row =>
          `<tr>${REPORT_COLUMNS.map(col => `<td style="border:1px solid #ddd;padding:8px;vertical-align:top;">${String(row[col.key] ?? '')}</td>`).join('')}</tr>`
      )
      .join('')

    const html = `
      <html>
      <head><meta charset="utf-8" /><title>KUSGAN Report</title></head>
      <body style="font-family:Arial,sans-serif;">
        <h1>KUSGAN Report</h1>
        <p>Date Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
        <p>Filters - Date: ${datePreset}, Category: ${selectedCategory}, Field: ${selectedBranch}, Search: ${searchQuery || 'N/A'}</p>
        <h2>Summary Statistics</h2>
        <ul>${summaryHtml}</ul>
        <h2>Event Details</h2>
        <table style="border-collapse:collapse;width:100%;font-size:12px;">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      </html>
    `

    downloadBlob(new Blob([html], { type: 'application/msword' }), filename)
  }

  const downloadPdf = async () => {
    const JsPDF = await loadJsPdf()
    if (!JsPDF) throw new Error('PDF generator unavailable')

    const doc = new JsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 36
    let y = 42

    doc.setFontSize(18)
    doc.text('KUSGAN Report', margin, y)
    y += 18
    doc.setFontSize(10)
    doc.text(`Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, margin, y)
    y += 14
    doc.text(`Filters - Date: ${datePreset} | Category: ${selectedCategory} | Field: ${selectedBranch} | Search: ${searchQuery || 'N/A'}`, margin, y)
    y += 18

    doc.setFontSize(12)
    doc.text('Summary Statistics', margin, y)
    y += 12
    doc.setFontSize(9)
    summaryLines.forEach(line => {
      const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2)
      wrapped.forEach(textLine => {
        if (y > 780) {
          doc.addPage()
          y = 42
        }
        doc.text(`- ${textLine}`, margin, y)
        y += 11
      })
    })

    y += 10
    doc.setFontSize(12)
    doc.text('Event Details Table', margin, y)
    y += 12
    doc.setFontSize(8)

    const headers = ['Title', 'Category', 'Field', 'Date/Time', 'Address', 'Category Fields']
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, y, pageWidth - margin * 2, 18, 'F')
    headers.forEach((h, idx) => {
      const x = margin + [6, 110, 190, 260, 340, 460][idx]
      doc.text(h, x, y + 12)
    })
    y += 22

    reportRows.forEach(row => {
      const catFields = [
        row.seedlingsUsed ? `Seedlings:${row.seedlingsUsed}` : '',
        row.foodPacks ? `FoodPacks:${row.foodPacks}` : '',
        row.familiesAccommodated ? `Families:${row.familiesAccommodated}` : '',
        row.gallons ? `Gallons:${row.gallons}` : '',
        row.tank ? `Tank:${row.tank}` : '',
        row.cubicWater ? `Cubic:${row.cubicWater}` : '',
        row.respondedFireAccident ? `Fire:${row.respondedFireAccident}` : '',
        row.trainings ? `Trainings:${row.trainings}` : '',
        row.membersInvolve ? `Members:${row.membersInvolve}` : '',
        row.medicalEquipmentUsed ? `Medical:${row.medicalEquipmentUsed}` : '',
        row.expenses ? `Expenses:${row.expenses}` : '',
      ]
        .filter(Boolean)
        .join(' | ')

      const lines = [
        doc.splitTextToSize(row.title || '', 100),
        doc.splitTextToSize(row.category || '', 75),
        doc.splitTextToSize(row.branch || '', 65),
        doc.splitTextToSize(row.dateTime || '', 75),
        doc.splitTextToSize(row.address || '', 130),
        doc.splitTextToSize(catFields || '-', 95),
      ]
      const rowHeight = Math.max(...lines.map(arr => arr.length * 10)) + 6

      if (y + rowHeight > 800) {
        doc.addPage()
        y = 42
      }

      doc.rect(margin, y, pageWidth - margin * 2, rowHeight)
      const xPositions = [margin + 6, margin + 110, margin + 190, margin + 260, margin + 340, margin + 460]
      lines.forEach((cellLines, i) => {
        cellLines.forEach((line, lineIndex) => {
          doc.text(line, xPositions[i], y + 11 + lineIndex * 10)
        })
      })
      y += rowHeight
    })

    doc.save(`kusgan_report_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`)
  }

  const handleExport = async type => {
    if (!isAdmin || exportingType) return
    setShowExportMenu(false)
    setExportingType(type)

    try {
      if (type === 'csv') await downloadCsv()
      if (type === 'pdf') await downloadPdf()
      if (type === 'doc') await downloadDoc()
    } catch (error) {
      alert(error?.message || 'Failed to generate export.')
    } finally {
      setExportingType('')
    }
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl 2xl:max-w-[1500px] mx-auto">
      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 layout-glow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-red-600" />
            <h2 className="text-2xl font-bold text-gray-800">Report - Statistics Overview</h2>
          </div>
          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(prev => !prev)}
                disabled={Boolean(exportingType)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-60"
              >
                {exportingType ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {exportingType ? `Generating ${exportingType.toUpperCase()}...` : 'Download / Export'}
              </button>
              {showExportMenu && !exportingType && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <button type="button" onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Download as CSV</button>
                  <button type="button" onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Download as PDF</button>
                  <button type="button" onClick={() => handleExport('doc')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Download as DOC</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date Range</label>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value)
                setSelectedBranch('all')
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Categories</option>
              {CATEGORY_KEYS.filter(key => key !== 'notes').map(key => (
                <option key={key} value={key}>{CATEGORY_META[key].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Field</label>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Fields</option>
              {branchOptions.map(branch => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title, content, address, category..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 layout-glow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-red-600" />Events Per Category</h3>
          <div className="space-y-3">
            {categoryBarKeys.map(key => (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1"><span className="text-gray-600">{CATEGORY_META[key].label}</span><span className="font-semibold text-gray-800">{eventCountByCategory[key]}</span></div>
                <div className="w-full bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full transition-all duration-300" style={{ width: `${(eventCountByCategory[key] / maxBarValue) * 100}%`, backgroundColor: CATEGORY_COLORS[key] }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 layout-glow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><PieChart size={18} className="text-red-600" />Category Distribution</h3>
          <div className="flex flex-col items-center">
            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full mb-4" style={{ background: pieGradient }} />
            <div className="w-full space-y-2">
              {pieSegments.map(segment => (
                <div key={segment.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[segment.key] }} />{CATEGORY_META[segment.key].label}</span>
                  <span className="font-semibold text-gray-800">{segment.value} ({segment.percent.toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 layout-glow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Leaf size={18} className="text-green-600" />Environmental Statistics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><span>Total Environmental Events</span><strong>{stats.environmental.eventCount}</strong></div>
            <div className="flex flex-wrap justify-between gap-2"><span>Total Seedlings Used</span><strong>{stats.environmental.seedlingsUsed}</strong></div>
            <div className="flex flex-wrap justify-between gap-2"><span>Total Expenses</span><strong>{CURRENCY.format(stats.environmental.expenses)}</strong></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 layout-glow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-600" />Relief Operation Statistics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><span>Total Relief Operations</span><strong>{stats['relief operation'].eventCount}</strong></div>
            <div className="flex flex-wrap justify-between gap-2"><span>Total Food Packs Distributed</span><strong>{stats['relief operation'].foodPacks}</strong></div>
            <div className="flex flex-wrap justify-between gap-2"><span>Total Families Accommodated</span><strong>{stats['relief operation'].familiesAccommodated}</strong></div>
            <div className="flex flex-wrap justify-between gap-2"><span>Total Expenses</span><strong>{CURRENCY.format(stats['relief operation'].expenses)}</strong></div>
            <div className="flex flex-wrap justify-between gap-2"><span>Most Active Month</span><strong>{getMostActiveMonthLabel(stats['relief operation'].monthlyCount)}</strong></div>
          </div>
        </div>
      </div>

      {!isAdmin && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">Export feature is available to Admin users only.</div>}
    </div>
  )
}

export default Report
