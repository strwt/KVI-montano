
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
	} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchSupabaseEvents, invalidateSupabaseEventsCache, isSupabaseEnabled } from '../lib/supabaseEvents'
import { supabase } from '../lib/supabaseClient'

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

const BASE_REPORT_COLUMNS = [
  { key: 'title', label: 'Event Title' },
  { key: 'content', label: 'Content' },
  { key: 'category', label: 'Category' },
  { key: 'branch', label: 'Field' },
  { key: 'membersInvolve', label: 'Members Involve' },
  { key: 'dateTime', label: 'Date and Time' },
  { key: 'address', label: 'Address' },
]

const FIELD_LABELS = {
  partners: 'Partners',
  tuli_children_count: 'Tuli Children Count',
  tuli_residing_doctors: 'Tuli Residing Doctors',
  blood_bags_count: 'Blood Bags Count',
  blood_successful_donors: 'Successful Donors',
  blood_token: 'Blood Token',
  donation_request: 'Donation Request',
  env_trees_planted: 'Trees Planted',
  relief_families_count: 'Relief Families Count',
  relief_items: 'Relief Items',
  fire_alarm_status: 'Fire Alarm Status',
  fire_affected_families: 'Affected Families',
  fire_estimated_cost: 'Estimated Cost',
  fire_liters: 'Fire Liters',
  water_liters: 'Water Liters',
  water_households: 'Water Households',
  water_employees: 'Water Employees',
  water_engine: 'Water Engine',
  medicalEquipmentUsed: 'Medical Equipment Used',
  medicalEquipmentsUsed: 'Medical Equipment Used',
  expenses: 'Expenses',
}

const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
})

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const formatNumber = (value) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return '-'
  return NUMBER_FORMAT.format(numeric)
}

const CATEGORY_DATA_EXCLUDE_KEYS = new Set([
  'activity_record_id',
  'contributormemberids',
  'contributor_member_ids',
  'partners',
  'blood_token',
])

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

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
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()

