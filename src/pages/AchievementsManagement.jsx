import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, MapPin, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { supabase } from '../lib/supabaseClient'
import dayjs from 'dayjs'

const PAGE_SIZE = 20
const MAX_FILES = 8

const toPublicImageUrl = (path) => {
  const raw = String(path || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http') || raw.startsWith('data:image/') || raw.startsWith('/')) return raw
  try {
    const { data } = supabase?.storage?.from?.('achievement-images')?.getPublicUrl?.(raw) || {}
    return data?.publicUrl || ''
  } catch {
    return ''
  }
}

const getAccessToken = async () => {
  try {
    const { data } = await supabase?.auth?.getSession?.()
    return data?.session?.access_token ? String(data.session.access_token) : ''
  } catch {
    return ''
  }
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

    const safeFiles = (Array.isArray(files) ? files : []).slice(0, MAX_FILES)

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
      <div className="animate-fade-in space-y-4">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <h1 className="text-[28px] font-semibold leading-tight text-white">Achievements</h1>
          <p className="mt-2 text-[14px] text-white/70">Only admins can access this page.</p>
        </header>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 text-white">
      <header className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-semibold leading-tight text-white">Achievements</h1>
          <p className="text-[14px] text-white/70">Add latest news/achievements shown on the Landing page.</p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">New Achievement</h2>
            <button
              type="submit"
              disabled={saving || !canUseSupabase}
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-yellow-300 disabled:opacity-60"
            >
              <Plus size={16} />
              Save
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-white/70">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                placeholder="Title"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-white/70">Date & time</label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-white/70">Location</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                  placeholder="Location"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-white/70">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
                placeholder="Description"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-white/70">
                Images (up to {MAX_FILES})
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="w-full rounded-xl border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/30 file:mr-3 file:h-10 file:border-0 file:bg-white/10 file:px-3 file:text-sm file:font-medium file:text-white hover:file:bg-white/15"
              />
              {filePreviews.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {filePreviews.map((entry) => (
                    <div key={entry.url} className="h-16 w-16 overflow-hidden rounded-xl border border-white/15 bg-white/5">
                      <img src={entry.url} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/60">
                  <ImagePlus size={14} />
                  No images selected.
                </div>
              )}
            </div>
          </div>
        </form>

        <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Latest</h2>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">Loading...</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">No achievements yet.</div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const dateLabel = item?.occurred_at ? dayjs(item.occurred_at).format('MMM D, YYYY h:mm A') : ''
                const firstImage = Array.isArray(item?.image_paths) ? item.image_paths[0] : ''
                const imageUrl = firstImage ? toPublicImageUrl(firstImage) : ''
                return (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{item.title || 'Untitled'}</p>
                        <p className="mt-1 text-xs text-white/60">{dateLabel}</p>
                        {item.location ? <p className="mt-1 text-xs text-white/60">{item.location}</p> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-red-200"
                        title="Delete"
                        aria-label="Delete achievement"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {imageUrl ? (
                      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        <img src={imageUrl} alt="" className="h-32 w-full object-cover" loading="lazy" />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

