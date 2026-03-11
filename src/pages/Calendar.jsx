
import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Plus,
  X,
  Trash2,
  MapPin,
  Loader2,
  Leaf,
  Activity,
  Flame,
  FileText,
  HeartPulse,
  Droplets,
  Users,
  Check,
  Eye,
} from 'lucide-react'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

const CATEGORY_CONFIG = {
  tuli: {
    label: 'Tuli',
    fields: [
      { key: 'tuli_children_count', label: 'Tuli children count', type: 'number', min: 0, step: 1 },
      { key: 'tuli_residing_doctors', label: 'Residing doctors', type: 'text' },
    ],
  },
  blood_letting: {
    label: 'Blood Letting',
    fields: [
      { key: 'blood_bags_count', label: 'Blood bags count', type: 'number', min: 0, step: 1 },
      { key: 'blood_successful_donors', label: 'Successful donors', type: 'number', min: 0, step: 1 },
      { key: 'blood_token', label: 'Blood token (use | to separate)', type: 'text' },
    ],
  },
  donations: {
    label: 'Donations',
    fields: [{ key: 'donation_request', label: 'Donation request', type: 'text' }],
  },
  environmental: {
    label: 'Environmental',
    fields: [{ key: 'env_trees_planted', label: 'Trees planted', type: 'number', min: 0, step: 1 }],
  },
  relief_operation: {
    label: 'Relief Operation',
    fields: [
      { key: 'relief_families_count', label: 'Families count', type: 'number', min: 0, step: 1 },
      { key: 'relief_items', label: 'Relief items', type: 'select', options: ['grocery', 'hygiene_kit', 'both'] },
    ],
  },
  fire_response: {
    label: 'Fire Response',
    fields: [
      {
        key: 'fire_alarm_status',
        label: 'Alarm status',
        type: 'select',
        options: ['1st_alarm', '2nd_alarm', '3rd_alarm', '4th_alarm_city_director', 'alpha'],
      },
      { key: 'fire_affected_families', label: 'Affected families', type: 'number', min: 0, step: 1 },
      { key: 'fire_estimated_cost', label: 'Estimated cost', type: 'number', min: 0, step: 0.01 },
      { key: 'fire_liters', label: 'Liters used', type: 'number', min: 0, step: 0.01 },
    ],
  },
  water_distribution: {
    label: 'Water Distribution',
    fields: [
      { key: 'water_liters', label: 'Liters', type: 'number', min: 0, step: 0.01 },
      { key: 'water_households', label: 'Households', type: 'number', min: 0, step: 1 },
      { key: 'water_employees', label: 'Employees', type: 'text' },
      { key: 'water_engine', label: 'Engine', type: 'select', options: ['engine_1', 'engine_2'] },
    ],
  },
  notes: {
    label: 'Notes',
    fields: [],
  },
  medical: {
    label: 'Medical',
    fields: [
      { key: 'medicalEquipmentUsed', label: 'Medical Equipment Used', type: 'text' },
      { key: 'expenses', label: 'Expenses', type: 'number', min: 0, step: 0.01 },
    ],
  },
}

const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG)
const CREATE_CATEGORY_KEYS = [
  'tuli',
  'blood_letting',
  'donations',
  'environmental',
  'relief_operation',
  'fire_response',
  'water_distribution',
]

const CATEGORY_META = {
  tuli: { icon: HeartPulse, iconClass: '', bg: 'from-red-50 to-red-100', text: 'text-red-700' },
  blood_letting: { icon: Activity, iconClass: '', bg: 'from-red-50 to-red-100', text: 'text-red-700' },
  donations: { icon: FileText, iconClass: '', bg: 'from-red-50 to-red-100', text: 'text-red-700' },
  environmental: { icon: Leaf, iconClass: '', bg: 'from-red-50 to-red-100', text: 'text-red-700' },
  relief_operation: { icon: Activity, iconClass: '', bg: 'from-red-50 to-red-100', text: 'text-red-700' },
  fire_response: { icon: Flame, iconClass: '', bg: 'from-red-50 to-red-100', text: 'text-red-700' },
  water_distribution: { icon: Droplets, iconClass: '', bg: 'from-red-50 to-red-100', text: 'text-red-700' },
  notes: { icon: FileText, iconClass: '', bg: 'from-red-50 to-red-100', text: 'text-red-700' },
  medical: { icon: HeartPulse, iconClass: '', bg: 'from-red-50 to-red-100', text: 'text-red-700' },
}

const getDefaultDynamicFields = () =>
  CATEGORY_KEYS.reduce((acc, categoryKey) => {
    const fields = CATEGORY_CONFIG[categoryKey].fields
    acc[categoryKey] = fields.reduce((fieldAcc, field) => ({ ...fieldAcc, [field.key]: '' }), {})
    return acc
  }, {})

const ALL_MONTHS = [
  { key: '01', label: 'January' },
  { key: '02', label: 'February' },
  { key: '03', label: 'March' },
  { key: '04', label: 'April' },
  { key: '05', label: 'May' },
  { key: '06', label: 'June' },
  { key: '07', label: 'July' },
  { key: '08', label: 'August' },
  { key: '09', label: 'September' },
  { key: '10', label: 'October' },
  { key: '11', label: 'November' },
  { key: '12', label: 'December' },
]

const CALENDAR_FILTERS_KEY = 'kusgan_calendar_filters'

const getStoredCalendarFilters = () => {
  const stored = localStorage.getItem(CALENDAR_FILTERS_KEY)
  if (!stored) return { searchQuery: '', selectedCategory: 'All' }
  try {
    const parsed = JSON.parse(stored)
    return {
      searchQuery: parsed?.searchQuery || '',
      selectedCategory: parsed?.selectedCategory || 'All',
    }
  } catch {
    return { searchQuery: '', selectedCategory: 'All' }
  }
}

const getCategoryKeyFromLabel = label => {
  const normalized = String(label || '').trim().toLowerCase()
  const exact = CATEGORY_KEYS.find(key => CATEGORY_CONFIG[key].label.toLowerCase() === normalized)
  return exact || null
}

const getCategoryLabelFromQuery = value => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized || normalized === 'all') return 'All'
  if (CATEGORY_CONFIG[normalized]) return CATEGORY_CONFIG[normalized].label
  const fromLabel = getCategoryKeyFromLabel(value)
  return fromLabel ? CATEGORY_CONFIG[fromLabel].label : 'All'
}

let leafletLoaderPromise = null

const loadLeaflet = () => {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.L) return Promise.resolve(window.L)
  if (leafletLoaderPromise) return leafletLoaderPromise

  leafletLoaderPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css-cdn'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const scriptExisting = document.getElementById('leaflet-js-cdn')
    if (scriptExisting && window.L) {
      resolve(window.L)
      return
    }

    if (!scriptExisting) {
      const script = document.createElement('script')
      script.id = 'leaflet-js-cdn'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async = true
      script.onload = () => resolve(window.L)
      script.onerror = () => reject(new Error('Failed to load Leaflet'))
      document.body.appendChild(script)
      return
    }

    scriptExisting.addEventListener('load', () => resolve(window.L))
    scriptExisting.addEventListener('error', () => reject(new Error('Failed to load Leaflet')))
  })

  return leafletLoaderPromise
}