const getFieldLabel = (key) => FIELD_LABELS[key] || titleCaseFromKey(key)

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
  const raw = event.completedAt || event.dateTime || event.date || null
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

		const getDateWindow = (preset, monthValue) => {
		  const now = dayjs()
		  if (preset === 'monthly') {
	    const baseMonth = typeof monthValue === 'string' && /^\d{4}-\d{2}$/.test(monthValue)
	      ? dayjs(`${monthValue}-01`)
	      : now
	    return { start: baseMonth.startOf('month'), end: baseMonth.endOf('month'), label: baseMonth.format('MMMM YYYY') }
	  }
	  if (preset === 'quarterly') {
	    const quarterStartMonth = Math.floor(now.month() / 3) * 3
	    const start = now.month(quarterStartMonth).startOf('month')
	    const end = start.add(2, 'month').endOf('month')
	    return { start, end, label: `${start.format('MMM YYYY')} - ${end.format('MMM YYYY')}` }
	  }
	  if (preset === 'annually') {
	    const start = now.startOf('year')
	    const end = now.endOf('year')
	    return { start, end, label: start.format('YYYY') }
		  }
		  return { start: null, end: null, label: '' }
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
  const { user, categories } = useAuth()
  const supabaseEnabled = isSupabaseEnabled()
	  const [events, setEvents] = useState([])
		  const [typedStats, setTypedStats] = useState({ loading: false, error: '', byCategory: {} })
		  const [datePreset, setDatePreset] = useState('monthly')
		  const [reportMonth, setReportMonth] = useState(() => dayjs().format('YYYY-MM'))
		  const [selectedCategory, setSelectedCategory] = useState('all')
		  const [_showExportMenu, setShowExportMenu] = useState(false)
		  const [exportingType, setExportingType] = useState('')

	  const isAdmin = user?.role === 'admin'
	  const { start, end, label: dateWindowLabel } = useMemo(
	    () => getDateWindow(datePreset, reportMonth),
	    [datePreset, reportMonth]
	  )

  const categoriesFromDb = useMemo(() => {
    const entries = Array.isArray(categories) ? categories : []
    const map = new Map()
    entries.forEach(name => {
      const label = String(name || '').trim()
      if (!label) return
      const key = canonicalizeOperationKey(normalizeCategory(label))
      if (!key) return
      if (!map.has(key)) map.set(key, titleCaseFromKey(label))
    })
    return map
  }, [categories])

  const categoryKeysFromDb = useMemo(() => {
    return [...categoriesFromDb.keys()]
  }, [categoriesFromDb])

  const categoryKeySetFromDb = useMemo(() => {
    return new Set(categoryKeysFromDb)
  }, [categoryKeysFromDb])

  useEffect(() => {
    if (!user?.id) {
      setEvents([])
      return
    }

    let active = true

    const load = async () => {
      invalidateSupabaseEventsCache()
      const { data } = await fetchSupabaseEvents({ force: true })
      if (!active) return
      setEvents(data)
    }

    void load()

    return () => {
      active = false
    }
  }, [supabaseEnabled, user?.id])

  const baseEvents = useMemo(() => {
    return events
      .map(event => ({
        ...event,
        _date: resolveEventDate(event),
        _category: (() => {
          const key = canonicalizeOperationKey(normalizeCategory(event.category))
          if (!key) return 'uncategorized'
          if (categoryKeySetFromDb.size > 0 && !categoryKeySetFromDb.has(key)) return 'uncategorized'
          return key
        })(),
      }))
      .filter(event => Boolean(event._date))
      .filter(event => event.status === 'done')
      .filter(event => {
        if (start && event._date.isBefore(start)) return false
        if (end && event._date.isAfter(end)) return false
        return true
      })
  }, [categoryKeySetFromDb, events, start, end])

	  const filteredEvents = useMemo(() => {
	    if (selectedCategory === 'all') return baseEvents
	    return baseEvents.filter(event => event._category === selectedCategory)
	  }, [baseEvents, selectedCategory])

	  const entryEvents = selectedCategory === 'all' ? baseEvents : filteredEvents

	  const numericKeysByCategory = useMemo(() => {
	    const map = new Map()

	    entryEvents.forEach(event => {
	      const categoryKey = String(event?._category || 'uncategorized')
	      if (!map.has(categoryKey)) map.set(categoryKey, new Set())

	      const data = event?.categoryData && typeof event.categoryData === 'object' ? event.categoryData : null
	      if (!data) return

	      Object.entries(data).forEach(([rawKey, rawValue]) => {
	        const key = String(rawKey || '').trim()
	        if (!key) return
	        if (CATEGORY_DATA_EXCLUDE_KEYS.has(key.toLowerCase())) return

	        const numeric = toFiniteNumberOrNull(rawValue)
	        if (numeric === null) return

	        map.get(categoryKey).add(key)
	      })
	    })

	    const out = new Map()
	    map.forEach((set, categoryKey) => {
	      const keys = [...set]
	      keys.sort((a, b) => getFieldLabel(a).localeCompare(getFieldLabel(b)))
	      out.set(categoryKey, keys)
	    })
	    return out
	  }, [entryEvents])

	  const entryEventsByCategory = useMemo(() => {
	    const map = new Map()
	    entryEvents.forEach(event => {
	      const categoryKey = String(event?._category || 'uncategorized')
	      if (!map.has(categoryKey)) map.set(categoryKey, [])
	      map.get(categoryKey).push(event)
	    })
	    map.forEach(list => {
	      list.sort((a, b) => {
	        const aTime = a?._date?.valueOf?.() || 0
	        const bTime = b?._date?.valueOf?.() || 0
	        return bTime - aTime
	      })
	    })
	    return map
	  }, [entryEvents])

  const categoryLabelByKey = useMemo(() => {
    const map = {}
    for (const [key, label] of categoriesFromDb.entries()) {
      map[key] = label
    }
    map.uncategorized = 'Uncategorized'
    return map
  }, [categoriesFromDb])

		  const getCategoryLabel = (value) => {
		    const key = canonicalizeOperationKey(normalizeCategory(value))
		    if (!key) return categoryLabelByKey.uncategorized || 'Uncategorized'
		    return categoryLabelByKey[key] || categoryLabelByKey.uncategorized || 'Uncategorized'
		  }

		  const renderTypedTotals = (categoryKey) => {
		    if (!supabaseEnabled || !supabase || !isAdmin) return null
		    if (typedStats.error) {
		      return (
		        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
		          {typedStats.error}
		        </div>
		      )
		    }
		    if (typedStats.loading) {
		      return <div className="mt-3 text-[12px] text-gray-500 dark:text-zinc-400">Loading typed activity totals…</div>
		    }

		    const entry = typedStats.byCategory?.[categoryKey]
		    if (!entry) return null

		    const numericEntries = Object.entries(entry.numericSums || {}).sort((a, b) => a[0].localeCompare(b[0]))
		    if ((entry.eventCount || 0) === 0 && numericEntries.length === 0) return null

		    return (
		      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-700 space-y-2 text-sm">
		        <div className="flex flex-wrap justify-between gap-2">
		          <span>Typed Activities</span>
		          <strong>{formatNumber(entry.eventCount || 0)}</strong>
		        </div>
		        {numericEntries.map(([label, total]) => (
		          <div key={`sum-${categoryKey}-${label}`} className="flex flex-wrap justify-between gap-2">
		            <span>Total {label}</span>
		            <strong>{formatNumber(total)}</strong>
		          </div>
		        ))}
		      </div>
		    )
		  }

		  const typedStatsRecordFingerprint = useMemo(() => {
		    const recordUseCount = new Map()
		    filteredEvents.forEach(event => {
	      const recordId = String(event?.categoryData?.activity_record_id || '').trim()
	      if (!recordId) return
	      recordUseCount.set(recordId, (recordUseCount.get(recordId) || 0) + 1)
	    })

	    const entries = Array.from(recordUseCount.entries())
	      .filter(([recordId]) => Boolean(recordId))
	      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
	      .slice(0, 500)

	    const fingerprint = entries.map(([recordId, count]) => `${recordId}:${count}`).join('|')

	    return fingerprint
	  }, [filteredEvents])

	  useEffect(() => {
	    if (!supabaseEnabled || !supabase || !isAdmin) {
	      setTypedStats({ loading: false, error: '', byCategory: {} })
	      return undefined
	    }

	    const recordPairs = typedStatsRecordFingerprint
	      ? typedStatsRecordFingerprint.split('|').map(entry => {
	          const [recordId, countRaw] = entry.split(':')
	          const recordCount = Number.parseInt(countRaw, 10)
	          return [recordId, Number.isFinite(recordCount) ? recordCount : 0]
	        })
	      : []

	    const recordIds = recordPairs.map(([recordId]) => recordId)
	    const recordUseCount = new Map(recordPairs)
	    if (recordIds.length === 0) {
	      setTypedStats({ loading: false, error: '', byCategory: {} })
	      return undefined
	    }

    let active = true

    const load = async () => {
      setTypedStats(prev => ({ ...prev, loading: true, error: '' }))
      try {
        const { data: records, error: recordError } = await supabase
          .from('activity_records')
          .select('id,category_id')
          .in('id', recordIds)

        if (recordError) throw recordError

        const recordCategoryIdById = new Map()
        const categoryIds = new Set()
        ;(Array.isArray(records) ? records : []).forEach(row => {
          const recordId = String(row?.id || '').trim()
          const categoryId = String(row?.category_id || '').trim()
          if (!recordId || !categoryId) return
          recordCategoryIdById.set(recordId, categoryId)
          categoryIds.add(categoryId)
        })

        if (categoryIds.size === 0) {
          if (!active) return
          setTypedStats({ loading: false, error: '', byCategory: {} })
          return
        }

        const { data: categoryRows, error: categoryError } = await supabase
          .from('categories')
          .select('id,name')
          .in('id', Array.from(categoryIds))

        if (categoryError) throw categoryError

        const categoryKeyById = new Map()
        ;(Array.isArray(categoryRows) ? categoryRows : []).forEach(row => {
          const id = String(row?.id || '').trim()
          const name = String(row?.name || '').trim()
          if (!id || !name) return
          categoryKeyById.set(id, canonicalizeOperationKey(normalizeCategory(name)) || name)
        })

        const { data: values, error: valuesError } = await supabase
          .from('activity_values')
          .select('record_id,field_id,value_text,value_number,value_date,value_boolean')
          .in('record_id', recordIds)

        if (valuesError) throw valuesError

        const fieldIds = new Set()
        ;(Array.isArray(values) ? values : []).forEach(row => {
          const fieldId = String(row?.field_id || '').trim()
          if (fieldId) fieldIds.add(fieldId)
        })

        const fieldMetaById = new Map()
        if (fieldIds.size > 0) {
          const { data: fields, error: fieldsError } = await supabase
            .from('category_fields')
            .select('id,field_name,field_type')
            .in('id', Array.from(fieldIds))

          if (fieldsError) throw fieldsError

          ;(Array.isArray(fields) ? fields : []).forEach(field => {
            const id = String(field?.id || '').trim()
            const name = String(field?.field_name || '').trim()
            const type = String(field?.field_type || '').trim()
            if (!id || !name || !type) return
            fieldMetaById.set(id, { name, type })
          })
        }

        const byCategory = {}

        recordCategoryIdById.forEach((categoryId, recordId) => {
          const categoryKey = categoryKeyById.get(categoryId)
          if (!categoryKey) return
          if (!byCategory[categoryKey]) {
            byCategory[categoryKey] = {
              eventCount: 0,
              numericSums: {},
              booleanTrueCounts: {},
            }
          }
          byCategory[categoryKey].eventCount += recordUseCount.get(recordId) || 0
        })

        ;(Array.isArray(values) ? values : []).forEach(row => {
          const recordId = String(row?.record_id || '').trim()
          if (!recordId) return
          const categoryId = recordCategoryIdById.get(recordId)
          if (!categoryId) return
          const categoryKey = categoryKeyById.get(categoryId)
          if (!categoryKey) return

          const fieldId = String(row?.field_id || '').trim()
          const meta = fieldMetaById.get(fieldId) || null
          if (!meta) return
          const label = meta.name

          if (!byCategory[categoryKey]) {
            byCategory[categoryKey] = {
              eventCount: 0,
              numericSums: {},
              booleanTrueCounts: {},
            }
          }

          if (meta.type === 'number') {
            const value = row?.value_number
            const numeric = typeof value === 'number' ? value : Number(value)
            if (!Number.isFinite(numeric)) return
            byCategory[categoryKey].numericSums[label] = (byCategory[categoryKey].numericSums[label] || 0) + numeric
          }

          if (meta.type === 'boolean') {
            const value = row?.value_boolean
            if (value === true) byCategory[categoryKey].booleanTrueCounts[label] = (byCategory[categoryKey].booleanTrueCounts[label] || 0) + 1
          }
        })

        if (!active) return
        setTypedStats({ loading: false, error: '', byCategory })
      } catch (error) {
        if (!active) return
        setTypedStats({
          loading: false,
          error: error?.message ? String(error.message) : 'Unable to load typed activity statistics.',
          byCategory: {},
        })
      }
    }

    void load()

	    return () => {
	      active = false
	    }
	  }, [isAdmin, supabaseEnabled, typedStatsRecordFingerprint])

  const availableCategoryKeys = useMemo(() => {
    const keys = [...categoryKeysFromDb]

    const hasUncategorized = baseEvents.some(event => event._category === 'uncategorized')
    if (hasUncategorized) keys.push('uncategorized')

    const unique = [...new Set(keys)]
    const getLabel = (key) => categoryLabelByKey[key] || categoryLabelByKey.uncategorized || 'Uncategorized'
    unique.sort((a, b) => getLabel(a).localeCompare(getLabel(b)))
    return unique
  }, [baseEvents, categoryKeysFromDb, categoryLabelByKey])

  useEffect(() => {
    if (selectedCategory === 'all') return
    if (!availableCategoryKeys.includes(selectedCategory)) setSelectedCategory('all')
  }, [availableCategoryKeys, selectedCategory])

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

			  const additionalCategoryKeys = useMemo(() => {
			    // Deprecated: custom categories are now covered by "Entries By Category" (entries + totals),
			    // so we no longer render separate per-category statistic cards for them.
			    return []
			  }, [])

		  const dynamicFieldKeys = useMemo(() => {
		    const keys = new Set()
		    filteredEvents.forEach(event => {
		      const data = event?.categoryData && typeof event.categoryData === 'object' ? event.categoryData : null
		      if (!data) return
		      Object.keys(data).forEach(key => {
		        const normalized = String(key || '').trim()
		        if (!normalized) return
		        keys.add(normalized)
		      })
		    })

		    const list = [...keys]
		    list.sort((a, b) => getFieldLabel(a).localeCompare(getFieldLabel(b)))
		    return list
		  }, [filteredEvents])

		  const reportColumns = useMemo(() => {
		    const dynamic = dynamicFieldKeys.map(key => ({ key, label: getFieldLabel(key) }))
		    return [...BASE_REPORT_COLUMNS, ...dynamic]
		  }, [dynamicFieldKeys])

		  const reportRows = useMemo(() => {
		    return filteredEvents.map(event => {
		      const row = {
		        title: event.title || '',
		        content: event.content || '',
		        category: categoryLabelByKey[event._category] || titleCaseFromKey(event._category) || 'Uncategorized',
		        branch: event.branch || '',
		        membersInvolve: event.membersInvolve || '',
		        dateTime: event._date.format('YYYY-MM-DD HH:mm'),
		        address: event.address || '',
		      }

		      dynamicFieldKeys.forEach(key => {
		        row[key] = getFieldValue(event, key)
		      })

		      return row
		    })
		  }, [filteredEvents, categoryLabelByKey, dynamicFieldKeys])

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
    ...Object.entries(typedStats.byCategory || {})
      .filter(([, entry]) => entry && (entry.eventCount > 0 || Object.keys(entry.numericSums || {}).length > 0))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([categoryKey, entry]) => {
        const lines = []
        lines.push(`${getCategoryLabel(categoryKey)} Activities (typed): ${entry.eventCount || 0}`)
        Object.entries(entry.numericSums || {})
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([label, total]) => {
            lines.push(`${getCategoryLabel(categoryKey)} - ${label} (sum): ${total}`)
          })
        Object.entries(entry.booleanTrueCounts || {})
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([label, count]) => {
            lines.push(`${getCategoryLabel(categoryKey)} - ${label} (true): ${count}`)
          })
        return lines
      }),
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
    lines.push(reportColumns.map(col => escapeCsv(col.label)).join(','))
    reportRows.forEach(row => {
      lines.push(reportColumns.map(col => escapeCsv(row[col.key])).join(','))
    })

    const csv = lines.join('\n')
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
  }

  const downloadDoc = async () => {
    const filename = `kusgan_report_${dayjs().format('YYYYMMDD_HHmmss')}.doc`
    const summaryHtml = summaryLines.map(line => `<li>${line}</li>`).join('')
    const headerHtml = reportColumns.map(col => `<th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">${col.label}</th>`).join('')
    const rowsHtml = reportRows
      .map(
        row =>
          `<tr>${reportColumns.map(col => `<td style="border:1px solid #ddd;padding:8px;vertical-align:top;">${String(row[col.key] ?? '')}</td>`).join('')}</tr>`
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

    const detailFieldColumns = reportColumns.filter(col => !BASE_REPORT_COLUMNS.some(base => base.key === col.key))

    reportRows.forEach(row => {
      const catFields = detailFieldColumns
        .map(col => {
          const value = row[col.key]
          if (value === undefined || value === null) return ''
          const raw = String(value).trim()
          if (!raw) return ''
          return `${col.label}:${raw}`
        })
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

	  const _handleExport = async type => {
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
	            <div>
	              <h2 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">Report - Statistics Overview</h2>
	              {dateWindowLabel && (
	                <p className="text-sm text-gray-500 dark:text-zinc-400">{dateWindowLabel}</p>
	              )}
	            </div>
	          </div>
	        </div>

	        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
	          <div>
	            <label htmlFor="report-date-range" className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Date Range</label>
            <select
              id="report-date-range"
              name="datePreset"
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
	            <label htmlFor="report-month" className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Month</label>
	            <input
	              id="report-month"
	              type="month"
	              value={reportMonth}
	              onChange={e => setReportMonth(e.target.value)}
	              disabled={datePreset !== 'monthly'}
	              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-gray-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
	            />
	          </div>
	          <div>
	            <label htmlFor="report-category" className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">Category</label>
	 	            <select
                id="report-category"
                name="category"
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
	          {availableCategoryKeys.includes('tuli') && (
		          <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
		            <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><HeartPulse size={18} className="text-red-600" />Tuli Statistics</h3>
		            <div className="space-y-2 text-sm">
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Tuli Activities</span><strong>{stats.tuli.eventCount}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Children Count</span><strong>{stats.tuli.tuliChildrenCount}</strong></div>
		              {renderTypedTotals('tuli')}
		            </div>
		          </div>
	          )}

          {availableCategoryKeys.includes('blood_letting') && (
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
		              {renderTypedTotals('blood_letting')}
		            </div>
		          </div>
	          )}

	          {availableCategoryKeys.includes('donations') && (
		          <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
		            <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><FileText size={18} className="text-red-600" />Donations Statistics</h3>
		            <div className="space-y-2 text-sm">
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Donation Activities</span><strong>{stats.donations.eventCount}</strong></div>
		              {renderTypedTotals('donations')}
		            </div>
		          </div>
	          )}

	          {availableCategoryKeys.includes('environmental') && (
		          <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
		            <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><Leaf size={18} className="text-green-600" />Environmental Statistics</h3>
		            <div className="space-y-2 text-sm">
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Environmental Activities</span><strong>{stats.environmental.eventCount}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Trees Planted</span><strong>{stats.environmental.envTreesPlanted}</strong></div>
		              {renderTypedTotals('environmental')}
		            </div>
		          </div>
	          )}

	          {availableCategoryKeys.includes('relief_operation') && (
		          <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
		            <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-600" />Relief Operation Statistics</h3>
		            <div className="space-y-2 text-sm">
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Relief Operations</span><strong>{stats.relief_operation.eventCount}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Families Count</span><strong>{stats.relief_operation.reliefFamiliesCount}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Items: Grocery</span><strong>{stats.relief_operation.reliefItems.grocery}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Items: Hygiene Kit</span><strong>{stats.relief_operation.reliefItems.hygiene_kit}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Items: Both</span><strong>{stats.relief_operation.reliefItems.both}</strong></div>
		              {renderTypedTotals('relief_operation')}
		            </div>
		          </div>
	          )}

	          {availableCategoryKeys.includes('fire_response') && (
		          <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
		            <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><Flame size={18} className="text-orange-600" />Fire Response Statistics</h3>
		            <div className="space-y-2 text-sm">
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Fire Responses</span><strong>{stats.fire_response.eventCount}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Affected Families</span><strong>{stats.fire_response.fireAffectedFamilies}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Estimated Cost</span><strong>{stats.fire_response.fireEstimatedCost}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Liters Used</span><strong>{stats.fire_response.fireLiters}</strong></div>
		              {renderTypedTotals('fire_response')}
		            </div>
		          </div>
	          )}

	          {availableCategoryKeys.includes('water_distribution') && (
		          <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
		            <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><Droplets size={18} className="text-red-600" />Water Distribution Statistics</h3>
		            <div className="space-y-2 text-sm">
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Water Distributions</span><strong>{stats.water_distribution.eventCount}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Liters</span><strong>{stats.water_distribution.waterLiters}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Households</span><strong>{stats.water_distribution.waterHouseholds}</strong></div>
		              {renderTypedTotals('water_distribution')}
		            </div>
		          </div>
	          )}

	          {availableCategoryKeys.includes('medical') && (
		          <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
		            <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><HeartPulse size={18} className="text-pink-600" />Medical Statistics</h3>
		            <div className="space-y-2 text-sm">
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Medical Events</span><strong>{stats.medical.eventCount}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Medical Equipment Used</span><strong>{stats.medical.medicalEquipmentUsed}</strong></div>
		              <div className="flex flex-wrap justify-between gap-2"><span>Total Expenses</span><strong>{CURRENCY.format(stats.medical.expenses)}</strong></div>
		              {renderTypedTotals('medical')}
		            </div>
		          </div>
	          )}

	          {additionalCategoryKeys.map(key => (
	            <div key={key} className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-red-600" />
                {getCategoryLabel(key)} Statistics
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>Total Activities</span>
                  <strong>{eventCountByCategory[key] || 0}</strong>
                </div>
                {typedStats.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                    {typedStats.error}
                  </div>
                )}
                {typedStats.loading && (
                  <div className="text-[12px] text-gray-500">Loading typed activity totals…</div>
                )}
                {!typedStats.loading && !typedStats.error && typedStats.byCategory?.[key] && (
                  <>
                    {Object.entries(typedStats.byCategory[key].numericSums || {})
                      .sort((a, b) => a[0].localeCompare(b[0]))
	                      .slice(0, 200)
                      .map(([label, total]) => (
                        <div key={`sum-${label}`} className="flex flex-wrap justify-between gap-2">
                          <span>Total {label}</span>
                          <strong>{formatNumber(total)}</strong>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>
	          ))}
		      </div>

		      <div className="rounded-2xl border border-red-600 bg-white dark:bg-zinc-900 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] layout-glow">
		        <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
		          <FileText size={18} className="text-red-600" />
		          Entries By Category
		        </h3>

		        <div className="space-y-3">
		          {availableCategoryKeys.map(categoryKey => {
		            const events = entryEventsByCategory.get(categoryKey) || []
		            const numericKeys = numericKeysByCategory.get(categoryKey) || []

		            const totals = {}
		            numericKeys.forEach(key => { totals[key] = 0 })
		            events.forEach(event => {
		              const data = event?.categoryData && typeof event.categoryData === 'object' ? event.categoryData : null
		              if (!data) return
		              numericKeys.forEach(key => {
		                const numeric = toFiniteNumberOrNull(data[key])
		                if (numeric === null) return
		                totals[key] += numeric
		              })
		            })

			            return (
			              <div key={`entries-${categoryKey}`} className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/40 p-4">
			                <div className="flex flex-wrap items-center justify-between gap-2">
			                  <h4 className="text-sm font-semibold text-gray-800 dark:text-zinc-100">
			                    {getCategoryLabel(categoryKey)}
			                  </h4>
			                  <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
			                    {formatNumber(events.length)} entr{events.length === 1 ? 'y' : 'ies'}
			                  </span>
			                </div>
			
			                {events.length === 0 ? (
			                  <div className="mt-3 text-sm text-gray-500 dark:text-zinc-400">No entries for this category in the selected date window.</div>
			                ) : (
			                  <div className="mt-3 overflow-x-auto">
			                    <table className="w-full min-w-[720px] text-sm">
			                      <thead>
			                        <tr className="text-left text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
			                          <th className="pb-2 pr-4">Title</th>
			                          <th className="pb-2 pr-4">Date</th>
			                          <th className="pb-2 pr-4">Field</th>
			                          {numericKeys.map(key => (
			                            <th key={`head-${categoryKey}-${key}`} className="pb-2 pr-4 whitespace-nowrap">{getFieldLabel(key)}</th>
			                          ))}
			                        </tr>
			                      </thead>
			                      <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800">
			                        {events.map(event => {
			                          const data = event?.categoryData && typeof event.categoryData === 'object' ? event.categoryData : {}
			                          const dateLabel = event?._date?.isValid?.() ? event._date.format('YYYY-MM-DD') : ''
			                          return (
			                            <tr key={`row-${categoryKey}-${event.id}`} className="text-neutral-700 dark:text-zinc-200 align-top">
			                              <td className="py-2 pr-4 font-medium text-neutral-900 dark:text-zinc-100">{event.title || '-'}</td>
			                              <td className="py-2 pr-4 whitespace-nowrap">{dateLabel || '-'}</td>
			                              <td className="py-2 pr-4 whitespace-nowrap">{event.branch || '-'}</td>
			                              {numericKeys.map(key => (
			                                <td key={`cell-${categoryKey}-${event.id}-${key}`} className="py-2 pr-4 whitespace-nowrap">
			                                  {formatNumber(data[key])}
			                                </td>
			                              ))}
			                            </tr>
			                          )
			                        })}
			                        {numericKeys.length > 0 && (
			                          <tr className="font-semibold text-neutral-900 dark:text-zinc-100">
			                            <td className="pt-3 pr-4" colSpan={3}>Totals</td>
			                            {numericKeys.map(key => (
			                              <td key={`total-${categoryKey}-${key}`} className="pt-3 pr-4 whitespace-nowrap">{formatNumber(totals[key])}</td>
			                            ))}
			                          </tr>
			                        )}
			                      </tbody>
			                    </table>
			                  </div>
			                )}
			              </div>
			            )
			          })}
			        </div>
			      </div>
	
	    </div>
	  )
}

export default Report
