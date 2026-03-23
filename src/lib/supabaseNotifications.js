import { isSupabaseConfigured, supabase } from './supabaseClient'

export const isSupabaseEnabled = () => Boolean(isSupabaseConfigured && supabase)

let notificationsInflight = null

export const fetchMyNotifications = async (userId, limit = 50) => {
  if (!isSupabaseEnabled()) return { data: [], error: null }
  const id = String(userId || '').trim()
  if (!id) return { data: [], error: null }

  if (notificationsInflight) return notificationsInflight

  notificationsInflight = (async () => {
  const { data, error } = await supabase
    .from('notifications')
    .select('id,user_id,type,event_id,title,category,date_time,details,assigned_by,created_at,read_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)
    return { data: Array.isArray(data) ? data : [], error: error || null }
  })().finally(() => {
    notificationsInflight = null
  })

  return notificationsInflight
}

export const insertAssignmentNotifications = async ({ memberIds, event, assignedBy }) => {
  if (!isSupabaseEnabled()) return { error: new Error('Supabase not configured.') }
  const ids = Array.isArray(memberIds) ? Array.from(new Set(memberIds.map(x => String(x)).filter(Boolean))) : []
  if (ids.length === 0) return { error: null }

  const rows = ids.map(memberId => ({
    user_id: memberId,
    type: 'assignment',
    event_id: event?.id ?? null,
    title: event?.title || 'Untitled Event',
    category: event?.category || 'notes',
    date_time: event?.dateTime || null,
    details: [event?.content, event?.address].filter(Boolean).join(' • '),
    assigned_by: assignedBy || null,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  return { error: error || null }
}

export const markNotificationRead = async (notificationId) => {
  if (!isSupabaseEnabled()) return { error: new Error('Supabase not configured.') }
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  return { error: error || null }
}