const geocodeAddress = async (query, signal) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`,
    { signal }
  )
  if (!response.ok) throw new Error('Address search failed')
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

const reverseGeocode = async (lat, lng) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
  )
  if (!response.ok) throw new Error('Reverse geocode failed')
  const data = await response.json()
  return data?.display_name || ''
}

const getSearchZoom = (query, selected = false) => {
  if (selected) return 16
  const normalized = query.trim()
  if (normalized.length >= 24) return 14
  if (normalized.length >= 12) return 13
  return 11
}

const splitPipe = value =>
  String(value || '')
    .split('|')
    .map(item => item.trim())
    .filter(Boolean)

const resolveStoredLocation = event => {
  if (event?.location && typeof event.location.lat === 'number' && typeof event.location.lng === 'number') {
    return { lat: event.location.lat, lng: event.location.lng }
  }
  if (typeof event?.latitude === 'number' && typeof event?.longitude === 'number') {
    return { lat: event.latitude, lng: event.longitude }
  }
  return null
}

const getStoredEvents = () => {
  const stored = localStorage.getItem('kusgan_events')
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed.map(event => {
      const fallbackDateTime = event.date
        ? dayjs(`${event.date} ${event.startTime || '00:00'}`).format('YYYY-MM-DDTHH:mm')
        : ''

      return {
        ...event,
        content: event.content || event.description || '',
        dateTime: event.dateTime || fallbackDateTime,
        address: event.address || '',
        branch: event.branch || '',
        membersInvolve: event.membersInvolve || '',
        assignedMemberIds: Array.isArray(event.assignedMemberIds) ? event.assignedMemberIds : [],
        viewedBy: Array.isArray(event.viewedBy) ? event.viewedBy : [],
        location: resolveStoredLocation(event),
        category: String(event.category || 'notes')
          .toLowerCase()
          .replace(/\s+/g, '_'),
        categoryData: event.categoryData || {},
        status: event.status === 'done' ? 'done' : 'ongoing',
        completedAt: event.completedAt || null,
      }
    })
  } catch {
    localStorage.removeItem('kusgan_events')
    return []
  }
}

function EventLocationPicker({ address, location, onAddressInput, onLocationSelect }) {
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mapError, setMapError] = useState('')
  const [searchHint, setSearchHint] = useState('')
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const leafletRef = useRef(null)

  useEffect(() => {
    let active = true

    const initializeMap = async () => {
      try {
        const L = await loadLeaflet()
        if (!active || !L || !mapContainerRef.current || mapRef.current) return
        leafletRef.current = L

        const defaultCenter = location || { lat: 14.5995, lng: 120.9842 }
        const map = L.map(mapContainerRef.current, {
          center: [defaultCenter.lat, defaultCenter.lng],
          zoom: location ? 15 : 12,
        })

        map.getContainer().style.zIndex = '0'

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        if (location) {
          markerRef.current = L.marker([location.lat, location.lng]).addTo(map)
        }

        map.on('click', async e => {
          const nextLocation = { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) }
          if (markerRef.current) {
            markerRef.current.setLatLng([nextLocation.lat, nextLocation.lng])
          } else {
            markerRef.current = L.marker([nextLocation.lat, nextLocation.lng]).addTo(map)
          }
          map.setView([nextLocation.lat, nextLocation.lng], Math.max(15, map.getZoom()))

          let resolvedAddress = address
          try {
            resolvedAddress = await reverseGeocode(nextLocation.lat, nextLocation.lng)
          } catch {
            resolvedAddress = address || `${nextLocation.lat}, ${nextLocation.lng}`
          }
          onLocationSelect({ address: resolvedAddress, location: nextLocation })
        })

        mapRef.current = map
      } catch {
        if (active) setMapError('Map unavailable. Check network connection.')
      }
    }

    initializeMap()

    return () => {
      active = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
    }
  }, [address, location, onLocationSelect])

  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return
    if (!location) {
      if (markerRef.current) {
        mapRef.current.removeLayer(markerRef.current)
        markerRef.current = null
      }
      return
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([location.lat, location.lng])
    } else {
      markerRef.current = leafletRef.current.marker([location.lat, location.lng]).addTo(mapRef.current)
    }
    mapRef.current.flyTo([location.lat, location.lng], Math.max(15, mapRef.current.getZoom()), { duration: 0.45 })
  }, [location])

  useEffect(() => {
    const query = address.trim()
    if (query.length < 3) {
      setSuggestions([])
      setIsSearching(false)
      setSearchHint('')
      setActiveSuggestionIndex(-1)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true)
        const results = await geocodeAddress(query, controller.signal)
        if (controller.signal.aborted) return

        setSuggestions(results)
        setActiveSuggestionIndex(results.length > 0 ? 0 : -1)
        if (results.length === 0) {
          setSearchHint('No results found. Try a more specific address.')
          if (!location && mapRef.current && markerRef.current) {
            mapRef.current.removeLayer(markerRef.current)
            markerRef.current = null
          }
          return
        }

        setSearchHint('Select a suggestion or press Enter to confirm location.')
        if (mapRef.current) {
          const first = results[0]
          const previewLat = Number(first.lat)
          const previewLng = Number(first.lon)
          mapRef.current.flyTo([previewLat, previewLng], getSearchZoom(query), { duration: 0.4 })
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([])
          setSearchHint('Unable to search location right now.')
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false)
      }
    }, 350)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [address, location])

  const selectSuggestion = item => {
    const nextLocation = { lat: Number(item.lat), lng: Number(item.lon) }
    onLocationSelect({ address: item.display_name, location: nextLocation })
    setShowSuggestions(false)
    setSuggestions([])
    setSearchHint('')
    setActiveSuggestionIndex(-1)
    if (mapRef.current) {
      mapRef.current.flyTo([nextLocation.lat, nextLocation.lng], getSearchZoom(item.display_name, true), {
        duration: 0.45,
      })
    }
  }

  const renderHighlightedAddress = (fullText, query) => {
    const q = query.trim()
    if (!q) return fullText
    const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${safeQuery})`, 'ig')
    const parts = fullText.split(regex)
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <mark key={`${part}-${index}`} className="bg-red-100 text-red-700 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
        <div className="relative">
          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={address}
            onChange={e => {
              onAddressInput(e.target.value)
              setShowSuggestions(true)
              setActiveSuggestionIndex(-1)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={e => {
              if (!showSuggestions) return

              if (e.key === 'ArrowDown' && suggestions.length > 0) {
                e.preventDefault()
                setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length)
                return
              }

              if (e.key === 'ArrowUp' && suggestions.length > 0) {
                e.preventDefault()
                setActiveSuggestionIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1))
                return
              }

              if (e.key === 'Escape') {
                setShowSuggestions(false)
                return
              }

              if (e.key === 'Enter' && suggestions.length > 0) {
                e.preventDefault()
                const selected = suggestions[activeSuggestionIndex >= 0 ? activeSuggestionIndex : 0]
                selectSuggestion(selected)
              }
            }}
            placeholder="Search address"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
          {isSearching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        </div>
        {showSuggestions && (isSearching || suggestions.length > 0 || searchHint) && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-red-100 rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {isSearching && <p className="px-3 py-2 text-sm text-gray-500">Searching...</p>}
            {!isSearching && suggestions.length === 0 && searchHint && (
              <p className="px-3 py-2 text-sm text-gray-500">{searchHint}</p>
            )}
            {!isSearching &&
              suggestions.map((item, index) => (
                <button
                  key={`${item.place_id}-${item.lat}-${item.lon}`}
                  type="button"
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                  onClick={() => selectSuggestion(item)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                    activeSuggestionIndex === index ? 'bg-red-50 text-red-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {renderHighlightedAddress(item.display_name, address)}
                </button>
              ))}
          </div>
        )}
      </div>

<div className="relative isolate z-0 rounded-2xl border border-red-600 shadow-sm overflow-hidden">
        <div ref={mapContainerRef} className="relative z-0 h-52 sm:h-64 md:h-72 w-full" />
      </div>
      {mapError && <p className="text-sm text-red-600">{mapError}</p>}
      <p className="text-xs text-gray-500">Type partial or full address. Press Enter or choose a suggestion to pin exactly.</p>
    </div>
  )
}

