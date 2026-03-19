
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Activity,
  Flame,
  HeartPulse,
  Leaf,
  FileText,
  Droplets,
  Filter,
  BarChart3,
  PieChart,
  Download,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { fetchSupabaseEvents, isSupabaseEnabled } from '../lib/supabaseEvents'

const CATEGORY_META = {
  tuli: { label: 'Tuli', icon: HeartPulse, light: 'bg-red-50', text: 'text-red-700' },
  blood_letting: { label: 'Blood Letting', icon: Activity, light: 'bg-red-50', text: 'text-red-700' },
  donations: { label: 'Donations', icon: FileText, light: 'bg-red-50', text: 'text-red-700' },
  environmental: { label: 'Environmental', icon: Leaf, light: 'bg-green-50', text: 'text-green-700' },
  relief_operation: { label: 'Relief Operation', icon: Activity, light: 'bg-blue-50', text: 'text-blue-700' },
  fire_response: { label: 'Fire Response', icon: Flame, light: 'bg-orange-50', text: 'text-orange-700' },
  water_distribution: { label: 'Water Distribution', icon: Droplets, light: 'bg-red-50', text: 'text-red-700' },
  notes: { label: 'Notes', icon: FileText, light: 'bg-indigo-50', text: 'text-indigo-700' },
  medical: { label: 'Medical', icon: HeartPulse, light: 'bg-pink-50', text: 'text-pink-700' },
}

const CATEGORY_COLORS = {
  tuli: '#ef4444',
  blood_letting: '#dc2626',
  donations: '#b91c1c',
  environmental: '#22c55e',
  relief_operation: '#3b82f6',
  fire_response: '#f97316',
  water_distribution: '#f43f5e',
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
  { key: 'partners', label: 'Partners' },
  { key: 'tuli_children_count', label: 'Tuli Children Count' },
  { key: 'tuli_residing_doctors', label: 'Tuli Residing Doctors' },
  { key: 'blood_bags_count', label: 'Blood Bags Count' },
  { key: 'blood_successful_donors', label: 'Successful Donors' },
  { key: 'blood_token', label: 'Blood Token' },
  { key: 'donation_request', label: 'Donation Request' },
  { key: 'env_trees_planted', label: 'Trees Planted' },
  { key: 'relief_families_count', label: 'Relief Families Count' },
  { key: 'relief_items', label: 'Relief Items' },
  { key: 'fire_alarm_status', label: 'Fire Alarm Status' },
  { key: 'fire_affected_families', label: 'Affected Families' },
  { key: 'fire_estimated_cost', label: 'Estimated Cost' },
  { key: 'fire_liters', label: 'Fire Liters' },
  { key: 'water_liters', label: 'Water Liters' },
  { key: 'water_households', label: 'Water Households' },
  { key: 'water_employees', label: 'Water Employees' },
  { key: 'water_engine', label: 'Water Engine' },
  { key: 'medicalEquipmentUsed', label: 'Medical Equipment Used' },
  { key: 'expenses', label: 'Expenses' },
]

const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
})

const normalizeCategory = category =>
  String(category || '')
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
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1))

const hashColor = key => {
  const input = String(key || '')
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 360
  }
  return `hsl(${hash} 70% 45%)`
}

const getCategoryColor = key => CATEGORY_COLORS[key] || hashColor(key) || '#94a3b8'

