import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled } from '../lib/supabaseEvents'

const THEME = {
  navy: '#2b56d8',
  navyDeep: '#1a42af',
  navyMid: '#1b7ff2',
  yellow: '#FACC15',
  yellowText: '#FDE68A',
}

const CORE_VALUES = [
  { title: 'Kindness', description: 'Everyone with compassion and Care', image: '/Kindness.jpg'},
  { title: 'Unity', description: 'Working together as a team work for a common goal.', image: '/Unity.jpg'},
  { title: 'Service', description: 'Helping other and giving back to the community.', image: '/Service.jpg'},
  { title: 'Generosity', description: 'Giving time, resources, and effort selflessly..', image: '/Generosity.jpg'},
  { title: 'Aspiration', description: 'Striving to achieve our best and reach our goal.', image: '/Aspiration.jpg'},
  { title: 'Nurture', description: 'Nurture providing care and support to other thrive.', image: '/Nurture.jpg'},
]

const LATEST_NEWS_PAGE_SIZE = 6

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

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-10 text-center">
      <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
      <div className="mt-3 flex items-center justify-center gap-3">
        <div className="h-0.5 w-8 rounded-full bg-yellow-400" />
        <p className="text-sm text-white/75 sm:text-base">{subtitle}</p>
      </div>
    </div>
  )
}

