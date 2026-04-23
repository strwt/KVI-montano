import { useEffect, useMemo, useState } from 'react'
import { MapPin, Plus, Trash2 } from 'lucide-react'
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
              <p className="text-[14px] text-white/70">Add latest news and milestone updates shown on the landing page.</p>
              <div className="flex flex-wrap gap-2 pt-3">
                <span className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-[14px] text-yellow-200">
                  {items.length} total item{items.length === 1 ? '' : 's'}
                </span>
                <span className="rounded-lg border border-white/15 bg-[#1d4ed8]/25 px-3 py-1 text-[14px] text-white/85">
                  Latest first
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
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/55" />
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
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="sr-only"
                />
                {filePreviews.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
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
                <h3 className="text-[24px] font-semibold text-white">Latest</h3>
                <p className="mt-1 text-sm text-white/70">Recent achievements already published to the feed.</p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/75">Loading...</div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/75">No achievements yet.</div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const dateLabel = item?.occurred_at ? dayjs(item.occurred_at).format('MMM D, YYYY h:mm A') : ''
                  const firstImage = Array.isArray(item?.image_paths) ? item.image_paths[0] : ''
                  const imageUrl = firstImage ? toPublicImageUrl(firstImage) : ''
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/15 p-4 shadow-sm transition-all duration-200 hover:shadow-[0_14px_24px_rgba(8,47,73,0.18)]"
                      style={{
                        background: 'linear-gradient(145deg, rgba(14,116,144,0.28), rgba(30,64,175,0.22) 52%, rgba(96,165,250,0.18))',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-white">{item.title || 'Untitled'}</p>
                          <p className="mt-1 text-xs text-white/70">{dateLabel}</p>
                          {item.location ? <p className="mt-1 text-xs text-white/70">{item.location}</p> : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/75 transition-colors hover:bg-red-500/15 hover:text-red-100"
                          title="Delete"
                          aria-label="Delete achievement"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {item.description ? (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/80">{item.description}</p>
                      ) : null}
                      {imageUrl ? (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-white/15 bg-white/10">
                          <img src={imageUrl} alt="" className="h-40 w-full object-cover" loading="lazy" />
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