const splitPipe = value =>
  String(value || '')
    .split('|')
    .map(x => x.trim())
    .filter(Boolean)

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
  const { user, eventCategories } = useAuth()
  const supabaseEnabled = isSupabaseEnabled()
  const [events, setEvents] = useState([])
  const [datePreset, setDatePreset] = useState('monthly')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportingType, setExportingType] = useState('')

  const isAdmin = user?.role === 'admin'
  const { start, end } = getDateWindow(datePreset)

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
      .channel('kusgan-events-report')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => load())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabaseEnabled, user?.id])

  const baseEvents = useMemo(() => {
    return events
      .map(event => ({
        ...event,
        _date: resolveEventDate(event),
        _category: canonicalizeOperationKey(normalizeCategory(event.category)),
      }))
      .filter(event => event.status === 'done')
      .filter(event => {
        if (start && event._date.isBefore(start)) return false
        if (end && event._date.isAfter(end)) return false
        return true
      })
  }, [events, start, end])

  const categoryLabelByKey = useMemo(() => {
    const map = {}
    Object.keys(CATEGORY_META).forEach(key => {
      map[key] = CATEGORY_META[key]?.label || titleCaseFromKey(key)
    })
    const entries = Array.isArray(eventCategories) ? eventCategories : []
    entries.forEach(entry => {
      const key = canonicalizeOperationKey(normalizeCategory(entry?.key))
      const label = String(entry?.label || '').trim()
      if (!key || !label) return
      map[key] = label
    })
    return map
  }, [eventCategories])

  const getCategoryLabel = (value) => {
    const key = canonicalizeOperationKey(normalizeCategory(value))
    if (!key) return 'Uncategorized'
    return categoryLabelByKey[key] || titleCaseFromKey(key) || 'Uncategorized'
  }

  const availableCategoryKeys = useMemo(() => {
    const set = new Set(Object.keys(categoryLabelByKey))
    baseEvents.forEach(event => {
      if (event._category) set.add(event._category)
    })
    const getLabel = (key) => categoryLabelByKey[key] || titleCaseFromKey(key) || 'Uncategorized'
    return Array.from(set).sort((a, b) => getLabel(a).localeCompare(getLabel(b)))
  }, [baseEvents, categoryLabelByKey])

  useEffect(() => {
    if (selectedCategory === 'all') return
    if (!availableCategoryKeys.includes(selectedCategory)) setSelectedCategory('all')
  }, [availableCategoryKeys, selectedCategory])

  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'all') return baseEvents
    return baseEvents.filter(event => event._category === selectedCategory)
  }, [baseEvents, selectedCategory])

  const stats = useMemo(() => {
    const template = {
      tuli: { eventCount: 0, tuliChildrenCount: 0 },
      blood_letting: {
        eventCount: 0,
        bloodBagsCount: 0,
        bloodSuccessfulDonors: 0,
        bloodTokenCount: 0,
        bloodTokenCounts: {},
      },
      donations: { eventCount: 0 },
      environmental: { eventCount: 0, envTreesPlanted: 0 },
      relief_operation: { eventCount: 0, reliefFamiliesCount: 0, reliefItems: { grocery: 0, hygiene_kit: 0, both: 0 } },
      fire_response: { eventCount: 0, fireAffectedFamilies: 0, fireEstimatedCost: 0, fireLiters: 0 },
      water_distribution: { eventCount: 0, waterLiters: 0, waterHouseholds: 0 },
      notes: { trainings: 0, monthlyTrainingCount: {}, monthlyEventCount: {} },
      medical: { eventCount: 0, medicalEquipmentUsed: 0, expenses: 0 },
    }

    filteredEvents.forEach(event => {
      const category = event._category
      const monthKey = event._date.format('YYYY-MM')

      if (category === 'tuli') {
        template.tuli.eventCount += 1
        template.tuli.tuliChildrenCount += toNumber(getFieldValue(event, 'tuli_children_count'))
      }

      if (category === 'blood_letting') {
        template.blood_letting.eventCount += 1
        template.blood_letting.bloodBagsCount += toNumber(getFieldValue(event, 'blood_bags_count'))
        template.blood_letting.bloodSuccessfulDonors += toNumber(getFieldValue(event, 'blood_successful_donors'))
        const tokens = splitPipe(getFieldValue(event, 'blood_token'))
        template.blood_letting.bloodTokenCount += tokens.length
        tokens.forEach(token => {
          const normalized = token.toLowerCase()
          template.blood_letting.bloodTokenCounts[normalized] =
            (template.blood_letting.bloodTokenCounts[normalized] || 0) + 1
        })
      }

      if (category === 'donations') {
        template.donations.eventCount += 1
      }

      if (category === 'environmental') {
        template.environmental.eventCount += 1
        template.environmental.envTreesPlanted += toNumber(getFieldValue(event, 'env_trees_planted'))
      }

      if (category === 'relief_operation') {
        template.relief_operation.eventCount += 1
        template.relief_operation.reliefFamiliesCount += toNumber(getFieldValue(event, 'relief_families_count'))
        const items = String(getFieldValue(event, 'relief_items')).trim().toLowerCase()
        if (items && template.relief_operation.reliefItems[items] !== undefined) {
          template.relief_operation.reliefItems[items] += 1
        }
      }

      if (category === 'fire_response') {
        template.fire_response.eventCount += 1
        template.fire_response.fireAffectedFamilies += toNumber(getFieldValue(event, 'fire_affected_families'))
        template.fire_response.fireEstimatedCost += toNumber(getFieldValue(event, 'fire_estimated_cost'))
        template.fire_response.fireLiters += toNumber(getFieldValue(event, 'fire_liters'))
      }

      if (category === 'water_distribution') {
        template.water_distribution.eventCount += 1
        template.water_distribution.waterLiters += toNumber(getFieldValue(event, 'water_liters'))
        template.water_distribution.waterHouseholds += toNumber(getFieldValue(event, 'water_households'))
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

  const bloodTokenRows = useMemo(() => {
    const entries = Object.entries(stats.blood_letting.bloodTokenCounts || {})
      .filter(([, count]) => Number(count) > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    return entries.map(([token, count]) => ({ token, count }))
  }, [stats.blood_letting.bloodTokenCounts])

  const eventCountByCategory = useMemo(() => {
    const counts = {}
    availableCategoryKeys.forEach(key => {
      counts[key] = 0
    })
    filteredEvents.forEach(event => {
      const key = event._category || 'uncategorized'
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }, [filteredEvents, availableCategoryKeys])

  const chartCategoryKeys = availableCategoryKeys

  const reportRows = useMemo(() => {
    return filteredEvents.map(event => ({
      title: event.title || '',
      content: event.content || '',
      category: categoryLabelByKey[event._category] || titleCaseFromKey(event._category) || 'Uncategorized',
      branch: event.branch || '',
      membersInvolve: event.membersInvolve || '',
      dateTime: event._date.format('YYYY-MM-DD HH:mm'),
      address: event.address || '',
      partners: getFieldValue(event, 'partners'),
      tuli_children_count: getFieldValue(event, 'tuli_children_count'),
      tuli_residing_doctors: getFieldValue(event, 'tuli_residing_doctors'),
      blood_bags_count: getFieldValue(event, 'blood_bags_count'),
      blood_successful_donors: getFieldValue(event, 'blood_successful_donors'),
      blood_token: getFieldValue(event, 'blood_token'),
      donation_request: getFieldValue(event, 'donation_request'),
      env_trees_planted: getFieldValue(event, 'env_trees_planted'),
      relief_families_count: getFieldValue(event, 'relief_families_count'),
      relief_items: getFieldValue(event, 'relief_items'),
      fire_alarm_status: getFieldValue(event, 'fire_alarm_status'),
      fire_affected_families: getFieldValue(event, 'fire_affected_families'),
      fire_estimated_cost: getFieldValue(event, 'fire_estimated_cost'),
      fire_liters: getFieldValue(event, 'fire_liters'),
      water_liters: getFieldValue(event, 'water_liters'),
      water_households: getFieldValue(event, 'water_households'),
      water_employees: getFieldValue(event, 'water_employees'),
      water_engine: getFieldValue(event, 'water_engine'),
      medicalEquipmentUsed: getFieldValue(event, 'medicalEquipmentUsed', ['medicalEquipmentsUsed']),
      expenses: getFieldValue(event, 'expenses', ['expenses']),
    }))
  }, [filteredEvents, categoryLabelByKey])

  const totalEvents = chartCategoryKeys.reduce((sum, key) => sum + (eventCountByCategory[key] || 0), 0)
  const maxBarValue = useMemo(() => {
    if (chartCategoryKeys.length === 0) return 1
    return Math.max(1, ...chartCategoryKeys.map(key => eventCountByCategory[key] || 0))
  }, [chartCategoryKeys, eventCountByCategory])

  const pieSegments = chartCategoryKeys.map(key => {
    const value = eventCountByCategory[key] || 0
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
      return `${getCategoryColor(segment.key)} ${startPct}% ${endPct}%`
    })
    return `conic-gradient(${pieces.join(', ')})`
  }, [pieSegments, totalEvents])

  const summaryLines = [
    `Total Tuli Activities: ${stats.tuli.eventCount}`,
    `Total Tuli Children Count: ${stats.tuli.tuliChildrenCount}`,
    `Total Blood Letting Activities: ${stats.blood_letting.eventCount}`,
    `Total Blood Bags Count: ${stats.blood_letting.bloodBagsCount}`,
    `Total Successful Donors: ${stats.blood_letting.bloodSuccessfulDonors}`,
    `Total Blood Tokens: ${stats.blood_letting.bloodTokenCount}`,
    `Total Donation Activities: ${stats.donations.eventCount}`,
    `Total Environmental Activities: ${stats.environmental.eventCount}`,
    `Total Trees Planted: ${stats.environmental.envTreesPlanted}`,
    `Total Relief Operations: ${stats.relief_operation.eventCount}`,
    `Total Relief Families Count: ${stats.relief_operation.reliefFamiliesCount}`,
    `Relief Items Grocery: ${stats.relief_operation.reliefItems.grocery}`,
    `Relief Items Hygiene Kit: ${stats.relief_operation.reliefItems.hygiene_kit}`,
    `Relief Items Both: ${stats.relief_operation.reliefItems.both}`,
    `Total Fire Responses: ${stats.fire_response.eventCount}`,
    `Total Affected Families: ${stats.fire_response.fireAffectedFamilies}`,
    `Total Estimated Cost: ${stats.fire_response.fireEstimatedCost}`,
    `Total Fire Liters: ${stats.fire_response.fireLiters}`,
    `Total Water Distributions: ${stats.water_distribution.eventCount}`,
    `Total Water Liters: ${stats.water_distribution.waterLiters}`,
    `Total Water Households: ${stats.water_distribution.waterHouseholds}`,
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
        <p>Filters - Date: ${datePreset}, Category: ${selectedCategory}</p>
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
    doc.text(`Filters - Date: ${datePreset} | Category: ${selectedCategory}`, margin, y)
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
    <div className="animate-fade-in space-y-6 max-w-7xl 2xl:max-w-[1500px] mx-auto text-gray-700 dark:text-zinc-300">
      <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md p-5 border border-red-600 layout-glow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-red-600" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">Report - Statistics Overview</h2>
          </div>
          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(prev => !prev)}
                disabled={Boolean(exportingType)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {exportingType ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {exportingType ? `Generating ${exportingType.toUpperCase()}...` : 'Download / Export'}
              </button>
              {showExportMenu && !exportingType && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-20">
                  <button type="button" onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800">Download as CSV</button>
                  <button type="button" onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800">Download as PDF</button>
                  <button type="button" onClick={() => handleExport('doc')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800">Download as DOC</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Date Range</label>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-gray-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Category</label>
	            <select
	              value={selectedCategory}
	              onChange={e => setSelectedCategory(e.target.value)}
	              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-gray-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
	            >
	              <option value="all">All Categories</option>
	              {availableCategoryKeys.map(key => (
	                <option key={key} value={key}>{getCategoryLabel(key)}</option>
	              ))}
	            </select>
	          </div>
	        </div>
	        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
	        <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
	          <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-red-600" />Events Per Category</h3>
	          <div className="space-y-3">
	            {chartCategoryKeys.map(key => (
	              <div key={key}>
	                <div className="flex items-center justify-between text-sm mb-1"><span className="text-gray-600 dark:text-zinc-400">{getCategoryLabel(key)}</span><span className="font-semibold text-gray-800 dark:text-zinc-100">{eventCountByCategory[key] || 0}</span></div>
	                <div className="w-full bg-gray-100 dark:bg-zinc-700 rounded-full h-2"><div className="h-2 rounded-full transition-all duration-300" style={{ width: `${((eventCountByCategory[key] || 0) / maxBarValue) * 100}%`, backgroundColor: getCategoryColor(key) }} /></div>
	              </div>
	            ))}
	          </div>
	        </div>

        <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><PieChart size={18} className="text-red-600" />Category Distribution</h3>
          <div className="flex flex-col items-center">
            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full mb-4" style={{ background: pieGradient }} />
	            <div className="w-full space-y-2">
	              {pieSegments.map(segment => (
	                <div key={segment.key} className="flex items-center justify-between text-sm">
	                  <span className="flex items-center gap-2 text-gray-600 dark:text-zinc-400"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: getCategoryColor(segment.key) }} />{getCategoryLabel(segment.key)}</span>
	                  <span className="font-semibold text-gray-800 dark:text-zinc-100">{segment.value} ({segment.percent.toFixed(1)}%)</span>
	                </div>
	              ))}
	            </div>
	          </div>
	        </div>

      </div>

	      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
	        <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
	          <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><HeartPulse size={18} className="text-red-600" />Tuli Statistics</h3>
	          <div className="space-y-2 text-sm">
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Tuli Activities</span><strong>{stats.tuli.eventCount}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Children Count</span><strong>{stats.tuli.tuliChildrenCount}</strong></div>
	          </div>
	        </div>

	        <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
	          <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><Activity size={18} className="text-red-600" />Blood Letting Statistics</h3>
	          <div className="space-y-2 text-sm">
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Blood Letting Activities</span><strong>{stats.blood_letting.eventCount}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Blood Bags</span><strong>{stats.blood_letting.bloodBagsCount}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Successful Donors</span><strong>{stats.blood_letting.bloodSuccessfulDonors}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Tokens</span><strong>{stats.blood_letting.bloodTokenCount}</strong></div>
	            <div className="pt-2 border-t border-gray-200 dark:border-zinc-700">
	              <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-2">Token Totals</p>
	              {bloodTokenRows.length > 0 ? (
	                <div className="space-y-1">
	                  {bloodTokenRows.map(row => (
	                    <div key={row.token} className="flex flex-wrap justify-between gap-2">
	                      <span className="capitalize">{row.token}</span>
	                      <strong>{row.count}</strong>
	                    </div>
	                  ))}
	                </div>
	              ) : (
	                <p className="text-xs text-gray-500 dark:text-zinc-400">No tokens recorded for this filter.</p>
	              )}
	            </div>
	          </div>
	        </div>

	        <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
	          <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><FileText size={18} className="text-red-600" />Donations Statistics</h3>
	          <div className="space-y-2 text-sm">
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Donation Activities</span><strong>{stats.donations.eventCount}</strong></div>
	          </div>
	        </div>

	        <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
	          <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><Leaf size={18} className="text-green-600" />Environmental Statistics</h3>
	          <div className="space-y-2 text-sm">
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Environmental Activities</span><strong>{stats.environmental.eventCount}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Trees Planted</span><strong>{stats.environmental.envTreesPlanted}</strong></div>
	          </div>
	        </div>

	        <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
	          <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-600" />Relief Operation Statistics</h3>
	          <div className="space-y-2 text-sm">
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Relief Operations</span><strong>{stats.relief_operation.eventCount}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Families Count</span><strong>{stats.relief_operation.reliefFamiliesCount}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Items: Grocery</span><strong>{stats.relief_operation.reliefItems.grocery}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Items: Hygiene Kit</span><strong>{stats.relief_operation.reliefItems.hygiene_kit}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Items: Both</span><strong>{stats.relief_operation.reliefItems.both}</strong></div>
	          </div>
	        </div>

	        <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
	          <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><Flame size={18} className="text-orange-600" />Fire Response Statistics</h3>
	          <div className="space-y-2 text-sm">
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Fire Responses</span><strong>{stats.fire_response.eventCount}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Affected Families</span><strong>{stats.fire_response.fireAffectedFamilies}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Estimated Cost</span><strong>{stats.fire_response.fireEstimatedCost}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Liters Used</span><strong>{stats.fire_response.fireLiters}</strong></div>
	          </div>
	        </div>

	        <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
	          <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><Droplets size={18} className="text-red-600" />Water Distribution Statistics</h3>
	          <div className="space-y-2 text-sm">
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Water Distributions</span><strong>{stats.water_distribution.eventCount}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Liters</span><strong>{stats.water_distribution.waterLiters}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Households</span><strong>{stats.water_distribution.waterHouseholds}</strong></div>
	          </div>
	        </div>

	        <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
	          <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><HeartPulse size={18} className="text-pink-600" />Medical Statistics</h3>
	          <div className="space-y-2 text-sm">
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Medical Events</span><strong>{stats.medical.eventCount}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Medical Equipment Used</span><strong>{stats.medical.medicalEquipmentUsed}</strong></div>
	            <div className="flex flex-wrap justify-between gap-2"><span>Total Expenses</span><strong>{CURRENCY.format(stats.medical.expenses)}</strong></div>
	          </div>
	        </div>
	      </div>

      {!isAdmin && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">Export feature is available to Admin users only.</div>}
    </div>
  )
}

export default Report
