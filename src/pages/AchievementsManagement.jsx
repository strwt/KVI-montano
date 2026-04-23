import { useEffect, useMemo, useState } from 'react'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { supabase } from '../lib/supabaseClient'
import dayjs from 'dayjs'

const PAGE_SIZE = 20
const MAX_FILES = 8

const BLUE_BACKGROUND = {
  base: 'linear-gradient(145deg, rgba(43,86,216,0.32) 0%, rgba(4,18,33,0.92) 48%, rgba(26,66,175,0.28) 100%)',
  glow: 'radial-gradient(circle at 20% 0%, rgba(96,165,250,0.18) 0%, transparent 55%), radial-gradient(circle at 85% 10%, rgba(43,86,216,0.16) 0%, transparent 55%)',
}

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
      <div className="animate-fade-in text-blue-50">
        <div
          className="relative overflow-hidden rounded-3xl border border-blue-200/20 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
          style={{ background: BLUE_BACKGROUND.base }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: BLUE_BACKGROUND.glow }} />
          <div className="relative flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-blue-50">Achievements</h2>
              <p className="text-sm text-blue-100/80">Only admins can access this page.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in text-blue-50">
      <div
        className="relative overflow-hidden rounded-3xl border border-blue-200/20 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
        style={{ background: BLUE_BACKGROUND.base }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: BLUE_BACKGROUND.glow }} />

        <div className="relative flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-blue-50">Achievements</h2>
            <p className="text-sm text-blue-100/80">Add latest news/achievements shown on the Landing page.</p>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-blue-200/20 bg-blue-500/10 p-5 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-blue-50">New Achievement</h3>
              <button
                type="submit"
                disabled={saving || !canUseSupabase}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(250,204,21,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300 disabled:opacity-60"
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
                <label className="block text-xs text-blue-100/80 mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 rounded-lg border border-blue-200/25 bg-blue-500/10 px-3 text-blue-50 placeholder:text-blue-100/50 focus:outline-none focus:ring-2 focus:ring-blue-300/50"
                  placeholder="Title"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-blue-100/80 mb-1">Date & time</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full h-10 rounded-lg border border-blue-200/25 bg-blue-500/10 px-3 text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-blue-100/80 mb-1">Location</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-100/60" />
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-10 rounded-lg border border-blue-200/25 bg-blue-500/10 py-2 pl-10 pr-3 text-blue-50 placeholder:text-blue-100/50 focus:outline-none focus:ring-2 focus:ring-blue-300/50"
                    placeholder="Location"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-blue-100/80 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] w-full rounded-lg border border-blue-200/25 bg-blue-500/10 px-3 py-2 text-blue-50 placeholder:text-blue-100/50 focus:outline-none focus:ring-2 focus:ring-blue-300/50"
                  placeholder="Description"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-blue-100/80 mb-1">Images (up to {MAX_FILES})</label>
                <div className="flex min-h-[56px] items-center gap-3 rounded-xl border border-blue-200/25 bg-blue-500/10 px-3 py-2 text-blue-50 shadow-sm">
                  <label
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(250,204,21,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300"
                    htmlFor="achievement-images"
                  >
                    Choose Files
                  </label>
                  <span className="min-w-0 truncate text-sm text-blue-100/80">
                    {files.length ? `${files.length} file(s) selected` : 'No file chosen'}
                  </span>
                </div>
              <input
                id="achievement-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="sr-only"
              />
              {filePreviews.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {filePreviews.map((entry) => (
                    <div
                      key={entry.url}
                      className="h-16 w-16 overflow-hidden rounded-xl border border-blue-200/25 bg-blue-500/10"
                    >
                      <img src={entry.url} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          </form>

          <aside className="rounded-2xl border border-blue-200/20 bg-blue-500/10 p-5 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-blue-50">Latest</h3>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-xl border border-blue-200/25 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-50 transition-colors hover:bg-blue-500/15"
              >
                Refresh
              </button>
            </div>

          {loading ? (
            <div className="rounded-xl border border-blue-200/20 bg-blue-950/35 p-4 text-sm text-blue-100/80">Loading...</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-blue-200/20 bg-blue-950/35 p-4 text-sm text-blue-100/80">No achievements yet.</div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const dateLabel = item?.occurred_at ? dayjs(item.occurred_at).format('MMM D, YYYY h:mm A') : ''
                const firstImage = Array.isArray(item?.image_paths) ? item.image_paths[0] : ''
                const imageUrl = firstImage ? toPublicImageUrl(firstImage) : ''
                return (
                  <div key={item.id} className="rounded-2xl border border-blue-200/20 bg-blue-950/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-blue-50">{item.title || 'Untitled'}</p>
                        <p className="mt-1 text-xs text-blue-100/80">{dateLabel}</p>
                        {item.location ? <p className="mt-1 text-xs text-blue-100/80">{item.location}</p> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200/25 bg-blue-500/10 text-blue-100/80 transition-colors hover:bg-blue-500/15 hover:text-red-200"
                        title="Delete"
                        aria-label="Delete achievement"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {imageUrl ? (
                      <div className="mt-3 overflow-hidden rounded-xl border border-blue-200/20 bg-blue-500/10">
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
    </div>
  )
}