function GlassCard({ children, className = '' }) {
  return (
    <article
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 ${className}`}
      style={{
        background: 'linear-gradient(150deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
        backdropFilter: 'blur(18px)',
      }}
    >
      {children}
    </article>
  )
}

export default function WhoWeAre({ mode = 'overview' }) {
  const navigate = useNavigate()
  const supabaseEnabled = isSupabaseEnabled()
  const [latestNewsItems, setLatestNewsItems] = useState([])
  const [latestNewsLoading, setLatestNewsLoading] = useState(false)
  const [latestNewsPage, setLatestNewsPage] = useState(1)
  const [latestNewsTotalPages, setLatestNewsTotalPages] = useState(1)

  const loadLatestNews = async (page = 1) => {
    const nextPage = Math.max(1, Number(page || 1))
    setLatestNewsPage(nextPage)

    if (!supabaseEnabled || !supabase) {
      setLatestNewsItems([])
      setLatestNewsTotalPages(1)
      return
    }

    setLatestNewsLoading(true)
    try {
      const { count, error: countError } = await supabase
        .from('achievements')
        .select('id', { count: 'exact', head: true })
      if (countError) throw countError

      const total = Number(count || 0)
      const pages = Math.max(1, Math.ceil(total / LATEST_NEWS_PAGE_SIZE))
      setLatestNewsTotalPages(pages)

      const from = (nextPage - 1) * LATEST_NEWS_PAGE_SIZE
      const to = from + LATEST_NEWS_PAGE_SIZE - 1
      const { data, error } = await supabase
        .from('achievements')
        .select('id,title,occurred_at,location,description,image_paths,created_at')
        .order('occurred_at', { ascending: false })
        .range(from, to)
      if (error) throw error

      setLatestNewsItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('Failed to load news.', err)
      setLatestNewsItems([])
      setLatestNewsTotalPages(1)
    } finally {
      setLatestNewsLoading(false)
    }
  }

  useEffect(() => {
    if (mode !== 'news') return
    void loadLatestNews(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, supabaseEnabled])

  const pageTitle = mode === 'mission-vision'
    ? 'Mission and Vision'
    : mode === 'news'
      ? 'Latest News'
      : 'What is Kusgan and History'

  const pageSubtitle = mode === 'mission-vision'
    ? 'Explore the purpose, future, and core values KUSGAN stands for.'
    : mode === 'news'
      ? 'Read the latest articles, achievements, and updates from KUSGAN Volunteers Inc.'
      : 'Read the overview and historical foundation of KUSGAN.'

  return (
    <div
      className="min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8"
      style={{ background: `linear-gradient(135deg, ${THEME.navyDeep} 0%, ${THEME.navy} 55%, ${THEME.navyMid} 100%)` }}
    >
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate('/landing')}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <ArrowLeft size={15} />
          Back to Landing
        </button>
        <SectionHeader title={pageTitle} subtitle={pageSubtitle} />

        {mode === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GlassCard>
              <div className="absolute left-0 right-0 top-0 h-0.5 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${THEME.yellow}, ${THEME.yellowText})` }} />
              <div className="absolute inset-x-0 top-0 h-24" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }} />
              <h3 className="mb-3 font-heading text-xl font-bold text-white sm:text-2xl">What is Kusgan?</h3>
              <div className="space-y-4 text-sm leading-relaxed text-white/82 sm:text-base">
                <p>
                  Kusgan Volunteers Inc. (KVI) is a community-driven volunteer organization rooted in Cagayan de Oro City,
                  built to mobilize people for meaningful action when communities need it most. It unites individuals and
                  partner groups who share a heart for service, teamwork, and practical solutions.
                </p>
                <p>
                  The organization is best known for providing the first meal during calamities, but its work goes far beyond
                  emergency response. KVI also leads medical missions, feeding programs, environmental initiatives, outreach
                  activities, and operation tuli to support families and vulnerable sectors.
                </p>
                <p>
                  More than a group of volunteers, KVI is a growing movement that promotes volunteerism and social inclusion.
                  It inspires ordinary people to take part in community-building, creating lasting impact through consistent,
                  hands-on service.
                </p>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="absolute left-0 right-0 top-0 h-0.5 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${THEME.yellow}, ${THEME.yellowText})` }} />
              <div className="absolute inset-x-0 top-0 h-24" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }} />
              <h3 className="mb-3 font-heading text-xl font-bold text-white sm:text-2xl">History</h3>
              <div className="space-y-4 text-sm leading-relaxed text-white/82 sm:text-base">
                <p>
                  On the 7th day of November 2020, Kusgan Volunteers Inc. (KVI) was founded by Noel "Doy Danlag"
                  Raboy and Jerson Ebal. Their passion for volunteerism and community service motivated them to build
                  the organization.
                </p>
                <p>
                  On that same day, fourteen (14) individuals from four (4) different organizations namely ALERT 10,
                  Kabalikat Civic, Rescue Line, and COCPO gathered at Kauswagan Covered Court to discuss the advocacy
                  of the proposed organization. On the 21st of December 2020, the Security Exchange Commission (SEC)
                  released the certificate with the registration number CN20206496. On the 17th day of January 2021,
                  Kusgan Volunteers Inc. was officially launched at Brgy. Bon-bon, Cagayan de Oro City.
                </p>
              </div>
            </GlassCard>
          </div>
        )}

        {mode === 'mission-vision' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <GlassCard className="rounded-2xl">
                <div className="absolute left-0 right-0 top-0 h-0.5 rounded-t-2xl bg-yellow-400" />
                <div className="absolute inset-x-0 top-0 h-16" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }} />
                <div className="absolute bottom-0 right-0 h-32 w-32 -z-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.07) 0%, transparent 70%)' }} />
                <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: THEME.yellow }}>Mission</p>
                <h3 className="mb-2 font-heading text-lg font-bold text-white">Our Purpose</h3>
                <p className="relative text-sm leading-relaxed text-white/80">
                  to be catalyst of community involvement though volunteerism and creating social inclusion for a better world to live in
                </p>
              </GlassCard>

              <GlassCard className="rounded-2xl">
                <div className="absolute left-0 right-0 top-0 h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${THEME.yellow}, ${THEME.yellowText})` }} />
                <div className="absolute inset-x-0 top-0 h-16" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }} />
                <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.07) 0%, transparent 70%)' }} />
                <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: THEME.yellow }}>Vision</p>
                <h3 className="mb-2 font-heading text-lg font-bold text-white">Our Future</h3>
                <p className="relative text-sm leading-relaxed text-white/80">To inspire everyone through volunteerism.</p>
              </GlassCard>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CORE_VALUES.map(value => (
                <article
                  key={value.title}
                  className="group relative cursor-default overflow-hidden rounded-2xl"
                  style={{ height: '240px' }}
                >
                  <img
                    src={value.image}
                    alt={value.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div
                    className="absolute inset-0 transition-all duration-400"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)',
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span
                      aria-hidden="true"
                      className="font-heading text-6xl font-black tracking-[0.2em] text-white drop-shadow-[0_10px_26px_rgba(0,0,0,0.65)] sm:text-7xl"
                      style={{ textShadow: '0 0 18px rgba(255,255,255,0.55)' }}
                    >
                      {value.letter}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <h4 className="font-heading text-lg font-bold leading-tight text-white">{value.title}</h4>
                    <p className="mt-1 text-xs leading-snug text-slate-300 sm:text-sm">{value.description}</p>
                  </div>
                  <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-yellow-400 opacity-80" />
                </article>
              ))}
            </div>
          </div>
        )}

        {mode === 'news' && (
          <div className="space-y-6">
            {latestNewsLoading ? (
              <GlassCard>
                <p className="text-center text-sm text-white/75">Loading latest news...</p>
              </GlassCard>
            ) : latestNewsItems.length === 0 ? (
              <GlassCard>
                <p className="text-center text-sm text-white/75">No news yet.</p>
              </GlassCard>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {latestNewsItems.map((item) => {
                    const description = String(item?.description || '').trim()
                    const previewDescription = description.length > 160 ? `${description.slice(0, 160).trimEnd()}...` : description
                    const occurredAt = item?.occurred_at ? new Date(item.occurred_at) : null
                    const dateLabel =
                      occurredAt && !Number.isNaN(occurredAt.getTime())
                        ? occurredAt.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                        : ''
                    const images = Array.isArray(item?.image_paths) ? item.image_paths : []
                    const imageUrl = images[0] ? resolveAchievementImage(images[0]) : ''

                    return (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
                      >
                        <div className="h-56 w-full overflow-hidden bg-slate-100">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">No image</div>
                          )}
                        </div>
                        <div className="space-y-3 p-5">
                          <div className="inline-flex items-center rounded-full border border-yellow-300 bg-yellow-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-yellow-700">
                            News Article
                          </div>
                          <h3 className="text-xl font-bold leading-tight text-slate-900">
                            {String(item?.title || '').trim() || 'Untitled'}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {dateLabel}
                            {item?.location ? ` • ${String(item.location).trim()}` : ''}
                          </p>
                          {description ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                              <p className="text-sm leading-7 text-slate-700">{previewDescription}</p>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => navigate(`/news/${item.id}`)}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-yellow-300 bg-yellow-400 px-4 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-yellow-300"
                          >
                            Read More Article
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void loadLatestNews(Math.max(1, latestNewsPage - 1))}
                    disabled={latestNewsPage <= 1}
                    className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/15 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-semibold text-white/75">
                    Page {latestNewsPage} of {latestNewsTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => void loadLatestNews(Math.min(latestNewsTotalPages, latestNewsPage + 1))}
                    disabled={latestNewsPage >= latestNewsTotalPages}
                    className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/15 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
