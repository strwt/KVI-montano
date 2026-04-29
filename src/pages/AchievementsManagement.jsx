import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/useConfirm'
import { supabase } from '../lib/supabaseClient'
import dayjs from 'dayjs'

const PAGE_SIZE = 20
const MAX_FILES = 3

const toPublicImageUrl = (path) => {
  const raw = String(path || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http') || raw.startsWith('data:image/') || raw.startsWith('/')) return raw

  try {
    const storage = supabase && supabase.storage
    if (!storage || typeof storage.from !== 'function') return ''
    const bucket = storage.from('achievement-images')
    const { data } = bucket.getPublicUrl(raw) || {}
    return data?.publicUrl ? String(data.publicUrl) : ''
  } catch {
    return ''
  }
}

const normalizeImagePaths = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    // Postgres array literal: {"a","b"} or {a,b}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim()
      if (!inner) return []
      return inner
        .split(',')
        .map((entry) => String(entry || '').trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, ''))
        .filter(Boolean)
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // ignore
    }

    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    }

    return [trimmed]
  }

  return []
}

const getAccessToken = async () => {
  try {
    const { data } = (await supabase?.auth?.getSession?.()) || {}
    return data?.session?.access_token ? String(data.session.access_token) : ''
  } catch {
    return ''
  }
}

