
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
  GitBranch,
  Users,
  Check,
  Eye,
} from 'lucide-react'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

const CATEGORY_CONFIG = {
  environmental: {
    label: 'Environmental',
    fields: [
      { key: 'seedlingsUsed', label: 'Seedlings Used', type: 'number', min: 0, step: 1 },
      { key: 'expenses', label: 'Expenses', type: 'number', min: 0, step: 0.01 },
    ],
  },
  'relief operation': {
    label: 'Relief Operation',
    fields: [
      { key: 'foodPacks', label: 'Food Packs', type: 'number', min: 0, step: 1 },
      { key: 'expenses', label: 'Expenses', type: 'number', min: 0, step: 0.01 },
      { key: 'familiesAccommodated', label: 'Families Accommodated', type: 'number', min: 0, step: 1 },
    ],
  },
  'fire response': {
    label: 'Fire Response',
    fields: [
      { key: 'gallons', label: 'Gallons', type: 'number', min: 0, step: 0.01 },
      { key: 'tank', label: 'Tank', type: 'number', min: 0, step: 1 },
      { key: 'cubicWater', label: 'Cubic Water', type: 'number', min: 0, step: 0.01 },
      { key: 'respondedFireAccident', label: 'Responded Fire Accident (details)', type: 'text' },
      { key: 'expenses', label: 'Expenses', type: 'number', min: 0, step: 0.01 },
    ],
  },
  notes: {
    label: 'Notes',
    fields: [{ key: 'trainings', label: 'Trainings', type: 'number', min: 0, step: 1 }],
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

const CATEGORY_META = {
  environmental: { icon: Leaf, iconClass: 'icon-theme-environmental', bg: 'from-green-50 to-emerald-100', text: 'text-green-700' },
  'relief operation': { icon: Activity, iconClass: 'icon-theme-relief', bg: 'from-blue-50 to-cyan-100', text: 'text-blue-700' },
  'fire response': { icon: Flame, iconClass: 'icon-theme-fire', bg: 'from-orange-50 to-amber-100', text: 'text-orange-700' },
  notes: { icon: FileText, iconClass: 'icon-theme-notes', bg: 'from-indigo-50 to-violet-100', text: 'text-indigo-700' },
  medical: { icon: HeartPulse, iconClass: 'icon-theme-medical', bg: 'from-pink-50 to-rose-100', text: 'text-pink-700' },
}

const CATEGORY_BRANCHES = {
  environmental: ['Mangrove Planting', 'Tree Planting', 'Coastal Clean-Up', 'River Clean-Up', 'Reforestation'],
  'relief operation': ['Typhoon Relief', 'Flood Relief', 'Earthquake Relief', 'Evacuation Support', 'Food Distribution'],
  'fire response': ['Residential Fire', 'Forest Fire', 'Electrical Fire', 'Industrial Fire', 'Emergency Water Supply'],
  notes: ['Meeting', 'Training', 'Seminar', 'Workshop', 'Planning Session'],
  medical: ['Medical Mission', 'Vaccination Drive', 'First Aid Training', 'Blood Letting', 'Health Check-Up'],
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
        assignedMemberIds: Array.isArray(event.assignedMemberIds) ? event.assignedMemberIds : [],
        viewedBy: Array.isArray(event.viewedBy) ? event.viewedBy : [],
        location: resolveStoredLocation(event),
        category: (event.category || 'notes').toLowerCase(),
        categoryData: event.categoryData || {},
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

      <div className="relative isolate z-0 rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
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

function AssignMembersPicker({ allMembers, selectedIds, onChange }) {
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
      <label className="block text-sm font-medium text-gray-700 mb-2">Assign Members</label>
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
          placeholder="Search members by name, committee, or ID..."
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
  const [expandedItemId, setExpandedItemId] = useState(null)
  const [highlightedEventId, setHighlightedEventId] = useState(null)
  const [showEventForm, setShowEventForm] = useState(false)
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
    dynamicFields: getDefaultDynamicFields(),
  })
  const [searchQuery, setSearchQuery] = useState(storedFilters.searchQuery)
  const [selectedCategory, setSelectedCategory] = useState(storedFilters.selectedCategory)
  const [selectedDateFilter, setSelectedDateFilter] = useState('')
  const eventRefs = useRef({})
  const handledRedirectRef = useRef(false)
  const routeCategory = searchParams.get('category') || ''

  useEffect(() => {
    localStorage.setItem('kusgan_events', JSON.stringify(events))
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
        item.branch?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower)
      const selectedLower = selectedCategory.toLowerCase()
      const matchesCategory = selectedCategory === 'All' || item.category === selectedLower
      const matchesDate = !selectedDateFilter || dayjs(item.dateTime).format('YYYY-MM-DD') === selectedDateFilter
      return matchesSearch && matchesCategory && matchesDate
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
          item.branch?.toLowerCase().includes(searchLower) ||
          item.category?.toLowerCase().includes(searchLower)
        const selectedLower = selectedCategory.toLowerCase()
        const matchesCategory = selectedCategory === 'All' || item.category === selectedLower
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf())
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

  const activeCategoryConfig = formData.category ? CATEGORY_CONFIG[formData.category] : null
  const selectedCategoryMeta = CATEGORY_META[formData.category]
  const SelectedCategoryIcon = selectedCategoryMeta?.icon || FileText

  const handleDynamicFieldChange = (categoryKey, fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      dynamicFields: {
        ...prev.dynamicFields,
        [categoryKey]: {
          ...prev.dynamicFields[categoryKey],
          [fieldKey]: value,
        },
      },
    }))
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      dateTime: '',
      address: '',
      location: null,
      category: '',
      branch: '',
      assignedMemberIds: [],
      dynamicFields: getDefaultDynamicFields(),
    })
    setFormError('')
  }

  const validateCategoryFields = () => {
    if (!formData.category) return 'Category is required.'
    const fields = CATEGORY_CONFIG[formData.category].fields
    const categoryValues = formData.dynamicFields[formData.category]
    for (const field of fields) {
      const value = categoryValues[field.key]
      if (String(value).trim() === '') return `${field.label} is required.`
      if (field.type === 'number' && Number.isNaN(Number(value))) return `${field.label} must be a valid number.`
    }
    return ''
  }

  const handleAddEvent = e => {
    e.preventDefault()
    setFormError('')
    if (!canManageEvents) {
      setFormError('You can only view events.')
      return
    }

    if (!formData.title.trim() || !formData.content.trim() || !formData.dateTime || !formData.category || !formData.branch || !formData.address.trim()) {
      setFormError('Title, Content, Date and Time, Category, Branch, and Address are required.')
      return
    }
    if (!formData.assignedMemberIds.length) {
      setFormError('Please assign at least one member.')
      return
    }
    if (!formData.location) {
      setFormError('Please pick a location from search results or map pin.')
      return
    }

    const categoryError = validateCategoryFields()
    if (categoryError) {
      setFormError(categoryError)
      return
    }

    const categoryData = CATEGORY_CONFIG[formData.category].fields.reduce((acc, field) => {
      const raw = formData.dynamicFields[formData.category][field.key]
      acc[field.key] = field.type === 'number' ? Number(raw) : raw
      return acc
    }, {})

    const newEvent = {
      id: Date.now(),
      title: formData.title.trim(),
      content: formData.content.trim(),
      dateTime: formData.dateTime,
      address: formData.address.trim(),
      branch: formData.branch,
      assignedMemberIds: formData.assignedMemberIds,
      viewedBy: [],
      location: formData.location,
      category: formData.category,
      categoryData,
      createdBy: user?.name || 'Unknown',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    }

    setEvents(prev => [newEvent, ...prev])
    resetForm()
    setShowEventForm(false)
  }

  const deleteEvent = eventId => {
    if (!canManageEvents) return
    setEvents(prev => prev.filter(event => event.id !== eventId))
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

  const getMonthColor = monthIndex => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-red-500 to-red-600',
      'from-orange-500 to-orange-600',
      'from-yellow-500 to-yellow-600',
      'from-green-500 to-green-600',
      'from-teal-500 to-teal-600',
      'from-cyan-500 to-cyan-600',
      'from-indigo-500 to-indigo-600',
      'from-violet-500 to-violet-600',
      'from-rose-500 to-rose-600',
    ]
    return colors[monthIndex]
  }

  const getCategoryLabel = category => CATEGORY_CONFIG[category]?.label || 'Uncategorized'
  const selectedCategoryKey = getCategoryKeyFromLabel(selectedCategory)
  const selectedCategoryListMeta = selectedCategoryKey ? CATEGORY_META[selectedCategoryKey] : null
  const listHeading = selectedCategory === 'All' ? 'All Events' : `${selectedCategory} Events`

  if (listOnly) {
    return (
      <div className="animate-fade-in max-w-7xl 2xl:max-w-[1500px] mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-red-100 bg-white p-6 sm:p-7 shadow-lg mb-6">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />
          <div className="relative">
            <h2 className="text-2xl font-bold text-gray-900">{listHeading}</h2>
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

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden layout-glow animate-fade-in-up">
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
                          <h4 className="font-semibold text-gray-800 mt-1 truncate">{item.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{dayjs(item.dateTime).format('MMMM D, YYYY h:mm A')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManageEvents && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                deleteEvent(item.id)
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
                            {item.categoryData && Object.keys(item.categoryData).length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                {CATEGORY_CONFIG[item.category]?.fields.map(field => (
                                  <div key={field.key} className="px-3 py-2 rounded bg-white border border-gray-200">
                                    <p className="text-xs text-gray-500">{field.label}</p>
                                    <p className="font-medium text-gray-800">{String(item.categoryData[field.key] ?? '')}</p>
                                  </div>
                                ))}
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
    <div className="animate-fade-in max-w-7xl 2xl:max-w-[1500px] mx-auto">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
          <p className="text-sm text-gray-500">
            {selectedMonth ? `Events in ${selectedMonth.monthLabel}` : 'Select a month to view events'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedMonthKey(null)
              setExpandedItemId(null)
              setSelectedDateFilter('')
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              selectedMonth
                ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                : 'bg-red-600 text-white border-red-600'
            }`}
          >
            <CalendarIcon size={16} />
            All Months
          </button>
          {canManageEvents && (
            <button
              type="button"
              onClick={() => setShowEventForm(true)}
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
          {allMonthsWithEvents.map((month, index) => (
            <button
              key={month.monthKey}
              onClick={() => {
                setSelectedMonthKey(month.monthKey)
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
              <div className="flex items-center justify-between h-full">
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
            </button>
          ))}
        </div>
      )}

      {selectedMonth && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-6xl mx-auto layout-glow">
          <div className="bg-gradient-to-r from-gray-900 to-black p-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{selectedMonth.monthLabel}</h3>
              <p className="text-sm text-gray-400">{selectedMonth.items.length} event(s)</p>
            </div>
            <button
              onClick={() => {
                setSelectedMonthKey(null)
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
                          <h4 className="font-semibold text-gray-800 mt-1 truncate">{item.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{dayjs(item.dateTime).format('MMMM D, YYYY h:mm A')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManageEvents && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                deleteEvent(item.id)
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
                            {item.categoryData && Object.keys(item.categoryData).length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                {CATEGORY_CONFIG[item.category]?.fields.map(field => (
                                  <div key={field.key} className="px-3 py-2 rounded bg-white border border-gray-200">
                                    <p className="text-xs text-gray-500">{field.label}</p>
                                    <p className="font-medium text-gray-800">{String(item.categoryData[field.key] ?? '')}</p>
                                  </div>
                                ))}
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
              <h3 className="text-lg font-semibold text-gray-800">Create New Event</h3>
              <button onClick={() => setShowEventForm(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="p-4 sm:p-6 space-y-5">
              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="layout-glow rounded-2xl p-4 sm:p-5 bg-white">
                <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Basic Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <textarea
                      value={formData.content}
                      onChange={e => setFormData({ ...formData, content: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <div className="relative">
                        <SelectedCategoryIcon
                          size={16}
                          className={`absolute left-3 top-1/2 -translate-y-1/2 ${selectedCategoryMeta?.text || 'text-gray-500'} ${selectedCategoryMeta?.iconClass || ''}`}
                        />
                        <select
                          value={formData.category}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                              branch: '',
                            })
                          }
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        >
                          <option value="" disabled>
                            Select category
                          </option>
                          {CATEGORY_KEYS.map(category => (
                            <option key={category} value={category}>
                              {CATEGORY_CONFIG[category].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
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

                  {formData.category && (
                    <div className="animate-fade-in-up">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                      <div className="relative">
                        <GitBranch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                          value={formData.branch}
                          onChange={e => setFormData({ ...formData, branch: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        >
                          <option value="" disabled>
                            Select branch
                          </option>
                          {(CATEGORY_BRANCHES[formData.category] || []).map(branch => (
                            <option key={branch} value={branch}>
                              {branch}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
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

              <div className="layout-glow rounded-2xl p-4 sm:p-5 bg-white">
                <AssignMembersPicker
                  allMembers={assignableMembers}
                  selectedIds={formData.assignedMemberIds}
                  onChange={ids => setFormData(prev => ({ ...prev, assignedMemberIds: ids }))}
                />
              </div>

              {formData.category && activeCategoryConfig && (
                <div key={formData.category} className={`rounded-2xl border border-gray-200 p-4 sm:p-5 bg-gradient-to-br ${selectedCategoryMeta?.bg || 'from-gray-50 to-gray-100'} animate-fade-in-up`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`statcard-icon-3d ${selectedCategoryMeta?.iconClass || ''} w-9 h-9 rounded-lg bg-white flex items-center justify-center`}>
                      <SelectedCategoryIcon size={16} className={selectedCategoryMeta?.text || 'text-gray-600'} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{activeCategoryConfig.label} Specific Fields</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeCategoryConfig.fields.map(field => (
                      <div key={field.key} className={field.type === 'text' ? 'md:col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                        {field.type === 'text' ? (
                          <textarea
                            value={formData.dynamicFields[formData.category][field.key]}
                            onChange={e => handleDynamicFieldChange(formData.category, field.key, e.target.value)}
                            rows={2}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            required
                          />
                        ) : (
                          <input
                            type="number"
                            min={field.min}
                            step={field.step}
                            value={formData.dynamicFields[formData.category][field.key]}
                            onChange={e => handleDynamicFieldChange(formData.category, field.key, e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            required
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all">
                  Save Event
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

    </div>
  )
}

export default Calendar
