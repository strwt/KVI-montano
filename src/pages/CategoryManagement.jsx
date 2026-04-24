import { useEffect, useMemo, useState } from 'react'
import { Activity, Droplets, FileText, Flame, HandHeart, HeartPulse, Leaf, Plus, Save, Sparkles, Tags, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/useI18n'
import { supabase } from '../lib/supabaseClient'
import { useConfirm } from '../context/ConfirmContext'

const normalizeCategoryKey = value =>
  String(value || '')
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

const canonicalizeCategoryKey = key => OPERATION_KEY_ALIASES[key] || key
const toCategoryKey = value => canonicalizeCategoryKey(normalizeCategoryKey(value))

const titleCaseFromKey = key =>
  String(key || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()

const CATEGORY_COLOR_SEEDS = {
  tuli: '#eab308', // yellow
  blood_letting: '#f59e0b', // amber
  donations: '#f59e0b', // amber
  environmental: '#22c55e', // green
  relief_operation: '#3b82f6', // blue
  fire_response: '#f97316', // orange
  water_distribution: '#06b6d4', // cyan
  notes: '#6366f1', // indigo
  medical: '#ec4899', // pink
  uncategorized: '#94a3b8', // slate
}

const hashInt = (key) => {
  const input = String(key || '')
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const hexToRgb = (hex) => {
  const raw = String(hex || '').trim().replace(/^#/, '')
  const normalized = raw.length === 3 ? raw.split('').map(ch => `${ch}${ch}`).join('') : raw
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

const rgbToHue = (rgb) => {
  if (!rgb) return null
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  if (delta === 0) return 0

  let hue = 0
  if (max === r) hue = ((g - b) / delta) % 6
  else if (max === g) hue = (b - r) / delta + 2
  else hue = (r - g) / delta + 4

  hue *= 60
  if (hue < 0) hue += 360
  return hue
}

const hueDistance = (a, b) => {
  const diff = Math.abs(a - b) % 360
  return Math.min(diff, 360 - diff)
}

const getHueFromColor = (color) => {
  const raw = String(color || '').trim()
  const hslMatch = raw.match(/hsl\(\s*([0-9.]+)/i)
  if (hslMatch) {
    const hue = Number(hslMatch[1])
    if (Number.isFinite(hue)) return ((hue % 360) + 360) % 360
  }

  const rgb = hexToRgb(raw)
  const hue = rgbToHue(rgb)
  return Number.isFinite(hue) ? hue : null
}

const buildCategoryColorMap = (keys = []) => {
  const inputKeys = Array.isArray(keys) ? keys : []
  const normalizedKeys = inputKeys
    .map(key => toCategoryKey(key))
    .filter(Boolean)
  const uniqueKeys = [...new Set(normalizedKeys)].sort((a, b) => a.localeCompare(b))

  const map = {}
  const usedHues = []

  const rememberHue = (color) => {
    const hue = getHueFromColor(color)
    if (Number.isFinite(hue)) usedHues.push(hue)
  }

  uniqueKeys.forEach((key) => {
    const seeded = CATEGORY_COLOR_SEEDS[key]
    if (!seeded) return
    map[key] = seeded
    rememberHue(seeded)
  })

  uniqueKeys.forEach((key) => {
    if (map[key]) return

    const hash = hashInt(key)
    let hue = hash % 360
    const saturation = 78 + (hash % 10) // 78..87
    const lightness = 44 + ((hash >>> 8) % 10) // 44..53

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const minDistance = usedHues.length ? Math.min(...usedHues.map(existing => hueDistance(existing, hue))) : 999
      if (minDistance >= 18) break
      hue = (hue + 137.508) % 360
    }

    const color = `hsl(${hue.toFixed(0)}, ${saturation}%, ${lightness}%)`
    map[key] = color
    usedHues.push(hue)
  })

  return map
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
]

const LEGACY_FIELD_TYPES = [
  { value: 'date', label: 'Date (Legacy)' },
  { value: 'boolean', label: 'Boolean (Legacy)' },
]

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')

const normalizeFieldKey = (value) => normalizeName(value).toLowerCase()

const ICON_OPTIONS = [
  { key: 'tags', label: 'Tags', Icon: Tags },
  { key: 'sparkles', label: 'Sparkles', Icon: Sparkles },
  { key: 'activity', label: 'Activity', Icon: Activity },
  { key: 'heart_pulse', label: 'HeartPulse', Icon: HeartPulse },
  { key: 'leaf', label: 'Leaf', Icon: Leaf },
  { key: 'flame', label: 'Flame', Icon: Flame },
  { key: 'droplets', label: 'Droplets', Icon: Droplets },
  { key: 'file_text', label: 'FileText', Icon: FileText },
  { key: 'hand_heart', label: 'HandHeart', Icon: HandHeart },
]

const ICON_BY_KEY = ICON_OPTIONS.reduce((map, entry) => {
  map[entry.key] = entry.Icon
  return map
}, {})

const resolveIconKey = (value) => {
  const raw = String(value || '').trim()
  if (raw && ICON_BY_KEY[raw]) return raw
  return 'tags'
}

const CATEGORY_ICON_SEEDS = {
  environmental: 'leaf',
  relief_operation: 'hand_heart',
  fire_response: 'flame',
  water_distribution: 'droplets',
  blood_letting: 'heart_pulse',
  notes: 'file_text',
  medical: 'heart_pulse',
  donations: 'hand_heart',
  uncategorized: 'tags',
}

const guessIconKeyForCategory = (value) => {
  const key = toCategoryKey(value)
  if (!key) return 'tags'

  const seeded = CATEGORY_ICON_SEEDS[key]
  if (seeded) return seeded

  if (key.includes('fire')) return 'flame'
  if (key.includes('water')) return 'droplets'
  if (key.includes('blood')) return 'heart_pulse'
  if (key.includes('medical') || key.includes('health')) return 'heart_pulse'
  if (key.includes('relief') || key.includes('rescue') || key.includes('donat') || key.includes('aid')) return 'hand_heart'
  if (key.includes('environment') || key.includes('tree') || key.includes('mangrove') || key.includes('cleanup') || key.includes('plant')) return 'leaf'
  if (key.includes('note') || key.includes('report') || key.includes('doc') || key.includes('file')) return 'file_text'
  if (key.includes('activity') || key.includes('training')) return 'activity'

  return 'tags'
}

const CATEGORY_COLOR_PALETTE = [
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#f97316', // orange-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#6366f1', // indigo-500
  '#3b82f6', // blue-500
  '#0ea5e9', // sky-500
  '#06b6d4', // cyan-500
  '#14b8a6', // teal-500
  '#10b981', // emerald-500
  '#22c55e', // green-500
]

const guessColorForCategory = (value) => {
  const key = toCategoryKey(value)
  if (!key) return '#facc15'
  const seeded = CATEGORY_COLOR_SEEDS[key]
  if (seeded) return seeded
  const pick = CATEGORY_COLOR_PALETTE[hashInt(key) % CATEGORY_COLOR_PALETTE.length]
  return pick || '#facc15'
}

const normalizeHexColor = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const normalized = raw.startsWith('#') ? raw : `#${raw}`
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) return ''
  return normalized.toLowerCase()
}

function CategoryManagement() {
  const { user, reloadCategories } = useAuth()
  const { t } = useI18n()
  const confirm = useConfirm()
  const isAdmin = user?.role === 'admin'

  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const categoryColorByKey = useMemo(
    () => {
      const base = buildCategoryColorMap(categories.map(category => category?.name))
      categories.forEach(category => {
        const key = toCategoryKey(category?.name)
        const forced = normalizeHexColor(category?.color)
        if (key && forced) base[key] = forced
      })
      return base
    },
    [categories]
  )

  const [categoryName, setCategoryName] = useState('')
  const [fields, setFields] = useState([{ fieldId: null, fieldName: '', fieldType: '' }])
  const [editingCategory, setEditingCategory] = useState(null)
  const [originalFields, setOriginalFields] = useState([])
  const [formError, setFormError] = useState('')
  const [saveState, setSaveState] = useState('idle')

  const activeColor = useMemo(() => {
    const forced = normalizeHexColor(editingCategory?.color)
    if (editingCategory?.id && forced) return forced
    return normalizeHexColor(guessColorForCategory(categoryName)) || '#facc15'
  }, [categoryName, editingCategory])

  const activeIconKey = useMemo(() => {
    const rawEditingKey = String(editingCategory?.iconKey || '').trim()
    if (editingCategory?.id && rawEditingKey && ICON_BY_KEY[rawEditingKey]) return rawEditingKey
    return resolveIconKey(guessIconKeyForCategory(categoryName))
  }, [categoryName, editingCategory])

  const canUseSupabase = Boolean(supabase)

  const resetForm = () => {
    setCategoryName('')
    setFields([{ fieldId: null, fieldName: '', fieldType: '' }])
    setEditingCategory(null)
    setOriginalFields([])
    setFormError('')
    setSaveState('idle')
  }

  const loadCategoryFields = async (categoryId) => {
    if (!canUseSupabase) return []
    const id = String(categoryId || '').trim()
    if (!id) return []
    const { data, error } = await supabase
      .from('category_fields')
      .select('id,field_name,field_type,created_at')
      .eq('category_id', id)
      .order('created_at', { ascending: true })
    if (error) throw error
    return Array.isArray(data) ? data : []
  }

  const handleSelectCategory = async (category) => {
    if (!category?.id) return
    setFormError('')
    setSaveState('idle')
    setEditingCategory({
      id: category.id,
      name: category.name,
      iconKey: resolveIconKey(category?.icon_key || category?.iconKey),
      color: normalizeHexColor(category?.color) || '#facc15',
    })
    setCategoryName(titleCaseFromKey(category.name) || category.name)
    try {
      const loaded = await loadCategoryFields(category.id)
      const mapped = loaded.map(row => ({
        fieldId: row.id,
        fieldName: row.field_name,
        fieldType: row.field_type,
      }))
      setFields(mapped.length ? mapped : [{ fieldId: null, fieldName: '', fieldType: '' }])
      setOriginalFields(mapped)
    } catch (error) {
      setFormError(error?.message ? String(error.message) : 'Unable to load category fields.')
      setFields([{ fieldId: null, fieldName: '', fieldType: '' }])
      setOriginalFields([])
    }
  }

  const loadCategories = async () => {
    if (!canUseSupabase) return
    if (!isAdmin) return

    setLoadingCategories(true)
    setFormError('')
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id,name,icon_key,color,created_at')
        .order('name', { ascending: true })

      if (error) {
        setFormError(error.message || 'Unable to load categories.')
        return
      }
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      setFormError(error?.message ? String(error.message) : 'Unable to load categories.')
    } finally {
      setLoadingCategories(false)
    }
  }

  useEffect(() => {
    void loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, canUseSupabase])

  const validatedPayload = useMemo(() => {
    if (!isAdmin) return { ok: false, message: 'Only admins can manage categories.' }
    const key = toCategoryKey(categoryName)
    if (!key) return { ok: false, message: 'Category name is required.' }

    const iconKey = resolveIconKey(activeIconKey)
    const color = normalizeHexColor(activeColor)

    const cleanedFields = (Array.isArray(fields) ? fields : [])
      .map(entry => ({
        fieldId: entry?.fieldId || null,
        fieldName: normalizeName(entry?.fieldName),
        fieldType: String(entry?.fieldType || '').trim(),
      }))
      .filter(entry => entry.fieldName || entry.fieldType)

    if (cleanedFields.length === 0) return { ok: false, message: 'Add at least one field.' }

    for (const entry of cleanedFields) {
      if (!entry.fieldName) return { ok: false, message: 'Field name is required.' }
      if (!entry.fieldType) return { ok: false, message: 'Field type is required.' }
      const isSupported = FIELD_TYPES.some(type => type.value === entry.fieldType)
      if (isSupported) continue

      const isLegacy = LEGACY_FIELD_TYPES.some(type => type.value === entry.fieldType)
      if (isLegacy && entry.fieldId) continue

      return { ok: false, message: 'Unsupported field type.' }
    }

    const seen = new Set()
    for (const entry of cleanedFields) {
      const key = normalizeFieldKey(entry.fieldName)
      if (seen.has(key)) return { ok: false, message: 'Duplicate field names are not allowed.' }
      seen.add(key)
    }

    return { ok: true, key, fields: cleanedFields, iconKey, color }
  }, [activeColor, activeIconKey, categoryName, fields, isAdmin])

  const handleAddFieldRow = () => {
    setFields(prev => [...(Array.isArray(prev) ? prev : []), { fieldId: null, fieldName: '', fieldType: '' }])
  }

  const handleRemoveFieldRow = async (index) => {
    const currentFields = Array.isArray(fields) ? fields : []
    if (currentFields.length <= 1) return
    const removing = currentFields[index] || null
    const label = String(removing?.fieldName || '').trim() || `Field ${index + 1}`

    const ok = await confirm({
      title: t('Remove field'),
      description: `Remove "${label}"? This change will be applied when you save the category.`,
      confirmText: t('Remove'),
      cancelText: t('Cancel'),
      danger: true,
    })
    if (!ok) return

    setFields(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      next.splice(index, 1)
      return next.length ? next : [{ fieldId: null, fieldName: '', fieldType: '' }]
    })
  }

  const handleChangeField = (index, patch) => {
    setFields(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      next[index] = { ...(next[index] || {}), ...patch }
      return next
    })
  }

  const handleSaveCategory = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!validatedPayload.ok) {
      setFormError(validatedPayload.message || 'Please fix the form.')
      return
    }

    setSaveState('saving')
    try {
      if (editingCategory?.id) {
        const categoryId = String(editingCategory.id || '').trim()
        if (!categoryId) {
          setFormError('Missing category ID.')
          setSaveState('idle')
          return
        }

        const previousKey = String(editingCategory.name || '').trim()
        const nextKey = String(validatedPayload.key || '').trim()
        if (!previousKey || !nextKey) throw new Error('Missing category key.')

        let activeKey = previousKey
        if (nextKey !== previousKey) {
          const { error: renameError } = await supabase.rpc('rename_category_key', {
            p_category_id: categoryId,
            p_old_key: previousKey,
            p_new_key: nextKey,
          })

          if (renameError) throw renameError

          activeKey = nextKey
          setEditingCategory(prev => (prev ? { ...prev, name: activeKey } : prev))
        }

        const { error: metaError } = await supabase
          .from('categories')
          .update({
            icon_key: validatedPayload.iconKey || null,
            color: validatedPayload.color || null,
          })
          .eq('id', categoryId)

        if (metaError) throw metaError
        setEditingCategory(prev => (prev ? { ...prev, iconKey: validatedPayload.iconKey, color: validatedPayload.color } : prev))

        const nextFieldsById = new Map(
          validatedPayload.fields
            .filter(entry => entry.fieldId)
            .map(entry => [String(entry.fieldId), entry])
        )

        const originalById = new Map(
          (Array.isArray(originalFields) ? originalFields : [])
            .filter(entry => entry.fieldId)
            .map(entry => [String(entry.fieldId), entry])
        )

        const removedFieldIds = []
        originalById.forEach((value, fieldId) => {
          if (!nextFieldsById.has(fieldId)) removedFieldIds.push(fieldId)
        })

        const ensureFieldNotUsed = async (fieldId) => {
          const { count, error } = await supabase
            .from('activity_values')
            .select('id', { count: 'exact', head: true })
            .eq('field_id', fieldId)
          if (error) throw error
          const usedCount = Number(count || 0)
          if (usedCount > 0) throw new Error('Cannot modify or delete a field that already has saved activity values.')
        }

        // Delete removed fields (only if not used).
        for (const fieldId of removedFieldIds) {
          await ensureFieldNotUsed(fieldId)
          const { error } = await supabase.from('category_fields').delete().eq('id', fieldId)
          if (error) throw error
        }

        // Update existing fields (name/type changes only if not used).
        for (const entry of validatedPayload.fields.filter(item => item.fieldId)) {
          const fieldId = String(entry.fieldId)
          const original = originalById.get(fieldId)
          if (!original) continue
          const changed =
            normalizeFieldKey(original.fieldName) !== normalizeFieldKey(entry.fieldName) ||
            String(original.fieldType) !== String(entry.fieldType)
          if (!changed) continue
          await ensureFieldNotUsed(fieldId)
          const { error } = await supabase
            .from('category_fields')
            .update({ field_name: entry.fieldName, field_type: entry.fieldType })
            .eq('id', fieldId)
          if (error) throw error
        }

        // Insert new fields.
        const newFields = validatedPayload.fields.filter(item => !item.fieldId)
        if (newFields.length > 0) {
          const { error } = await supabase.from('category_fields').insert(
            newFields.map(entry => ({
              category_id: categoryId,
              field_name: entry.fieldName,
              field_type: entry.fieldType,
            }))
          )
          if (error) throw error
        }

        setSaveState('success')
        if (typeof reloadCategories === 'function') await reloadCategories()
        await loadCategories()
        await handleSelectCategory({ id: categoryId, name: activeKey, icon_key: validatedPayload.iconKey, color: validatedPayload.color })
        return
      }

      const { data: insertedCategory, error: categoryError } = await supabase
        .from('categories')
        .insert({
          name: validatedPayload.key,
          icon_key: validatedPayload.iconKey || null,
          color: validatedPayload.color || null,
          created_by: user?.id || null,
        })
        .select('id,name')
        .single()

      if (categoryError) {
        if (categoryError.code === '23505') {
          setFormError('Category name already exists.')
        } else {
          setFormError(categoryError.message || 'Unable to create category.')
        }
        setSaveState('idle')
        return
      }

      const categoryId = insertedCategory?.id
      if (!categoryId) {
        setFormError('Category created but no ID was returned.')
        setSaveState('idle')
        return
      }

      const fieldRows = validatedPayload.fields.map(entry => ({
        category_id: categoryId,
        field_name: entry.fieldName,
        field_type: entry.fieldType,
      }))

      const { error: fieldsError } = await supabase.from('category_fields').insert(fieldRows)
      if (fieldsError) {
        setFormError(fieldsError.message || 'Category created but fields failed to save.')
        setSaveState('idle')
        return
      }

      if (typeof reloadCategories === 'function') await reloadCategories()

      setSaveState('success')
      await loadCategories()
      window.setTimeout(() => resetForm(), 900)
    } catch (error) {
      setFormError(error?.message ? String(error.message) : 'Unable to save category.')
      setSaveState('idle')
    }
  }

  const handleDeleteCategory = async () => {
    if (!editingCategory?.id) return
    const ok = await confirm({
      title: t('Delete'),
      description: `Delete category "${String(editingCategory?.name || '').trim() || 'Untitled'}"? This cannot be undone.`,
      confirmText: t('Delete'),
      cancelText: t('Cancel'),
      danger: true,
    })
    if (!ok) return
    setFormError('')
    setSaveState('saving')
    try {
      const categoryId = String(editingCategory.id || '').trim()
      const categoryKey = String(editingCategory.name || '').trim()
      if (!categoryId || !categoryKey) throw new Error('Missing category.')

      const { count: eventCount, error: eventCountError } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('category', categoryKey)
      if (eventCountError) throw eventCountError
      if (Number(eventCount || 0) > 0) throw new Error('Reassign events to another category before deleting this category.')

      const { count: recordCount, error: recordCountError } = await supabase
        .from('activity_records')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', categoryId)
      if (recordCountError) throw recordCountError

      // If there are orphaned typed activity records (e.g. events were reassigned/deleted),
      // clean them up before deleting the category (activity_values cascades from activity_records).
      if (Number(recordCount || 0) > 0) {
        const { error: deleteRecordsError } = await supabase
          .from('activity_records')
          .delete()
          .eq('category_id', categoryId)
        if (deleteRecordsError) throw deleteRecordsError
      }

      const { error: deleteTypedError } = await supabase.from('categories').delete().eq('id', categoryId)
      if (deleteTypedError) throw deleteTypedError

      if (typeof reloadCategories === 'function') await reloadCategories()

      setSaveState('success')
      await loadCategories()
      window.setTimeout(() => resetForm(), 700)
    } catch (error) {
      setFormError(error?.message ? String(error.message) : 'Unable to delete category.')
      setSaveState('idle')
    }
  }

  if (!isAdmin) {
    return (
      <div className="animate-fade-in space-y-4">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <h1 className="text-[28px] font-semibold leading-tight text-white">{t('Category Management')}</h1>
          <p className="mt-2 text-[14px] text-white/70">
            {t('Only admins can access this page.')}
          </p>
        </header>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      <header className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-[28px] font-semibold leading-tight text-white">{t('Category Management')}</h1>
            <p className="text-[14px] text-white/70">
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <form
          onSubmit={handleSaveCategory}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-semibold text-black dark:text-zinc-100">
                {editingCategory ? t('Edit Category') : t('New Category')}
              </h2>
              {editingCategory && (
                <span className="rounded-full border border-yellow-300/30 bg-yellow-400/10 px-2 py-0.5 text-[11px] font-semibold text-yellow-200">
                  {t('Editing')}
                </span>
              )}
            </div>
          </div>

          {formError && (
            <div className="mb-4 rounded-xl border border-red-600 bg-red-50 p-3 text-[13px] text-red-700 dark:bg-red-950/30 dark:text-red-200">
              {formError}
            </div>
          )}
          {saveState === 'success' && (
            <div className="mb-4 rounded-xl border border-emerald-600 bg-emerald-50 p-3 text-[13px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
              {t('Saved.')}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[14px] font-medium text-black dark:text-zinc-100">{t('Category Name')}</label>
            <input
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder={t('e.g., Mangrove Planting')}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-[14px] text-black focus:border-yellow-300 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-black dark:text-zinc-100">{t('Custom Fields')}</h3>
            <button
              type="button"
              onClick={handleAddFieldRow}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[13px] font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/10"
            >
              <Plus size={16} className="text-yellow-300" />
              {t('Add Field')}
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {fields.map((field, index) => (
              <div
                key={`field-${index}`}
                className="grid gap-2 rounded-2xl border border-slate-200 bg-[#ffffff] p-3 md:grid-cols-[1fr_160px_44px]"
              >
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-slate-700">
                    {t('Field Name')}
                  </label>
                  <input
                    value={field.fieldName}
                    onChange={e => handleChangeField(index, { fieldName: e.target.value })}
                    placeholder={t('e.g., Seedling Count')}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] text-black focus:border-yellow-300 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-slate-700">
                    {t('Type')}
                  </label>
                  <select
                    value={field.fieldType}
                    onChange={e => handleChangeField(index, { fieldType: e.target.value })}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] text-black focus:border-yellow-300 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">{t('Select type')}</option>
                    {field.fieldType && !FIELD_TYPES.some(type => type.value === field.fieldType) ? (
                      <option value={field.fieldType} disabled>
                        {(
                          LEGACY_FIELD_TYPES.find(type => type.value === field.fieldType)?.label ||
                          `${String(field.fieldType).toUpperCase()} (Legacy)`
                        )}
                      </option>
                    ) : null}
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {t(type.label)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => void handleRemoveFieldRow(index)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-[#ffffff] text-slate-700 transition-colors hover:bg-slate-50"
                    aria-label={t('Remove field')}
                    title={t('Remove field')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {editingCategory && (
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  disabled={saveState === 'saving'}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-500/10 px-5 py-2.5 text-[14px] font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Trash2 size={16} />
                  {t('Delete')}
                </button>
              )}
              <button
                type="submit"
                disabled={saveState === 'saving'}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300/30 bg-yellow-400 px-5 py-2.5 text-[14px] font-semibold text-slate-900 transition-all duration-200 hover:scale-[1.01] hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={16} />
                {saveState === 'saving' ? t('Saving...') : editingCategory ? t('Update Category') : t('Save Category')}
              </button>
            </div>
          </div>
        </form>

        <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[18px] font-semibold text-black dark:text-zinc-100">{t('Existing Categories')}</h2>
            <button
              type="button"
              onClick={loadCategories}
              disabled={loadingCategories}
              className="rounded-xl border border-slate-200 bg-[#ffffff] px-3 py-1.5 text-[13px] text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-70"
            >
              {loadingCategories ? t('Loading...') : t('Refresh')}
            </button>
          </div>

          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-[#ffffff] p-3 text-[13px] text-slate-600">
                {t('No categories yet.')}
              </p>
              ) : (
                categories.map(category => {
                  const isSelected = String(editingCategory?.id || '') === String(category.id || '')
                  const categoryKey = toCategoryKey(category.name) || 'uncategorized'
                  const color =
                    categoryColorByKey[categoryKey] ||
                    CATEGORY_COLOR_SEEDS[categoryKey] ||
                    CATEGORY_COLOR_SEEDS.uncategorized
                  const Icon = ICON_BY_KEY[resolveIconKey(category?.icon_key)] || Tags
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleSelectCategory(category)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? 'bg-[#ffffff] shadow-[0_0_0_1px_rgba(15,23,42,0.06)]'
                          : 'bg-[#ffffff] hover:bg-slate-50'
                      }`}
                      style={{ borderColor: color }}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-slate-900">
                          {titleCaseFromKey(category.name) || category.name}
                        </p>
                      </div>
                      <div
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-[#ffffff]"
                        style={{ borderColor: color }}
                      >
                        <Icon size={14} style={{ color }} />
                      </div>
                    </button>
                  )
                })
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}

export default CategoryManagement
