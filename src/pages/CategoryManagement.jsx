import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Save, Tags } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/useI18n'
import { supabase } from '../lib/supabaseClient'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
]

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')

const normalizeFieldKey = (value) => normalizeName(value).toLowerCase()

function CategoryManagement() {
  const { user } = useAuth()
  const { t } = useI18n()
  const isAdmin = user?.role === 'admin'

  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const [categoryName, setCategoryName] = useState('')
  const [fields, setFields] = useState([{ fieldName: '', fieldType: '' }])
  const [formError, setFormError] = useState('')
  const [saveState, setSaveState] = useState('idle')

  const canUseSupabase = Boolean(supabase)

  const resetForm = () => {
    setCategoryName('')
    setFields([{ fieldName: '', fieldType: '' }])
    setFormError('')
    setSaveState('idle')
  }

  const loadCategories = async () => {
    if (!canUseSupabase) return
    if (!isAdmin) return

    setLoadingCategories(true)
    setFormError('')
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id,name,created_at')
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
    const name = normalizeName(categoryName)
    if (!name) return { ok: false, message: 'Category name is required.' }

    const cleanedFields = (Array.isArray(fields) ? fields : [])
      .map(entry => ({
        fieldName: normalizeName(entry?.fieldName),
        fieldType: String(entry?.fieldType || '').trim(),
      }))
      .filter(entry => entry.fieldName || entry.fieldType)

    if (cleanedFields.length === 0) return { ok: false, message: 'Add at least one field.' }

    for (const entry of cleanedFields) {
      if (!entry.fieldName) return { ok: false, message: 'Field name is required.' }
      if (!entry.fieldType) return { ok: false, message: 'Field type is required.' }
      if (!FIELD_TYPES.some(type => type.value === entry.fieldType)) {
        return { ok: false, message: 'Unsupported field type.' }
      }
    }

    const seen = new Set()
    for (const entry of cleanedFields) {
      const key = normalizeFieldKey(entry.fieldName)
      if (seen.has(key)) return { ok: false, message: 'Duplicate field names are not allowed.' }
      seen.add(key)
    }

    return { ok: true, name, fields: cleanedFields }
  }, [categoryName, fields, isAdmin])

  const handleAddFieldRow = () => {
    setFields(prev => [...(Array.isArray(prev) ? prev : []), { fieldName: '', fieldType: '' }])
  }

  const handleRemoveFieldRow = (index) => {
    setFields(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      next.splice(index, 1)
      return next.length ? next : [{ fieldName: '', fieldType: '' }]
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
      const { data: insertedCategory, error: categoryError } = await supabase
        .from('categories')
        .insert({
          name: validatedPayload.name,
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

      setSaveState('success')
      await loadCategories()
      window.setTimeout(() => resetForm(), 900)
    } catch (error) {
      setFormError(error?.message ? String(error.message) : 'Unable to save category.')
      setSaveState('idle')
    }
  }

  if (!isAdmin) {
    return (
      <div className="animate-fade-in space-y-4">
        <header className="rounded-2xl border border-red-600 bg-gradient-to-br from-white to-neutral-100 p-6 text-neutral-900 dark:border-red-600 dark:from-black dark:to-neutral-900 dark:text-white">
          <h1 className="text-[28px] font-semibold leading-tight text-black dark:text-white">{t('Category Management')}</h1>
          <p className="mt-2 text-[14px] text-neutral-600 dark:text-neutral-300">
            {t('Only admins can access this page.')}
          </p>
        </header>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      <header className="rounded-2xl border border-red-600 bg-gradient-to-br from-white to-neutral-100 p-6 text-neutral-900 dark:border-red-600 dark:from-black dark:to-neutral-900 dark:text-white">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-[28px] font-semibold leading-tight text-black dark:text-white">{t('Category Management')}</h1>
            <p className="text-[14px] text-neutral-600 dark:text-neutral-300">
              {t('Create categories with strict typed custom fields for safe reporting.')}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-red-600 bg-white px-4 py-2 text-[14px] font-medium text-red-700 shadow-sm dark:bg-zinc-950 dark:text-red-300">
            <Tags size={16} className="text-red-600" />
            {t('Admin Only')}
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <form
          onSubmit={handleSaveCategory}
          className="rounded-2xl border border-red-600 bg-white p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[20px] font-semibold text-black dark:text-zinc-100">{t('New Category')}</h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-[13px] text-neutral-700 hover:bg-neutral-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              {t('Reset')}
            </button>
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
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-[14px] text-black focus:border-red-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-black dark:text-zinc-100">{t('Custom Fields')}</h3>
            <button
              type="button"
              onClick={handleAddFieldRow}
              className="inline-flex items-center gap-2 rounded-xl border border-red-600 bg-white px-3 py-2 text-[13px] font-semibold text-red-700 hover:bg-red-50 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              <Plus size={16} />
              {t('Add Field')}
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {fields.map((field, index) => (
              <div
                key={`field-${index}`}
                className="grid gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 md:grid-cols-[1fr_160px_44px] dark:border-zinc-700 dark:bg-zinc-950"
              >
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-neutral-700 dark:text-zinc-300">
                    {t('Field Name')}
                  </label>
                  <input
                    value={field.fieldName}
                    onChange={e => handleChangeField(index, { fieldName: e.target.value })}
                    placeholder={t('e.g., Seedling Count')}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] text-black focus:border-red-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-neutral-700 dark:text-zinc-300">
                    {t('Type')}
                  </label>
                  <select
                    value={field.fieldType}
                    onChange={e => handleChangeField(index, { fieldType: e.target.value })}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] text-black focus:border-red-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">{t('Select type')}</option>
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
                    onClick={() => handleRemoveFieldRow(index)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
            <div className="text-[13px] text-neutral-600 dark:text-zinc-400">
              {t('Each field must have a required data type (text, number, date, boolean).')}
            </div>
            <button
              type="submit"
              disabled={saveState === 'saving'}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-600 bg-red-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-all duration-200 hover:scale-[1.01] hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save size={16} />
              {saveState === 'saving' ? t('Saving...') : t('Save Category')}
            </button>
          </div>
        </form>

        <aside className="rounded-2xl border border-red-600 bg-white p-6 shadow-[0_10px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[18px] font-semibold text-black dark:text-zinc-100">{t('Existing Categories')}</h2>
            <button
              type="button"
              onClick={loadCategories}
              disabled={loadingCategories}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-[13px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              {loadingCategories ? t('Loading...') : t('Refresh')}
            </button>
          </div>

          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[13px] text-neutral-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                {t('No categories yet.')}
              </p>
            ) : (
              categories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-black dark:text-zinc-100">{category.name}</p>
                    <p className="text-[12px] text-neutral-500 dark:text-zinc-400">{t('Configured')}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[13px] text-neutral-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            <p className="font-semibold">{t('Example')}</p>
            <p className="mt-1">{t('Mangrove Planting')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t('Seedling Count')} ({t('Number')})</li>
              <li>{t('Planting Date')} ({t('Date')})</li>
              <li>{t('Verified')} ({t('Boolean')})</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  )
}

export default CategoryManagement