function AchievementImageGallery({ images, onDeleteImage }) {
  const entries = Array.isArray(images) ? images.filter((entry) => entry?.url) : []

  if (entries.length === 0) return null

  return (
    <div className="mt-4">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {entries.map((entry, index) => (
          <div
            key={`${entry.url}-${index}`}
            className="group relative h-40 w-56 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white"
          >
            <img
              src={entry.url}
              alt=""
              loading="lazy"
              draggable={false}
              className="h-full w-full object-cover"
            />
            {entry?.path && typeof onDeleteImage === 'function' ? (
              <button
                type="button"
                onClick={() => onDeleteImage(entry.path)}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/40 text-white/85 opacity-0 backdrop-blur-sm transition-all hover:bg-red-500/25 hover:text-white group-hover:opacity-100"
                aria-label="Delete image"
                title="Delete image"
              >
                <Trash2 size={16} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AchievementsManagement() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const isAdmin = user?.role === 'admin'

  const [title, setTitle] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => dayjs().format('YYYY-MM-DDTHH:mm'))
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [editImagePathsDraft, setEditImagePathsDraft] = useState([])
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editFiles, setEditFiles] = useState([])
  const editInitIdRef = useRef(null)

  const expandedItem = useMemo(() => {
    if (!expandedId) return null
    return (Array.isArray(items) ? items : []).find((entry) => String(entry?.id) === String(expandedId)) || null
  }, [expandedId, items])

  const selectedImages = useMemo(() => {
    const paths = Array.isArray(editImagePathsDraft) ? editImagePathsDraft : []
    return paths
      .map((path) => ({
        path: String(path || '').trim(),
        url: toPublicImageUrl(path),
      }))
      .filter((entry) => entry.path && entry.url)
  }, [editImagePathsDraft])

  const editFilePreviews = useMemo(
    () =>
      (Array.isArray(editFiles) ? editFiles : [])
        .slice(0, MAX_FILES)
        .map((file) => ({
          file,
          url: URL.createObjectURL(file),
        })),
    [editFiles]
  )

  useEffect(() => {
    return () => {
      for (const entry of editFilePreviews) {
        try {
          URL.revokeObjectURL(entry.url)
        } catch {
          // ignore
        }
      }
    }
  }, [editFilePreviews])

  const canUseSupabase = Boolean(supabase)

  const filePreviews = useMemo(
    () =>
      (Array.isArray(files) ? files : [])
        .slice(0, MAX_FILES)
        .map((file) => ({
          file,
          url: URL.createObjectURL(file),
        })),
    [files]
  )

  useEffect(() => {
    return () => {
      for (const entry of filePreviews) {
        try {
          URL.revokeObjectURL(entry.url)
        } catch {
          // ignore
        }
      }
    }
  }, [filePreviews])

  const load = async () => {
    if (!canUseSupabase) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('achievements')
        .select('id,title,occurred_at,location,description,image_paths,created_at')
        .order('occurred_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (fetchError) throw fetchError
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setItems([])
      setError(err?.message ? String(err.message) : 'Unable to load achievements.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!expandedId) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setExpandedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expandedId])

  useEffect(() => {
    if (!expandedItem) {
      editInitIdRef.current = null
      setEditDraft(null)
      setEditImagePathsDraft([])
      setEditError('')
      setEditSaving(false)
      setEditFiles([])
      return
    }

    if (String(editInitIdRef.current || '') === String(expandedItem?.id || '')) return
    editInitIdRef.current = expandedItem?.id || null

    setEditDraft({
      title: String(expandedItem?.title || ''),
      occurredAt: expandedItem?.occurred_at ? dayjs(expandedItem.occurred_at).format('YYYY-MM-DDTHH:mm') : '',
      location: String(expandedItem?.location || ''),
      description: String(expandedItem?.description || ''),
    })
    setEditImagePathsDraft(
      normalizeImagePaths(expandedItem?.image_paths)
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
        .slice(0, MAX_FILES)
    )
    setEditError('')
    setEditSaving(false)
    setEditFiles([])
  }, [expandedItem])

  const resetForm = () => {
    setTitle('')
    setOccurredAt(dayjs().format('YYYY-MM-DDTHH:mm'))
    setLocation('')
    setDescription('')
    setFiles([])
  }

  const uploadImages = async ({ achievementId, imageFiles }) => {
    const token = await getAccessToken()
    if (!token) throw new Error('Missing access token.')
    const uploaded = []

    for (const file of imageFiles) {
      const contentType = String(file?.type || 'application/octet-stream')
      const response = await fetch('/api/storage/upload-achievement-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
          'x-achievement-id': String(achievementId),
        },
        body: file,
      })

      const text = await response.text().catch(() => '')
      const payload = (() => {
        if (!text) return null
        try {
          return JSON.parse(text)
        } catch {
          return null
        }
      })()

      if (!response.ok || !payload?.path) {
        const message = payload?.message || (text ? text.slice(0, 250) : '') || 'Image upload failed.'
        throw new Error(message)
      }

      uploaded.push(String(payload.path))
    }

    return uploaded
  }

  const deleteImageFromStorage = async (path) => {
    const token = await getAccessToken()
    if (!token) throw new Error('Missing access token.')

    const response = await fetch('/api/storage/delete-achievement-image', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: String(path || '').trim() }),
    })

    const text = await response.text().catch(() => '')
    const payload = (() => {
      if (!text) return null
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    })()

    if (!response.ok || !payload?.success) {
      const message = payload?.message || (text ? text.slice(0, 250) : '') || 'Unable to delete image.'
      throw new Error(message)
    }

    return true
  }

  const handleDeleteExistingImage = async (path) => {
    const safePath = String(path || '').trim()
    if (!safePath) return
    if (editSaving) return

    const ok = await confirm({
      title: 'Delete image?',
      description: 'This will remove the image from the achievement. Changes are applied when you click Save.',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      danger: true,
    })
    if (!ok) return

    setEditError('')
    setEditImagePathsDraft((prev) => (Array.isArray(prev) ? prev : []).filter((entry) => String(entry || '').trim() !== safePath))
    setSuccess('Image removed (not saved yet).')
  }

  const handleSaveEdit = async () => {
    if (!expandedItem?.id) return
    if (editSaving) return
    setEditError('')
    setSuccess('')

    const safeTitle = String(editDraft?.title || '').trim()
    if (!safeTitle) {
      setEditError('Title is required.')
      return
    }

    const parsed = dayjs(editDraft?.occurredAt)
    if (!parsed.isValid()) {
      setEditError('Date & time is invalid.')
      return
    }

    const initialPaths = normalizeImagePaths(expandedItem?.image_paths)
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)

    const basePaths = (Array.isArray(editImagePathsDraft) ? editImagePathsDraft : [])
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .slice(0, MAX_FILES)

    const imageFiles = (Array.isArray(editFiles) ? editFiles : []).filter(Boolean)
    const remainingSlots = Math.max(0, MAX_FILES - basePaths.length)
    if (imageFiles.length > remainingSlots) {
      setEditError('3 Images only')
      return
    }

    setEditSaving(true)
    let uploadedPaths = []
    try {
      if (imageFiles.length > 0) {
        uploadedPaths = await uploadImages({ achievementId: expandedItem.id, imageFiles })
      }

      const finalPaths = [...basePaths, ...uploadedPaths.map((p) => String(p || '').trim()).filter(Boolean)].slice(0, MAX_FILES)
      const payload = {
        title: safeTitle,
        occurred_at: parsed.toISOString(),
        location: String(editDraft?.location || '').trim(),
        description: String(editDraft?.description || '').trim(),
        image_paths: finalPaths,
      }

      const { error: updateError } = await supabase.from('achievements').update(payload).eq('id', expandedItem.id)
      if (updateError) throw updateError

      setItems((prev) =>
        (Array.isArray(prev) ? prev : []).map((entry) =>
          String(entry?.id) === String(expandedItem.id) ? { ...entry, ...payload } : entry
        )
      )

      setEditFiles([])
      setEditImagePathsDraft(finalPaths)

      const pathsToDelete = initialPaths.filter((path) => !finalPaths.includes(path))
      const deleteFailures = []
      for (const path of pathsToDelete) {
        try {
          // Best-effort cleanup; DB update already happened.
          await deleteImageFromStorage(path)
        } catch {
          deleteFailures.push(path)
        }
      }

      if (deleteFailures.length > 0) {
        setSuccess('Saved (some images could not be deleted).')
      } else {
        setSuccess('Saved.')
      }

      setExpandedId(null)
    } catch (err) {
      if (uploadedPaths.length > 0) {
        for (const path of uploadedPaths) {
          try {
            // Best-effort cleanup for newly uploaded files if the save fails.
            await deleteImageFromStorage(path)
          } catch {
            // ignore
          }
        }
      }
      setEditError(err?.message ? String(err.message) : 'Unable to update achievement.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!isAdmin) {
      setError('Admin access required.')
      return
    }

    const safeTitle = String(title || '').trim()
    if (!safeTitle) {
      setError('Title is required.')
      return
    }

    const parsed = dayjs(occurredAt)
    if (!parsed.isValid()) {
      setError('Date & time is invalid.')
      return
    }

    const selectedFiles = Array.isArray(files) ? files : []
    if (selectedFiles.length > MAX_FILES) {
      setError('3 Images only')
      return
    }

    const safeFiles = selectedFiles.slice(0, MAX_FILES)

    setSaving(true)
    try {
      const { data: created, error: createError } = await supabase
        .from('achievements')
        .insert({
          title: safeTitle,
          occurred_at: parsed.toISOString(),
          location: String(location || '').trim(),
          description: String(description || '').trim(),
          image_paths: [],
          created_by: user?.id || null,
        })
        .select('id')
        .single()

      if (createError) throw createError
      const achievementId = created?.id ? String(created.id) : ''
      if (!achievementId) throw new Error('Unable to create achievement.')

      let imagePaths = []
      if (safeFiles.length > 0) {
        imagePaths = await uploadImages({ achievementId, imageFiles: safeFiles })
        const { error: updateError } = await supabase
          .from('achievements')
          .update({ image_paths: imagePaths })
          .eq('id', achievementId)
        if (updateError) throw updateError
      }

      setSuccess('Saved.')
      resetForm()
      await load()
    } catch (err) {
      setError(err?.message ? String(err.message) : 'Unable to save achievement.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!item?.id) return

    const ok = await confirm({
      title: 'Delete achievement?',
      description: `Delete "${String(item?.title || '').trim() || 'this item'}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
    })
    if (!ok) return

    setError('')
    setSuccess('')
    try {
      const { error: deleteError } = await supabase.from('achievements').delete().eq('id', item.id)
      if (deleteError) throw deleteError
      setSuccess('Deleted.')
      await load()
    } catch (err) {
      setError(err?.message ? String(err.message) : 'Unable to delete achievement.')
    }
  }

  if (!isAdmin) {
    return (
      <div
        className="animate-fade-in rounded-[28px] border border-white/10 p-4 text-white shadow-[0_24px_70px_rgba(8,47,73,0.18)] md:p-5"
        style={{
          background: 'linear-gradient(145deg, rgba(14,116,144,0.62), rgba(30,64,175,0.58) 52%, rgba(96,165,250,0.48))',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="relative overflow-hidden rounded-3xl border border-white/15 p-1 shadow-[0_24px_70px_rgba(8,47,73,0.26)]"
          style={{
            background: 'linear-gradient(145deg, rgba(14,116,144,0.88), rgba(30,64,175,0.84) 52%, rgba(59,130,246,0.78))',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-blue-200/10 blur-3xl" />
          <div
            className="relative rounded-[22px] border border-white/10 p-6 backdrop-blur-md md:p-8"
            style={{
              background: 'linear-gradient(145deg, rgba(14,116,144,0.34), rgba(30,64,175,0.28) 52%, rgba(96,165,250,0.24))',
            }}
          >
            <h2 className="text-[32px] font-semibold leading-tight text-white">Achievements</h2>
            <p className="mt-2 text-sm text-white/70">Only admins can access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="animate-fade-in rounded-[28px] border border-white/10 p-4 text-white shadow-[0_24px_70px_rgba(8,47,73,0.18)] md:p-5"
        style={{
          background: 'linear-gradient(145deg, rgba(14,116,144,0.62), rgba(30,64,175,0.58) 52%, rgba(96,165,250,0.48))',
          backdropFilter: 'blur(16px)',
        }}
      >
      <div
        className="relative mb-6 overflow-hidden rounded-3xl border border-white/15 p-1 shadow-[0_24px_70px_rgba(8,47,73,0.26)]"
        style={{
          background: 'linear-gradient(145deg, rgba(14,116,144,0.88), rgba(30,64,175,0.84) 52%, rgba(59,130,246,0.78))',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-blue-200/10 blur-3xl" />

        <div
          className="relative rounded-[22px] border border-white/10 p-6 backdrop-blur-md md:p-8"
          style={{
            background: 'linear-gradient(145deg, rgba(14,116,144,0.34), rgba(30,64,175,0.28) 52%, rgba(96,165,250,0.24))',
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[32px] font-semibold leading-tight text-white">Achievements</h2>
              <div className="flex flex-wrap gap-2 pt-3">
                <span className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-[14px] text-yellow-200">
                  {items.length} total item{items.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15"
            >
              Refresh List
            </button>
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/15 p-6 shadow-[0_24px_70px_rgba(8,47,73,0.22)] backdrop-blur-md md:p-7"
            style={{
              background: 'linear-gradient(145deg, rgba(14,116,144,0.52), rgba(30,64,175,0.46) 52%, rgba(96,165,250,0.36))',
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[24px] font-semibold text-white">New Achievement</h3>
                <p className="mt-1 text-sm text-white/70">Create a news or achievement post with images for the landing page.</p>
              </div>
              <button
                type="submit"
                disabled={saving || !canUseSupabase}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(250,204,21,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} />
                Save
              </button>
            </div>

            {error ? (
              <div className="mb-4 rounded-xl border border-red-300/35 bg-red-500/10 p-3 text-sm text-red-100">
              {error}
              </div>
            ) : null}
            {success ? (
              <div className="mb-4 rounded-xl border border-emerald-300/35 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              {success}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                  placeholder="Title"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Date & time</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Location</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-300/90" />
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/10 py-2 pl-10 pr-3 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                    placeholder="Location"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[140px] w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                  placeholder="Description"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Images (up to {MAX_FILES})</label>
                <div className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-white shadow-sm">
                  <label
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(250,204,21,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300"
                    htmlFor="achievement-images"
                  >
                    Choose Files
                  </label>
                  <span className="min-w-0 truncate text-sm text-white/75">
                    {files.length ? `${files.length} file(s) selected` : 'No file chosen'}
                  </span>
                </div>
                <input
                  id="achievement-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const nextFiles = Array.from(e.target.files || [])
                    if (nextFiles.length > MAX_FILES) {
                      setError('3 Images only')
                      setSuccess('')
                    } else {
                      setError('')
                    }
                    setFiles(nextFiles.slice(0, MAX_FILES))
                  }}
                  className="sr-only"
                />
                {filePreviews.length > 0 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                    {filePreviews.map((entry) => (
                      <div
                        key={entry.url}
                        className="h-20 w-20 overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-sm"
                      >
                        <img src={entry.url} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </form>

          <aside
            className="rounded-3xl border border-white/15 p-6 shadow-[0_24px_70px_rgba(8,47,73,0.22)] backdrop-blur-md md:p-7"
            style={{
              background: 'linear-gradient(145deg, rgba(14,116,144,0.52), rgba(30,64,175,0.46) 52%, rgba(96,165,250,0.36))',
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/75">Loading...</div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/75">No achievements yet.</div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/15 p-4 shadow-sm transition-all duration-200 hover:shadow-[0_14px_24px_rgba(8,47,73,0.18)]"
                      style={{
                        background: 'linear-gradient(145deg, rgba(14,116,144,0.28), rgba(30,64,175,0.22) 52%, rgba(96,165,250,0.18))',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(item?.id || null)}
                          className="min-w-0 flex-1 text-left rounded-xl outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-yellow-300/40"
                          aria-label="Open details"
                          title="Open"
                        >
                          <p className="break-words text-base font-semibold text-white line-clamp-2">{item.title || 'Untitled'}</p>
                          {item.location ? <p className="mt-1 text-xs text-white/70">{item.location}</p> : null}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleDelete(item)
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/75 transition-colors hover:bg-red-500/15 hover:text-red-100"
                            title="Delete"
                            aria-label="Delete achievement"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>


                    </div>
                  )
                })}
              </div>
            )}
        </aside>
      </section>

      {expandedItem ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Edit achievement"
          onClick={() => setExpandedId(null)}
        >
          <div
            className="calendar-done-modal w-screen max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="calendar-done-modal-header flex items-start justify-between gap-4 border-b border-gray-200 bg-white p-5 sm:p-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-500">Achievement</p>
                <h3 className="mt-2 truncate text-xl font-semibold text-gray-800">
                  {String(expandedItem?.title || '').trim() || 'Untitled'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                aria-label="Close"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="calendar-done-modal-body max-h-[75vh] overflow-y-auto p-5 sm:p-6">
              <div className="calendar-done-card rounded-2xl border border-gray-200 bg-gray-50 p-4">
                {editError ? (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {editError}
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Title
                    <input
                      value={editDraft?.title ?? ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...(prev || {}), title: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Achievement title"
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700">
                    Date & time
                    <input
                      type="datetime-local"
                      value={editDraft?.occurredAt ?? ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...(prev || {}), occurredAt: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700 md:col-span-2">
                    Location
                    <input
                      value={editDraft?.location ?? ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...(prev || {}), location: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Location"
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700 md:col-span-2">
                    Description
                    <textarea
                      value={editDraft?.description ?? ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...(prev || {}), description: e.target.value }))}
                      className="mt-1 min-h-[110px] w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Description"
                    />
                  </label>
                </div>

                {selectedImages.length ? (
                  <AchievementImageGallery
                    key={expandedItem?.id || 'achievement-gallery'}
                    images={selectedImages}
                    onDeleteImage={handleDeleteExistingImage}
                  />
                ) : null}

                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-semibold text-gray-800">Add images</p>
                  <p className="mt-1 text-xs text-gray-500">Up to {MAX_FILES} images only.</p>

                  <div className="mt-3">
                    <div className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-gray-700 shadow-sm">
                      <label
                        className={`inline-flex cursor-pointer items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(250,204,21,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300 ${
                          editSaving ? 'pointer-events-none opacity-70' : ''
                        }`}
                        htmlFor="achievement-edit-images"
                      >
                        Choose Files
                      </label>
                      <span className="min-w-0 truncate text-sm text-gray-600">
                        {editFiles.length ? `${editFiles.length} file(s) selected` : 'No file chosen'}
                      </span>
                    </div>
                    <input
                      id="achievement-edit-images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const nextFiles = Array.from(e.target.files || [])
                        if (nextFiles.length > MAX_FILES) {
                          setEditError('3 Images only')
                          setSuccess('')
                        } else {
                          setEditError('')
                        }
                        setEditFiles(nextFiles.slice(0, MAX_FILES))
                      }}
                      className="sr-only"
                    />
                  </div>

                {editFilePreviews.length > 0 ? (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                      {editFilePreviews.map((entry) => (
                        <div
                          key={entry.url}
                          className="h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                        >
                          <img src={entry.url} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-semibold text-slate-900 shadow-[0_10px_26px_rgba(250,204,21,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={editSaving}
                  >
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </>
  )
}
