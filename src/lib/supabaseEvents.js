import dayjs from 'dayjs'
import { isSupabaseConfigured, supabase } from './supabaseClient'

export const isSupabaseEnabled = () => Boolean(isSupabaseConfigured && supabase)

const EVENTS_CACHE_TTL_MS = 10_000
let eventsCache = { at: 0, data: [] }
let eventsInflight = null

export const invalidateSupabaseEventsCache = () => {
  eventsCache = { at: 0, data: [] }
  eventsInflight = null
}

const normalizeEventCategoryKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const splitCategoryAndType = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return { category: '', type: '' }
  const parts = raw.split(' - ')
  if (parts.length === 1) return { category: parts[0], type: '' }
  const category = parts.shift()?.trim() || ''
  const type = parts.join(' - ').trim() || ''
  return { category, type }
}

const EVENT_CATEGORY_KEY_ALIASES = {
  relief_operations: 'relief_operation',
  fire_responses: 'fire_response',
  water_distributions: 'water_distribution',
  blood_lettings: 'blood_letting',
}

const canonicalizeEventCategoryKey = (key) => EVENT_CATEGORY_KEY_ALIASES[key] || key
const toEventCategoryKey = (value) => {
  const { category } = splitCategoryAndType(value)
  return canonicalizeEventCategoryKey(normalizeEventCategoryKey(category))
}

export const mapEventRowToEvent = (row) => {
  if (!row) return null
  return {
    id: row.id,
    title: row.title || '',
    content: row.content || '',
    dateTime: row.date_time ? dayjs(row.date_time).format('YYYY-MM-DDTHH:mm') : '',
    address: row.address || '',
    location: row.location && typeof row.location === 'object' ? row.location : null,
    branch: row.branch || '',
    membersInvolve: row.members_involve || '',
    assignedMemberIds: Array.isArray(row.assigned_member_ids) ? row.assigned_member_ids : [],
    viewedBy: Array.isArray(row.viewed_by) ? row.viewed_by : [],
    category: toEventCategoryKey(row.category) || '',
    categoryData: row.category_data && typeof row.category_data === 'object' ? row.category_data : {},
    status: row.status === 'done' ? 'done' : 'ongoing',
    completedAt: row.completed_at || null,
    createdBy: row.created_by_name || '',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}

export const fetchSupabaseEvents = async (options = {}) => {
  if (!isSupabaseEnabled()) return { data: [], error: null }

  const { force = false } = options || {}
  const now = Date.now()
  if (!force && eventsCache.at && now - eventsCache.at < EVENTS_CACHE_TTL_MS) {
    return { data: Array.isArray(eventsCache.data) ? eventsCache.data : [], error: null }
  }

  if (eventsInflight) return eventsInflight

  eventsInflight = (async () => {
    const { data, error } = await supabase
      .from('events')
      .select(
        'id,title,content,category,date_time,address,location,branch,members_involve,assigned_member_ids,status,category_data,viewed_by,created_by,created_by_name,created_at,updated_at,completed_at'
      )
      .order('date_time', { ascending: false })

    if (error) return { data: [], error }
    const mapped = Array.isArray(data) ? data.map(mapEventRowToEvent).filter(Boolean) : []
    eventsCache = { at: Date.now(), data: mapped }
    return { data: mapped, error: null }
  })().finally(() => {
    eventsInflight = null
  })

  return eventsInflight
}

export const insertSupabaseEvent = async (event, currentUser) => {
  if (!isSupabaseEnabled()) return { error: new Error('Supabase not configured.') }
  const payload = {
    id: event.id,
    title: event.title || '',
    content: event.content || '',
    category: toEventCategoryKey(event.category) || '',
    date_time: event.dateTime,
    address: event.address || '',
    location: event.location || null,
    branch: event.branch || '',
    members_involve: event.membersInvolve || '',
    assigned_member_ids: Array.isArray(event.assignedMemberIds) ? event.assignedMemberIds : [],
    status: event.status === 'done' ? 'done' : 'ongoing',
    category_data: event.categoryData && typeof event.categoryData === 'object' ? event.categoryData : {},
    viewed_by: Array.isArray(event.viewedBy) ? event.viewedBy : [],
    created_by: currentUser?.id || null,
    created_by_name: currentUser?.name || null,
    completed_at: event.completedAt || null,
  }

  const { error } = await supabase.from('events').insert(payload)
  if (!error) invalidateSupabaseEventsCache()
  return { error: error || null }
}

export const updateSupabaseEvent = async (eventId, payload) => {
  if (!isSupabaseEnabled()) return { error: new Error('Supabase not configured.') }
  const dbPatch = {
    title: payload.title || '',
    content: payload.content || '',
    category: toEventCategoryKey(payload.category) || '',
    date_time: payload.dateTime,
    address: payload.address || '',
    location: payload.location || null,
    branch: payload.branch || '',
    members_involve: payload.membersInvolve || '',
    assigned_member_ids: Array.isArray(payload.assignedMemberIds) ? payload.assignedMemberIds : [],
    category_data: payload.categoryData && typeof payload.categoryData === 'object' ? payload.categoryData : {},
  }

  const { error } = await supabase.from('events').update(dbPatch).eq('id', eventId)
  if (!error) invalidateSupabaseEventsCache()
  return { error: error || null }
}

export const deleteSupabaseEvent = async (eventId) => {
  if (!isSupabaseEnabled()) return { error: new Error('Supabase not configured.') }
  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (!error) invalidateSupabaseEventsCache()
  return { error: error || null }
}

export const markSupabaseEventDone = async (eventId, patch) => {
  if (!isSupabaseEnabled()) return { error: new Error('Supabase not configured.') }
  const dbPatch = {
    status: 'done',
    category_data: patch.categoryData && typeof patch.categoryData === 'object' ? patch.categoryData : {},
    completed_at: patch.completedAt || new Date().toISOString(),
  }
  const { error } = await supabase.from('events').update(dbPatch).eq('id', eventId)
  if (!error) invalidateSupabaseEventsCache()
  return { error: error || null }
}

