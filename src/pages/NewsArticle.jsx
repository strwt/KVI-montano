import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled } from '../lib/supabaseEvents'

const resolveAchievementImage = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/') || raw.startsWith('http')) return raw
  if (raw.startsWith('data:image/')) return raw
  try {
    const { data } = supabase?.storage?.from?.('achievement-images')?.getPublicUrl?.(raw) || {}
    return data?.publicUrl || ''
  } catch {
    return ''
  }
}

export default function NewsArticle() {
  const navigate = useNavigate()
  const { id } = useParams()
  const supabaseEnabled = isSupabaseEnabled()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!supabaseEnabled || !supabase || !id) {
        if (!active) return
        setItem(null)
        setLoading(false)
        setError('Article not available.')
        return
      }

      setLoading(true)
      setError('')
      try {
        const { data, error: fetchError } = await supabase
          .from('achievements')
          .select('id,title,occurred_at,location,description,image_paths,created_at')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError
        if (!active) return
        setItem(data || null)
      } catch (err) {
        if (!active) return
        setItem(null)
        setError(err?.message ? String(err.message) : 'Unable to load article.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [id, supabaseEnabled])

  const imageUrls = useMemo(() => {
    const paths = Array.isArray(item?.image_paths) ? item.image_paths : []
    return paths.map(resolveAchievementImage).filter(Boolean)
  }, [item])

  const dateLabel = useMemo(() => {
    const raw = item?.occurred_at
    if (!raw) return ''
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }, [item])

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(135deg, #1a42af 0%, #2b56d8 55%, #1b7ff2 100%)' }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.14),transparent_20%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/who-we-are/news')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            Back to News
          </button>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(8,47,73,0.18)] md:p-5">
            {loading ? (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                Loading article...
              </div>
            ) : error ? (
              <div className="rounded-[22px] border border-red-400/20 bg-red-500/10 p-8 text-sm text-red-100">
                {error}
              </div>
            ) : item ? (
              <article className="space-y-6 rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(8,47,73,0.12)] md:p-8">
                <header className="space-y-4">
                  <div className="inline-flex items-center rounded-full border border-yellow-300 bg-yellow-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-yellow-700">
                    Latest News
                  </div>
                  <h1 className="max-w-3xl text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                    {String(item?.title || '').trim() || 'Untitled'}
                  </h1>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                    {dateLabel ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <CalendarDays size={14} />
                        {dateLabel}
                      </span>
                    ) : null}
                    {item?.location ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <MapPin size={14} />
                        {String(item.location).trim()}
                      </span>
                    ) : null}
                  </div>
                </header>

                {imageUrls.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100">
                      <img src={imageUrls[0]} alt="" className="h-[320px] w-full object-cover md:h-[520px]" loading="lazy" />
                    </div>
                    {imageUrls.length > 1 ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {imageUrls.slice(1).map((url, index) => (
                          <div key={`${url}-${index}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                            <img src={url} alt="" className="h-64 w-full object-cover md:h-80" loading="lazy" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:p-6">
                  <p className="whitespace-pre-wrap text-sm leading-8 text-slate-700 md:text-base">
                    {String(item?.description || '').trim() || 'No content available.'}
                  </p>
                </div>
              </article>
            ) : (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                Article not found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