function ReadOnlyEventMap({ address, location }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    let active = true

    const mountMap = async () => {
      if (!address) return
      try {
        const L = await loadLeaflet()
        if (!active || !L || !mapContainerRef.current || mapRef.current) return

        let resolvedLocation = location
        if (!resolvedLocation) {
          const results = await geocodeAddress(address)
          if (results.length > 0) {
            resolvedLocation = { lat: Number(results[0].lat), lng: Number(results[0].lon) }
          }
        }
        if (!resolvedLocation) return

        const map = L.map(mapContainerRef.current, {
          center: [resolvedLocation.lat, resolvedLocation.lng],
          zoom: 15,
          dragging: false,
          scrollWheelZoom: false,
          touchZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          zoomControl: false,
        })

        map.getContainer().style.zIndex = '0'

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        markerRef.current = L.marker([resolvedLocation.lat, resolvedLocation.lng]).addTo(map)
        mapRef.current = map

        // Ensure proper tile/layout sizing after expand animation and responsive layout settle.
        requestAnimationFrame(() => map.invalidateSize())
        setTimeout(() => map.invalidateSize(), 220)
      } catch {
      }
    }

    mountMap()

    return () => {
      active = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
    }
  }, [address, location])

  if (!address) return null

  return (
    <div className="relative isolate z-0 w-full rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
      <div ref={mapContainerRef} className="relative z-0 w-full h-[280px] sm:h-[320px] md:h-[340px]" />
    </div>
  )
}

function AssignMembersPicker({ allMembers, selectedIds, onChange, label = 'Assign Members', placeholder = 'Search members by name, committee, or ID...' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const inputRef = useRef(null)

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allMembers.filter(member => {
      if (!q) return true
      return (
        member.name?.toLowerCase().includes(q) ||
        member.committee?.toLowerCase().includes(q) ||
        member.branch?.toLowerCase().includes(q) ||
        member.idNumber?.toLowerCase().includes(q)
      )
    })
  }, [allMembers, query])

  const selectedMembers = useMemo(
    () => allMembers.filter(member => selectedIds.includes(member.id)),
    [allMembers, selectedIds]
  )

  useEffect(() => {
    const onClickOutside = e => {
      if (!panelRef.current?.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onClickOutside)
    return () => window.removeEventListener('mousedown', onClickOutside)
  }, [])

  const toggleMember = memberId => {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter(id => id !== memberId))
    } else {
      onChange([...selectedIds, memberId])
    }
  }

  return (
    <div className="space-y-2" ref={panelRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {filteredMembers.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-500">No members found.</p>
            )}
            {filteredMembers.map(member => {
              const checked = selectedIds.includes(member.id)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleMember(member.id)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 flex items-center justify-between ${
                    checked ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="truncate pr-3">
                    {member.name}
                    <span className="ml-2 text-xs text-gray-500">
                      {member.committee ? `${member.committee}` : ''}{member.branch ? ` / ${member.branch}` : ''}
                    </span>
                  </span>
                  {checked && <Check size={14} />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedMembers.map(member => (
            <button
              key={member.id}
              type="button"
              onClick={() => toggleMember(member.id)}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs hover:bg-red-100"
            >
              {member.name}
              <X size={12} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Calendar({ listOnly = false }) {
  const { user, getAllMembers } = useAuth()
  const canManageEvents = user?.role === 'admin'
  const routerLocation = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const storedFilters = getStoredCalendarFilters()
  const [events, setEvents] = useState(getStoredEvents)
  const [selectedMonthKey, setSelectedMonthKey] = useState(null)
  const [showAllMonths, setShowAllMonths] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [pendingConfirmation, setPendingConfirmation] = useState(null)
  const [expandedItemId, setExpandedItemId] = useState(null)
  const [highlightedEventId, setHighlightedEventId] = useState(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showDoneForm, setShowDoneForm] = useState(false)
  const [markDoneEventId, setMarkDoneEventId] = useState(null)
  const [doneFormError, setDoneFormError] = useState('')
  const [currentYear, setCurrentYear] = useState(dayjs().year())
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    dateTime: '',
    address: '',
    location: null,
    category: '',
    branch: '',
    assignedMemberIds: [],
  })
  const [searchQuery, setSearchQuery] = useState(storedFilters.searchQuery)
  const [selectedCategory, setSelectedCategory] = useState(storedFilters.selectedCategory)
  const [selectedDateFilter, setSelectedDateFilter] = useState('')
  const [doneFields, setDoneFields] = useState(getDefaultDynamicFields())
  const [donePartners, setDonePartners] = useState([''])
  const [doneBloodTokens, setDoneBloodTokens] = useState([''])
  const eventRefs = useRef({})
  const handledRedirectRef = useRef(false)
  const routeCategory = searchParams.get('category') || ''

  useEffect(() => {
    localStorage.setItem('kusgan_events', JSON.stringify(events))
    window.dispatchEvent(new Event('kusgan-events-updated'))
  }, [events])

  const assignableMembers = useMemo(
    () => getAllMembers().filter(member => member.role === 'member'),
    [getAllMembers]
  )

  const memberNameById = useMemo(() => {
    const map = {}
    assignableMembers.forEach(member => {
      map[member.id] = member.name
    })
    return map
  }, [assignableMembers])

  useEffect(() => {
    localStorage.setItem(
      CALENDAR_FILTERS_KEY,
      JSON.stringify({
        searchQuery,
        selectedCategory,
      })
    )
  }, [searchQuery, selectedCategory])

  useEffect(() => {
    if (!listOnly) return
    const nextCategory = getCategoryLabelFromQuery(routeCategory)
    setSelectedCategory(prev => (prev === nextCategory ? prev : nextCategory))
    setSelectedMonthKey(null)
    setSelectedDateFilter('')
  }, [listOnly, routeCategory])

  const updateCategoryRoute = categoryLabel => {
    const params = new URLSearchParams(searchParams)
    const nextKey = getCategoryKeyFromLabel(categoryLabel)
    if (!nextKey || categoryLabel === 'All') {
      params.delete('category')
    } else {
      params.set('category', nextKey)
    }
    setSearchParams(params, { replace: true })
  }

  useEffect(() => {
    const state = routerLocation.state
    if (!state || Object.keys(state).length === 0) return

    let didConsumeState = false

    if (state.preserveFilters) {
      const saved = getStoredCalendarFilters()
      setSearchQuery(saved.searchQuery)
      setSelectedCategory(saved.selectedCategory)
      didConsumeState = true
    }

    if (typeof state.presetCategory === 'string' && state.presetCategory.trim()) {
      setSelectedCategory(state.presetCategory.trim())
      setSelectedMonthKey(null)
      setExpandedItemId(null)
      didConsumeState = true
    }

    if (typeof state.openMonthKey === 'string' && dayjs(state.openMonthKey, 'YYYY-MM', true).isValid()) {
      setCurrentYear(dayjs(`${state.openMonthKey}-01`).year())
      setSelectedMonthKey(state.openMonthKey)
      setExpandedItemId(null)
      setSelectedDateFilter('')
      didConsumeState = true
    }

    if (typeof state.focusDate === 'string' && dayjs(state.focusDate, 'YYYY-MM-DD', true).isValid()) {
      const focusMonthKey = dayjs(state.focusDate).format('YYYY-MM')
      setCurrentYear(dayjs(state.focusDate).year())
      setSelectedMonthKey(focusMonthKey)
      setExpandedItemId(null)
      setSelectedDateFilter(state.focusDate)
      didConsumeState = true
    }

    if (state.openCreateEventForm && canManageEvents) {
      resetForm()
      setShowEventForm(true)
      didConsumeState = true
    }

    const focusEventId = state.focusEventId
    if (focusEventId && !handledRedirectRef.current) {
      const targetEvent = events.find(event => event.id === focusEventId)
      if (targetEvent?.dateTime && dayjs(targetEvent.dateTime).isValid()) {
        handledRedirectRef.current = true
        const monthKey = dayjs(targetEvent.dateTime).format('YYYY-MM')
        setCurrentYear(dayjs(targetEvent.dateTime).year())
        setSelectedMonthKey(monthKey)
        setExpandedItemId(targetEvent.id)
        setHighlightedEventId(targetEvent.id)
        setTimeout(() => setHighlightedEventId(null), 3000)
        didConsumeState = true
      }
    }

    if (didConsumeState) {
      navigate(routerLocation.pathname + routerLocation.search, { replace: true, state: {} })
    }
  }, [routerLocation.state, routerLocation.pathname, routerLocation.search, events, navigate, canManageEvents])

  useEffect(() => {
    if (!selectedMonthKey || !expandedItemId) return
    const ref = eventRefs.current[expandedItemId]
    if (!ref) return
    ref.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [selectedMonthKey, expandedItemId])

  const monthGroups = useMemo(() => {
    const grouped = events
      .filter(event => event.dateTime && dayjs(event.dateTime).isValid())
      .reduce((acc, event) => {
        const monthKey = dayjs(event.dateTime).format('YYYY-MM')
        if (!acc[monthKey]) {
          acc[monthKey] = {
            monthKey,
            monthLabel: dayjs(event.dateTime).format('MMMM YYYY'),
            items: [],
          }
        }
        acc[monthKey].items.push(event)
        return acc
      }, {})

    return Object.values(grouped)
      .map(group => ({
        ...group,
        items: [...group.items].sort((a, b) => dayjs(a.dateTime).valueOf() - dayjs(b.dateTime).valueOf()),
      }))
      .sort((a, b) => dayjs(b.monthKey).valueOf() - dayjs(a.monthKey).valueOf())
  }, [events])

  const selectedMonth = monthGroups.find(group => group.monthKey === selectedMonthKey)

  const filteredItems = useMemo(() => {
    if (!selectedMonth) return []
    return selectedMonth.items.filter(item => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        item.title?.toLowerCase().includes(searchLower) ||
        item.content?.toLowerCase().includes(searchLower) ||
        item.address?.toLowerCase().includes(searchLower) ||
        item.membersInvolve?.toLowerCase().includes(searchLower) ||
        item.branch?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower)
      const selectedLower = selectedCategory.toLowerCase()
      const matchesCategory = selectedCategory === 'All' || item.category === selectedLower
      const matchesDate = !selectedDateFilter || dayjs(item.dateTime).format('YYYY-MM-DD') === selectedDateFilter
      return matchesSearch && matchesCategory && matchesDate
    }).sort((a, b) => {
      if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1
      return dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf()
    })
  }, [selectedMonth, searchQuery, selectedCategory, selectedDateFilter])

  const allFilteredItems = useMemo(() => {
    return events
      .filter(item => item.dateTime && dayjs(item.dateTime).isValid())
      .filter(item => {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          !searchQuery ||
          item.title?.toLowerCase().includes(searchLower) ||
          item.content?.toLowerCase().includes(searchLower) ||
          item.address?.toLowerCase().includes(searchLower) ||
          item.membersInvolve?.toLowerCase().includes(searchLower) ||
          item.branch?.toLowerCase().includes(searchLower) ||
          item.category?.toLowerCase().includes(searchLower)
        const selectedLower = selectedCategory.toLowerCase()
        const matchesCategory = selectedCategory === 'All' || item.category === selectedLower
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => {
        if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1
        return dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf()
      })
  }, [events, searchQuery, selectedCategory])

  const allMonthsWithEvents = useMemo(() => {
    return ALL_MONTHS.map(month => {
      const monthKey = `${currentYear}-${month.key}`
      const group = monthGroups.find(g => g.monthKey === monthKey)
      return {
        monthKey,
        monthName: month.label,
        items: group ? group.items : [],
        hasEvents: Boolean(group && group.items.length > 0),
      }
    })
  }, [monthGroups, currentYear])

  const visibleMonths = useMemo(() => {
    if (showAllMonths) return allMonthsWithEvents
    return allMonthsWithEvents.filter(month => month.hasEvents)
  }, [allMonthsWithEvents, showAllMonths])

  const selectedCategoryMeta = CATEGORY_META[formData.category]
  const SelectedCategoryIcon = selectedCategoryMeta?.icon || FileText
  const markDoneEvent = useMemo(
    () => events.find(event => event.id === markDoneEventId) || null,
    [events, markDoneEventId]
  )
  const markDoneCategoryConfig = markDoneEvent ? CATEGORY_CONFIG[markDoneEvent.category] : null
  const markDoneCategoryMeta = markDoneEvent ? CATEGORY_META[markDoneEvent.category] : null
  const MarkDoneIcon = markDoneCategoryMeta?.icon || FileText

  const handleDoneFieldChange = (categoryKey, fieldKey, value) => {
    setDoneFields(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [fieldKey]: value,
      },
    }))
  }

  const resetForm = () => {
    setEditingEventId(null)
    setFormData({
      title: '',
      content: '',
      dateTime: '',
      address: '',
      location: null,
      category: '',
      branch: '',
      assignedMemberIds: [],
    })
    setFormError('')
  }

  const handleAddEvent = e => {
    e.preventDefault()
    setFormError('')
    if (!canManageEvents) {
      setFormError('You can only view events.')
      return
    }

    if (!formData.dateTime || !formData.category || !formData.address.trim()) {
      setFormError('Date and Time, Category, and Address are required.')
      return
    }
    if (!formData.location) {
      setFormError('Please pick a location from search results or map pin.')
      return
    }

    const involvedMemberNames = Array.isArray(formData.assignedMemberIds)
      ? formData.assignedMemberIds.map(memberId => memberNameById[memberId]).filter(Boolean)
      : []
    const existingEvent = editingEventId ? events.find(item => item.id === editingEventId) : null
    const existingCategoryData = existingEvent?.categoryData && typeof existingEvent.categoryData === 'object'
      ? existingEvent.categoryData
      : {}
    const eventPayload = {
      title: CATEGORY_CONFIG[formData.category]?.label || 'Untitled Event',
      content: formData.content.trim(),
      dateTime: formData.dateTime,
      address: formData.address.trim(),
      // Type is no longer collected in the create/update form; preserve existing value if present.
      branch: existingEvent?.branch || '',
      membersInvolve: formData.category === 'notes' ? involvedMemberNames.join(', ') : '',
      assignedMemberIds: formData.assignedMemberIds,
      viewedBy: [],
      location: formData.location,
      category: formData.category,
      // Partners + activity fields are collected when marking the event as done.
      categoryData: existingCategoryData,
    }

    if (editingEventId) {
      setPendingConfirmation({
        type: 'update',
        eventId: editingEventId,
        payload: eventPayload,
      })
    } else {
      const newEvent = {
        id: Date.now(),
        ...eventPayload,
        viewedBy: [],
        createdBy: user?.name || 'Unknown',
        createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
        status: 'ongoing',
        completedAt: null,
      }
      setEvents(prev => [newEvent, ...prev])
      resetForm()
      setShowEventForm(false)
    }
  }

  const openEventForEdit = item => {
    if (!canManageEvents) return
    const category = item.category || ''
    setEditingEventId(item.id)
    setFormError('')
    setFormData({
      title: item.title || '',
      content: item.content || '',
      dateTime: item.dateTime ? dayjs(item.dateTime).format('YYYY-MM-DDTHH:mm') : '',
      address: item.address || '',
      location: item.location || null,
      category,
      branch: item.branch || '',
      assignedMemberIds: Array.isArray(item.assignedMemberIds) ? item.assignedMemberIds : [],
    })
    setShowEventForm(true)
  }

  const deleteEvent = eventId => {
    if (!canManageEvents) return
    setEvents(prev => prev.filter(event => event.id !== eventId))
  }

  const confirmDeleteEvent = eventId => {
    if (!canManageEvents) return
    setPendingConfirmation({
      type: 'delete',
      eventId,
    })
  }

  const openMarkDoneForm = event => {
    if (!canManageEvents || event.status === 'done') return
    const defaults = getDefaultDynamicFields()
    if (event.category && defaults[event.category]) {
      defaults[event.category] = {
        ...defaults[event.category],
        ...(event.categoryData || {}),
      }
    }
    setDoneFields(defaults)
    setDonePartners(
      String(event.categoryData?.partners || '')
        .split('|')
        .map(x => x.trim())
        .filter(Boolean)
        .concat([''])
        .slice(0, 20)
    )
    setDoneBloodTokens(
      String(event.categoryData?.blood_token || '')
        .split('|')
        .map(x => x.trim())
        .filter(Boolean)
        .concat([''])
        .slice(0, 20)
    )
    setDoneFormError('')
    setMarkDoneEventId(event.id)
    setShowDoneForm(true)
  }

  const handleMarkDone = e => {
    e.preventDefault()
    if (!markDoneEvent || !markDoneCategoryConfig) return
    const values = doneFields[markDoneEvent.category] || {}
    for (const field of markDoneCategoryConfig.fields) {
      if (field.key === 'blood_token') {
        const tokenValue = Array.isArray(doneBloodTokens)
          ? doneBloodTokens.map(item => String(item || '').trim()).filter(Boolean).join('|')
          : ''
        if (!tokenValue) {
          setDoneFormError(`${field.label} is required.`)
          return
        }
        continue
      }
      const value = values[field.key]
      if (String(value).trim() === '') {
        setDoneFormError(`${field.label} is required.`)
        return
      }
      if (field.type === 'number' && Number.isNaN(Number(value))) {
        setDoneFormError(`${field.label} must be a valid number.`)
        return
      }
    }
    const nextCategoryData = markDoneCategoryConfig.fields.reduce((acc, field) => {
      if (field.key === 'blood_token') return acc
      const raw = values[field.key]
      if (field.type === 'number') acc[field.key] = Number(raw)
      else acc[field.key] = raw
      return acc
    }, {})
    const partnersValue = Array.isArray(donePartners)
      ? donePartners.map(item => String(item || '').trim()).filter(Boolean).join('|')
      : ''
    const bloodTokensValue = Array.isArray(doneBloodTokens)
      ? doneBloodTokens.map(item => String(item || '').trim()).filter(Boolean).join('|')
      : ''
    setEvents(prev =>
      prev.map(item =>
        item.id === markDoneEvent.id
          ? {
              ...item,
              status: 'done',
              categoryData: {
                ...nextCategoryData,
                partners: partnersValue,
                ...(markDoneEvent.category === 'blood_letting' ? { blood_token: bloodTokensValue } : {}),
              },
              completedAt: dayjs().toISOString(),
            }
          : item
      )
    )
    setShowDoneForm(false)
    setMarkDoneEventId(null)
    setDoneFormError('')
  }

  const handleConfirmAction = () => {
    if (!pendingConfirmation || !canManageEvents) return

    if (pendingConfirmation.type === 'delete') {
      deleteEvent(pendingConfirmation.eventId)
      if (editingEventId && pendingConfirmation.eventId === editingEventId) {
        resetForm()
        setShowEventForm(false)
      }
    }

    if (pendingConfirmation.type === 'update') {
      const { eventId, payload } = pendingConfirmation
      setEvents(prev =>
        prev.map(event =>
          event.id === eventId
            ? {
                ...event,
                ...payload,
                updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
              }
            : event
        )
      )
      resetForm()
      setShowEventForm(false)
    }

    setPendingConfirmation(null)
  }

  const markEventSeen = eventId => {
    if (!user?.id) return
    setEvents(prev =>
      prev.map(event => {
        if (event.id !== eventId) return event
        const existingViewers = Array.isArray(event.viewedBy) ? event.viewedBy : []
        const alreadySeen = existingViewers.some(viewer => viewer?.userId === user.id)
        if (alreadySeen) return event
        return {
          ...event,
          viewedBy: [
            ...existingViewers,
            {
              userId: user.id,
              userName: user.name || 'Unknown user',
              viewedAt: dayjs().format('YYYY-MM-DD HH:mm'),
            },
          ],
        }
      })
    )
  }

  const renderDoneDetails = item => {
    if (item.status !== 'done') return null
    const partners = splitPipe(item.categoryData?.partners)
    const tokens = item.category === 'blood_letting' ? splitPipe(item.categoryData?.blood_token) : []
    const configFields = CATEGORY_CONFIG[item.category]?.fields || []
    const showAny =
      partners.length > 0 ||
      tokens.length > 0 ||
      configFields.some(field => field.key !== 'blood_token' && item.categoryData?.[field.key] !== undefined && String(item.categoryData?.[field.key] ?? '').trim() !== '')

    if (!showAny) return null

    return (
      <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-3">
        <p className="text-sm font-semibold text-green-800">Done Details</p>

        {partners.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600">Partners</p>
            <div className="flex flex-wrap gap-2">
              {partners.map(partner => (
                <span key={partner} className="px-2 py-1 bg-white border border-green-200 rounded-full text-xs text-green-800">
                  {partner}
                </span>
              ))}
            </div>
          </div>
        )}

        {tokens.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600">Tokens</p>
            <div className="flex flex-wrap gap-2">
              {tokens.map((token, idx) => (
                <span key={`${token}-${idx}`} className="px-2 py-1 bg-white border border-green-200 rounded-full text-xs text-green-800">
                  {token}
                </span>
              ))}
            </div>
          </div>
        )}

        {configFields.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {configFields
              .filter(field => field.key !== 'blood_token')
              .map(field => {
                const value = item.categoryData?.[field.key]
                if (value === undefined || value === null || String(value).trim() === '') return null
                return (
                  <div key={field.key} className="px-3 py-2 rounded bg-white border border-green-200">
                    <p className="text-xs text-gray-500">{field.label}</p>
                    <p className="font-medium text-gray-800">{String(value)}</p>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    )
  }

  const getMonthColor = () => 'from-red-500 to-red-600'

  const getCategoryLabel = category => CATEGORY_CONFIG[category]?.label || 'Uncategorized'
  const selectedCategoryKey = getCategoryKeyFromLabel(selectedCategory)
  const selectedCategoryListMeta = selectedCategoryKey ? CATEGORY_META[selectedCategoryKey] : null
  const listHeading = selectedCategory === 'All' ? 'All Events' : `${selectedCategory} Events`

  if (listOnly) {
    return (
      <div className="animate-fade-in max-w-7xl 2xl:max-w-[1500px] mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-red-600 bg-white p-6 sm:p-7 shadow-lg mb-6">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{listHeading}</h2>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">All months, newest to oldest</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {selectedCategory !== 'All' && (
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold bg-white ${selectedCategoryListMeta?.text || 'text-gray-700'} border-red-200`}>
                  Active Category: {selectedCategory}
                </span>
              )}
              {selectedCategory !== 'All' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All')
                    updateCategoryRoute('All')
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <X size={12} />
                  Remove Filter
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden layout-glow animate-fade-in-up border border-red-600">
          <div className="p-4 sm:p-6 md:p-7 space-y-5">
            <div className="flex flex-col lg:flex-row gap-4">
              <input
                type="text"
                placeholder="Search events by title, content, address, or category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
              <select
                value={selectedCategory}
                onChange={e => {
                  const next = e.target.value
                  setSelectedCategory(next)
                  updateCategoryRoute(next)
                }}
                className="lg:w-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              >
                <option value="All">All Categories</option>
                {CATEGORY_KEYS.map(category => (
                  <option key={category} value={CATEGORY_CONFIG[category].label}>
                    {CATEGORY_CONFIG[category].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All')
                  updateCategoryRoute('All')
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  selectedCategory === 'All'
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {CATEGORY_KEYS.map(categoryKey => (
                <button
                  key={categoryKey}
                  type="button"
                  onClick={() => {
                    const next = CATEGORY_CONFIG[categoryKey].label
                    setSelectedCategory(next)
                    updateCategoryRoute(next)
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selectedCategory === CATEGORY_CONFIG[categoryKey].label
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {CATEGORY_CONFIG[categoryKey].label}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
              {allFilteredItems.map(item => {
                const isExpanded = expandedItemId === item.id
                const involvedMemberNames = Array.isArray(item.assignedMemberIds)
                  ? item.assignedMemberIds.map(memberId => memberNameById[memberId] || `Member ${memberId}`)
                  : []
                const membersInvolveText = involvedMemberNames.length > 0 ? involvedMemberNames.join(', ') : (item.membersInvolve || '')
                return (
                  <div
                    key={item.id}
                    ref={el => {
                      eventRefs.current[item.id] = el
                    }}
                    className={`layout-glow rounded-xl border bg-gray-50 transition-all duration-500 ${
                      highlightedEventId === item.id
                        ? 'border-red-400 ring-2 ring-red-300 shadow-lg shadow-red-100'
                        : 'border-gray-200'
                    }`}
                  >
                    <div
                      onClick={() =>
                        setExpandedItemId(prev => {
                          const next = prev === item.id ? null : item.id
                          if (next === item.id) markEventSeen(item.id)
                          return next
                        })
                      }
                      className="w-full p-4 text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs uppercase tracking-wide text-gray-500">{getCategoryLabel(item.category)}</span>
                          {item.branch && <span className="ml-2 text-xs text-red-600 font-medium">{item.branch}</span>}
                          <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${item.status === 'done' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {item.status === 'done' ? 'Done' : 'On-going'}
                          </span>
                          <h4 className="font-semibold text-gray-800 mt-1 truncate">{item.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{dayjs(item.dateTime).format('MMMM D, YYYY h:mm A')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManageEvents && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                confirmDeleteEvent(item.id)
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <span className="text-xs text-gray-500">{isExpanded ? 'Hide' : 'Expand'}</span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200 pt-3 text-sm text-gray-700">
                        <div className={`${item.address ? 'grid grid-cols-1 lg:grid-cols-2 gap-3 items-start' : ''}`}>
	                          <div className="space-y-3">
	                            <p>{item.content || 'No content provided.'}</p>
	                            {renderDoneDetails(item)}
	                            <div className="flex items-center gap-2 text-gray-600">
	                              <Clock size={14} />
	                              <span>{dayjs(item.dateTime).format('h:mm A')}</span>
	                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <User size={14} />
                              <span>{item.createdBy || 'Unknown creator'}</span>
                            </div>
                            {item.address && (
                              <div className="flex items-start gap-2 text-gray-600">
                                <MapPin size={14} className="mt-0.5" />
                                <span>{item.address}</span>
                              </div>
                            )}
                            {membersInvolveText && (
                              <div className="flex items-start gap-2 text-gray-600">
                                <Users size={14} className="mt-0.5" />
                                <span>Members Involve: {membersInvolveText}</span>
                              </div>
                            )}
                            {Array.isArray(item.assignedMemberIds) && item.assignedMemberIds.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {item.assignedMemberIds.map(memberId => (
                                  <span key={memberId} className="px-2 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-700">
                                    {memberNameById[memberId] || `Member ${memberId}`}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="pt-1">
                              <div className="flex items-center gap-2 text-gray-600 mb-1">
                                <Eye size={14} />
                                <span className="text-xs font-medium">
                                  Seen by {Array.isArray(item.viewedBy) ? item.viewedBy.length : 0}
                                </span>
                              </div>
                              {Array.isArray(item.viewedBy) && item.viewedBy.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {item.viewedBy.map(viewer => (
                                    <span
                                      key={`${viewer.userId}-${viewer.viewedAt}`}
                                      className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700"
                                    >
                                      {viewer.userName}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No viewers yet.</p>
                              )}
                            </div>
                            {canManageEvents && (
                              <div className="pt-2 flex items-center gap-2">
                                {item.status !== 'done' && (
                                  <button
                                    type="button"
                                    onClick={() => openMarkDoneForm(item)}
                                    className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                                  >
                                    Mark as Done
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEventForEdit(item)}
                                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                                >
                                  Update
                                </button>
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteEvent(item.id)}
                                  className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          {item.address && <ReadOnlyEventMap address={item.address} location={item.location || null} />}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {allFilteredItems.length === 0 && (
                <div className="text-center py-12">
                  <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No events found for this filter.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-7xl 2xl:max-w-[1500px] mx-auto text-gray-900 dark:text-zinc-100">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">Calendar</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {selectedMonth ? `Events in ${selectedMonth.monthLabel}` : 'Select a month to view events'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const nextShowAll = !showAllMonths
              setSelectedMonthKey(null)
              setExpandedItemId(null)
              setSelectedDateFilter('')
              setShowAllMonths(nextShowAll)
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showAllMonths && !selectedMonth
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
          >
            <CalendarIcon size={16} />
            {showAllMonths ? 'Event Months' : 'All Months'}
          </button>
          {canManageEvents && (
            <button
              type="button"
              onClick={() => {
                resetForm()
                setShowEventForm(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
            >
              <Plus size={18} />
              Add Event
            </button>
          )}
        </div>
      </div>

      {!selectedMonth && (
        <div className="flex items-center justify-between mb-7">
          <button onClick={() => setCurrentYear(prev => prev - 1)} className="p-2 rounded-lg bg-white shadow-md hover:bg-gray-50 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h3 className="text-xl font-semibold text-gray-800">{currentYear}</h3>
          <button onClick={() => setCurrentYear(prev => prev + 1)} className="p-2 rounded-lg bg-white shadow-md hover:bg-gray-50 transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      )}

      {!selectedMonth && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 auto-rows-fr">
          {visibleMonths.map((month, index) => (
            <button
              key={month.monthKey}
              onClick={() => {
                setSelectedMonthKey(month.monthKey)
                setShowAllMonths(false)
                setExpandedItemId(null)
                setSelectedDateFilter('')
              }}
              className={`layout-glow relative h-full min-h-[170px] sm:min-h-[190px] text-left rounded-xl p-6 border transition-all transform overflow-hidden ${
                month.hasEvents
                  ? 'bg-white shadow-md border-red-200 hover:shadow-xl hover:border-red-300 hover:-translate-y-1'
                  : 'bg-gray-50 shadow-sm border-gray-200 opacity-70 hover:opacity-90'
              }`}
            >
              {month.hasEvents && <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getMonthColor(index)}`} />}
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        month.hasEvents
                          ? `bg-gradient-to-r ${getMonthColor(index)} text-white`
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      <CalendarIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{month.monthName}</p>
                      <p className="text-xs text-gray-500">{currentYear}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      month.hasEvents ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {month.items.length}
                  </span>
                </div>

                {month.hasEvents && (
                  <div className="mt-3 space-y-2">
                    {month.items.map((item, itemIndex) => {
                      const categoryKey = String(item.category || '').toLowerCase()
                      const categoryLabel = CATEGORY_CONFIG[categoryKey]?.label || item.category || 'Uncategorized'
                      return (
                        <div
                          key={`${month.monthKey}-${item.id || itemIndex}`}
                          className="rounded-md border p-2 transition-colors cursor-pointer bg-gray-50 border-gray-200 hover:bg-red-50 hover:border-red-200"
                          onClick={e => {
                            e.stopPropagation()
                            setSelectedMonthKey(month.monthKey)
                            setShowAllMonths(false)
                            setExpandedItemId(item.id)
                            setSelectedDateFilter('')
                          }}
                        >
                          <p className="text-[11px] text-gray-500 truncate">
                            <span className="font-semibold text-red-700">{categoryLabel}</span> | {dayjs(item.dateTime).format('MMM D, YYYY')}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-700 truncate">{item.title || 'Untitled Event'}</p>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              item.status === 'done'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-red-100 text-red-700 border-red-200'
                            }`}>
                              {item.status === 'done' ? 'Done' : 'On-going'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {!selectedMonth && !showAllMonths && visibleMonths.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 mt-5">
          No months with events for {currentYear}. Click <span className="font-semibold text-gray-700">All Months</span> to show every month.
        </div>
      )}

      {selectedMonth && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-6xl mx-auto layout-glow dark:bg-zinc-900 dark:border dark:border-zinc-700 border border-red-600">
          <div className="bg-gradient-to-r from-white to-gray-100 dark:from-gray-900 dark:to-black p-5 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedMonth.monthLabel}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedMonth.items.length} event(s)</p>
            </div>
            <button
              onClick={() => {
                setSelectedMonthKey(null)
                setShowAllMonths(false)
                setExpandedItemId(null)
                setSelectedDateFilter('')
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          </div>

          <div className="p-4 sm:p-6 md:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search events by title, content, address, or category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="sm:w-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              >
                <option value="All">All Categories</option>
                {CATEGORY_KEYS.map(category => (
                  <option key={category} value={CATEGORY_CONFIG[category].label}>
                    {CATEGORY_CONFIG[category].label}
                  </option>
                ))}
              </select>
            </div>
            {selectedDateFilter && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-sm text-red-700">
                  Showing events for {dayjs(selectedDateFilter).format('MMMM D, YYYY')}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter('')}
                  className="text-xs px-2 py-1 rounded bg-white border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
                >
                  Clear Date Filter
                </button>
              </div>
            )}

            <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
            {filteredItems.map(item => {
              const isExpanded = expandedItemId === item.id
              const involvedMemberNames = Array.isArray(item.assignedMemberIds)
                ? item.assignedMemberIds.map(memberId => memberNameById[memberId] || `Member ${memberId}`)
                : []
              const membersInvolveText = involvedMemberNames.length > 0 ? involvedMemberNames.join(', ') : (item.membersInvolve || '')
              return (
                  <div
                    key={item.id}
                    ref={el => {
                      eventRefs.current[item.id] = el
                    }}
                    className={`layout-glow rounded-xl border bg-gray-50 transition-all duration-500 ${
                      highlightedEventId === item.id
                        ? 'border-red-400 ring-2 ring-red-300 shadow-lg shadow-red-100'
                        : 'border-gray-200'
                    }`}
                  >
                    <div
                      onClick={() =>
                        setExpandedItemId(prev => {
                          const next = prev === item.id ? null : item.id
                          if (next === item.id) markEventSeen(item.id)
                          return next
                        })
                      }
                      className="w-full p-4 text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs uppercase tracking-wide text-gray-500">{getCategoryLabel(item.category)}</span>
                          {item.branch && <span className="ml-2 text-xs text-red-600 font-medium">{item.branch}</span>}
                          <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${item.status === 'done' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {item.status === 'done' ? 'Done' : 'On-going'}
                          </span>
                          <h4 className="font-semibold text-gray-800 mt-1 truncate">{item.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{dayjs(item.dateTime).format('MMMM D, YYYY h:mm A')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManageEvents && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                confirmDeleteEvent(item.id)
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <span className="text-xs text-gray-500">{isExpanded ? 'Hide' : 'Expand'}</span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200 pt-3 text-sm text-gray-700">
                        <div className={`${item.address ? 'grid grid-cols-1 lg:grid-cols-2 gap-3 items-start' : ''}`}>
	                          <div className="space-y-3">
	                            <p>{item.content || 'No content provided.'}</p>
	                            {renderDoneDetails(item)}
	                            <div className="flex items-center gap-2 text-gray-600">
	                              <Clock size={14} />
	                              <span>{dayjs(item.dateTime).format('h:mm A')}</span>
	                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <User size={14} />
                              <span>{item.createdBy || 'Unknown creator'}</span>
                            </div>
                            {item.address && (
                              <div className="flex items-start gap-2 text-gray-600">
                                <MapPin size={14} className="mt-0.5" />
                                <span>{item.address}</span>
                              </div>
                            )}
                            {membersInvolveText && (
                              <div className="flex items-start gap-2 text-gray-600">
                                <Users size={14} className="mt-0.5" />
                                <span>Members Involve: {membersInvolveText}</span>
                              </div>
                            )}
                            {Array.isArray(item.assignedMemberIds) && item.assignedMemberIds.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {item.assignedMemberIds.map(memberId => (
                                  <span key={memberId} className="px-2 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-700">
                                    {memberNameById[memberId] || `Member ${memberId}`}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="pt-1">
                              <div className="flex items-center gap-2 text-gray-600 mb-1">
                                <Eye size={14} />
                                <span className="text-xs font-medium">
                                  Seen by {Array.isArray(item.viewedBy) ? item.viewedBy.length : 0}
                                </span>
                              </div>
                              {Array.isArray(item.viewedBy) && item.viewedBy.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {item.viewedBy.map(viewer => (
                                    <span
                                      key={`${viewer.userId}-${viewer.viewedAt}`}
                                      className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700"
                                    >
                                      {viewer.userName}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No viewers yet.</p>
                              )}
                            </div>
                            {canManageEvents && (
                              <div className="pt-2 flex items-center gap-2">
                                {item.status !== 'done' && (
                                  <button
                                    type="button"
                                    onClick={() => openMarkDoneForm(item)}
                                    className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                                  >
                                    Mark as Done
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEventForEdit(item)}
                                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                                >
                                  Update
                                </button>
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteEvent(item.id)}
                                  className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          {item.address && <ReadOnlyEventMap address={item.address} location={item.location || null} />}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No events found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {canManageEvents && showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="relative isolate w-full max-w-3xl animate-fade-in-up max-h-[92vh] overflow-y-auto rounded-2xl border border-transparent [background:linear-gradient(#ffffff,#ffffff)_padding-box,linear-gradient(135deg,rgba(248,113,113,.55),rgba(185,28,28,.28),rgba(15,23,42,.4))_border-box] shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 sticky top-0 bg-white z-50 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-gray-800">{editingEventId ? 'Update Event' : 'Create New Event'}</h3>
              <button
                onClick={() => {
                  resetForm()
                  setShowEventForm(false)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="p-4 sm:p-6 space-y-5">
              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="layout-glow rounded-2xl p-4 sm:p-5 bg-white">
                <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Category</h4>
                <div className="space-y-4">
	                  <div className="grid grid-cols-1 gap-4">
	                    <div>
	                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
	                      <div className="relative">
                        <SelectedCategoryIcon
                          size={16}
                          className={`absolute left-3 top-1/2 -translate-y-1/2 ${selectedCategoryMeta?.text || 'text-gray-500'} ${selectedCategoryMeta?.iconClass || ''}`}
                        />
	                        <select
	                          value={formData.category}
	                          onChange={e => setFormData({ ...formData, category: e.target.value })}
	                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
	                          required
	                        >
	                          <option value="" disabled>
	                            Select category
	                          </option>
	                          {CREATE_CATEGORY_KEYS.map(category => (
	                            <option key={category} value={category}>
	                              {CATEGORY_CONFIG[category].label}
	                            </option>
	                          ))}
	                          {!CREATE_CATEGORY_KEYS.includes(formData.category) &&
	                            formData.category &&
	                            CATEGORY_CONFIG[formData.category] && (
	                              <option value={formData.category}>
	                                {CATEGORY_CONFIG[formData.category].label}
	                              </option>
	                            )}
	                        </select>
	                      </div>
	                    </div>
	                  </div>

	                  {/* Partners + Activity fields are collected when marking an event as Done. */}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <textarea
                      value={formData.content}
                      onChange={e => setFormData({ ...formData, content: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date and Time</label>
                      <input
                        type="datetime-local"
                        value={formData.dateTime}
                        onChange={e => setFormData({ ...formData, dateTime: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                    </div>
                  </div>
                  {formData.category === 'notes' && (
                    <AssignMembersPicker
                      allMembers={assignableMembers}
                      selectedIds={formData.assignedMemberIds}
                      onChange={nextIds => setFormData({ ...formData, assignedMemberIds: nextIds })}
                      label="Members Involve"
                      placeholder="Search and select members to involve..."
                    />
                  )}

                </div>
              </div>

              <div className="layout-glow relative isolate z-0 rounded-2xl p-4 sm:p-5 bg-white">
                <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Location</h4>
                <EventLocationPicker
                  address={formData.address}
                  location={formData.location}
                  onAddressInput={value =>
                    setFormData(prev => ({
                      ...prev,
                      address: value,
                      location: null,
                    }))
                  }
                  onLocationSelect={({ address, location }) =>
                    setFormData(prev => ({
                      ...prev,
                      address,
                      location,
                    }))
                  }
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all"
                >
                  {editingEventId ? 'Save Changes' : 'Save Event'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    setShowEventForm(false)
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

	      {canManageEvents && showDoneForm && markDoneEvent && (
	        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-3 sm:p-4">
	          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-red-100 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <MarkDoneIcon size={16} className="text-green-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Mark Event as Done</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDoneForm(false)
                  setMarkDoneEventId(null)
                  setDoneFormError('')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

	            <form onSubmit={handleMarkDone} className="p-4 sm:p-6 space-y-5">
	              {doneFormError && <p className="text-sm text-red-600">{doneFormError}</p>}

	              <div className="space-y-2">
	                <div className="flex items-center justify-between gap-2">
	                  <Label>Partners</Label>
	                  <Button
	                    type="button"
	                    size="sm"
	                    variant="secondary"
	                    onClick={() => setDonePartners(prev => [...(Array.isArray(prev) ? prev : []), ''])}
	                  >
	                    + Add row
	                  </Button>
	                </div>
	                <div className="space-y-2">
	                  {(Array.isArray(donePartners) ? donePartners : ['']).map((value, index) => (
	                    <div key={`done-partner-${index}`} className="flex items-center gap-2">
	                      <Input
	                        value={value}
	                        onChange={e => {
	                          const next = [...donePartners]
	                          next[index] = e.target.value
	                          setDonePartners(next)
	                        }}
	                        placeholder={`Partner ${index + 1}`}
	                      />
	                      <Button
	                        type="button"
	                        size="icon"
	                        variant="outline"
	                        onClick={() => {
	                          const next = donePartners.filter((_, i) => i !== index)
	                          setDonePartners(next.length ? next : [''])
	                        }}
	                        aria-label="Remove partner"
	                      >
	                        <X size={16} />
	                      </Button>
	                    </div>
	                  ))}
	                </div>
	                <p className="text-xs text-gray-500">Saved as pipe-separated values.</p>
	              </div>

	              {markDoneCategoryConfig && markDoneCategoryConfig.fields.length > 0 ? (
	                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
	                  <p className="text-sm font-semibold text-gray-800">Activity Fields</p>
	                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
	                    {markDoneCategoryConfig.fields.map(field => (
	                      <div key={field.key} className={field.type === 'text' ? 'md:col-span-2' : ''}>
	                        <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
	                        {field.key === 'blood_token' ? (
	                          <div className="space-y-2 md:col-span-2">
	                            <div className="flex items-center justify-between gap-2">
	                              <span className="text-xs text-gray-500">Add multiple tokens</span>
	                              <Button
	                                type="button"
	                                size="sm"
	                                variant="secondary"
	                                onClick={() => setDoneBloodTokens(prev => [...(Array.isArray(prev) ? prev : []), ''])}
	                              >
	                                + Add row
	                              </Button>
	                            </div>
	                            <div className="space-y-2">
	                              {(Array.isArray(doneBloodTokens) ? doneBloodTokens : ['']).map((value, index) => (
	                                <div key={`done-token-${index}`} className="flex items-center gap-2">
	                                  <Input
	                                    value={value}
	                                    onChange={e => {
	                                      const next = [...doneBloodTokens]
	                                      next[index] = e.target.value
	                                      setDoneBloodTokens(next)
	                                    }}
	                                    placeholder={`Token ${index + 1}`}
	                                  />
	                                  <Button
	                                    type="button"
	                                    size="icon"
	                                    variant="outline"
	                                    onClick={() => {
	                                      const next = doneBloodTokens.filter((_, i) => i !== index)
	                                      setDoneBloodTokens(next.length ? next : [''])
	                                    }}
	                                    aria-label="Remove token"
	                                  >
	                                    <X size={16} />
	                                  </Button>
	                                </div>
	                              ))}
	                            </div>
	                            <p className="text-xs text-gray-500">Saved as pipe-separated values.</p>
	                          </div>
	                        ) : field.type === 'select' ? (
	                          <select
	                            value={doneFields[markDoneEvent.category]?.[field.key] ?? ''}
	                            onChange={e => handleDoneFieldChange(markDoneEvent.category, field.key, e.target.value)}
	                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
	                            required
	                          >
	                            <option value="">Select</option>
	                            {(field.options || []).map(optionValue => (
	                              <option key={optionValue} value={optionValue}>
	                                {optionValue}
	                              </option>
	                            ))}
	                          </select>
	                        ) : field.type === 'number' ? (
	                          <Input
	                            type="number"
	                            min={field.min}
	                            step={field.step}
	                            value={doneFields[markDoneEvent.category]?.[field.key] ?? ''}
	                            onChange={e => handleDoneFieldChange(markDoneEvent.category, field.key, e.target.value)}
	                            required
	                          />
	                        ) : (
	                          <Input
	                            value={doneFields[markDoneEvent.category]?.[field.key] ?? ''}
	                            onChange={e => handleDoneFieldChange(markDoneEvent.category, field.key, e.target.value)}
	                            required
	                          />
	                        )}
	                      </div>
	                    ))}
	                  </div>
	                </div>
	              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDoneForm(false)
                    setMarkDoneEventId(null)
                    setDoneFormError('')
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Mark Done
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingConfirmation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 p-6 animate-fade-in-up">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmation</h3>
            <p className="text-sm text-gray-600 mb-6">
              {pendingConfirmation.type === 'update'
                ? 'Are you sure you want to update this event?'
                : 'Are you sure you want to delete this event? This action cannot be undone.'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingConfirmation(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Calendar

