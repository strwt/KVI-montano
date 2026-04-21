import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled } from '../lib/supabaseEvents'
import { KUSGAN_VOLUNTEERS } from '../data/kusganVolunteers'

const HERO_IMAGE = '/kvi.png'

const THEME = {
  navy: '#2b56d8',
  navyDeep: '#1a42af',
  navyMid: '#1b7ff2',
  yellowText: '#FDE68A',
}

const BOARD_STRUCTURE = {
  chairperson: {
    name: 'Noel "Strong Doy" Danlag Raboy',
    position: 'Chairman',
    committee: 'Executive Board',
    image: '/Board Organizational Structure/Noel Raboy.png',
    icon: Crown,
  },
  viceChairperson: {
    name: 'Henry "Strong Arrow" Lopez',
    position: 'Vice Chairperson',
    committee: 'Executive Board',
    image: '/Board Organizational Structure/Henry Lopez.png',
    icon: ShieldCheck,
  },
  executiveDirector: {
    name: 'Jerson "Strong Jerson 32" Ebal',
    position: 'Executive Director and President',
    committee: 'Executive Board',
    image: '/Board Organizational Structure/Jerson Ebal.png',
  },
  officers: [
    { name: 'Love Jhoye "Golden Jhoye" Raboy', position: 'Board Member', image: '/Board Organizational Structure/Love Jhoye Raboy.png' },
    { name: 'Ardex "Strong Ian" Mejares', position: 'Board Member', image: '/Board Organizational Structure/KVI.png' },
    { name: 'Renan Diaz', position: 'Board Member', image: '/Board Organizational Structure/Renan P. Diaz.png' },
    { name: 'Kusgan Joselyn Piñalosa', position: 'Board Member', image: '/Board Organizational Structure/KVI.png' },
    { name: 'Kusgan Niña Dinorog', position: 'Board Member', image: '/Board Organizational Structure/KVI.png' },
    { name: 'Kusgan Joel Marcaida', position: 'Board Member', image: '/Board Organizational Structure/Joel Marcaida.jpg' },
    { name: 'Kusgan Lord Ubod', position: 'Board Member', image: '/Board Organizational Structure/Lord Ubod.png' },
  ],
}

const normalizeCommitteeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

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

function OrgPersonCard({ person }) {
  const Icon = person.icon
  return (
    <article className="mx-auto text-center">
      <div
        className="mx-auto h-[6.7rem] w-[6.2rem] overflow-hidden rounded-2xl sm:h-32 sm:w-[7.2rem]"
        style={{
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 10px 20px rgba(0,0,0,0.45)',
        }}
      >
        <img src={person.image || HERO_IMAGE} alt={person.name} className="h-full w-full object-cover" />
      </div>
      <p className="mt-2 text-xs font-semibold text-white sm:text-sm">{person.name}</p>
      {person.position ? (
        <span
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
          style={{
            background: 'rgba(250,204,21,0.14)',
            borderColor: 'rgba(250,204,21,0.32)',
            color: THEME.yellowText,
          }}
        >
          {Icon ? <Icon size={10} /> : null}
          {person.position}
        </span>
      ) : null}
    </article>
  )
}

function resolveProfileImage(value) {
  const raw = String(value || '').trim()
  if (!raw) return HERO_IMAGE
  if (raw.startsWith('/') || raw.startsWith('http')) return raw
  if (raw.startsWith('data:image/')) return raw
  try {
    const { data } = supabase?.storage?.from?.('profile-images')?.getPublicUrl?.(raw) || {}
    return data?.publicUrl || HERO_IMAGE
  } catch {
    return HERO_IMAGE
  }
}

export default function OrganizationStructure({ mode = 'board' }) {
  const navigate = useNavigate()
  const { user, getAllMembers, getAdmins, committees } = useAuth()
  const supabaseEnabled = isSupabaseEnabled()
  const [kusganVolunteerPeople, setKusganVolunteerPeople] = useState([])
  const [committeeNames, setCommitteeNames] = useState([])
  const [loadingPeople, setLoadingPeople] = useState(true)
  const [loadingCommittees, setLoadingCommittees] = useState(true)
  const contextMemberPeopleRef = useRef([])

  const contextMemberPeople = useMemo(() => {
    const members = getAllMembers ? getAllMembers() : []
    const admins = getAdmins ? getAdmins() : []
    const combined = [...(Array.isArray(members) ? members : []), ...(Array.isArray(admins) ? admins : [])]
    const people = combined
      .map(member => ({
        name: String(member?.name || '').trim(),
        image: resolveProfileImage(member?.profileImage),
        committee: String(member?.committee || '').trim(),
        committeeRole: String(member?.committeeRole || member?.committee_role || '').trim(),
      }))
      .filter(person => person.name)

    const unique = new Map()
    people.forEach(person => {
      const key = person.name.toLowerCase()
      if (!unique.has(key)) unique.set(key, person)
    })

    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [getAdmins, getAllMembers])

  useEffect(() => {
    contextMemberPeopleRef.current = contextMemberPeople
  }, [contextMemberPeople])

  useEffect(() => {
    let active = true

    const normalizePeople = (rows = []) => {
      const people = rows
        .map(row => ({
          name: String(row?.name || '').trim(),
          image: resolveProfileImage(row?.profile_image || row?.profileImage),
          committee: String(row?.committee || '').trim(),
          committeeRole: String(row?.committee_role || row?.committeeRole || '').trim(),
        }))
        .filter(person => person.name)

      const unique = new Map()
      people.forEach(person => {
        const key = person.name.toLowerCase()
        if (!unique.has(key)) unique.set(key, person)
      })

      return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name))
    }

    const loadPeople = async () => {
      setLoadingPeople(true)

      if (!supabaseEnabled || !supabase) {
        if (active) {
          setKusganVolunteerPeople(contextMemberPeopleRef.current || [])
          setLoadingPeople(false)
        }
        return
      }

      try {
        const rpcClient = typeof supabase?.schema === 'function' ? supabase.schema('public') : supabase
        let result = await rpcClient.rpc('get_landing_committee_members')
        if (result?.error?.code === 'PGRST202') {
          result = await rpcClient.rpc('get_landing_volunteers', { p_names: KUSGAN_VOLUNTEERS })
        }
        const { data, error } = result || {}

        if (!active) return
        if (error) {
          console.warn('Failed to load organization structure members.', error)
          setKusganVolunteerPeople([])
          setLoadingPeople(false)
          return
        }

        setKusganVolunteerPeople(normalizePeople(data))
        setLoadingPeople(false)
      } catch (error) {
        if (!active) return
        console.warn('Failed to load organization structure members.', error)
        setKusganVolunteerPeople([])
        setLoadingPeople(false)
      }
    }

    void loadPeople()
    return () => {
      active = false
    }
  }, [supabaseEnabled, user?.id])

  useEffect(() => {
    let active = true

    const loadCommittees = async () => {
      setLoadingCommittees(true)

      if (!supabaseEnabled || !supabase) {
        if (active) {
          setCommitteeNames(Array.isArray(committees) ? committees : [])
          setLoadingCommittees(false)
        }
        return
      }

      try {
        const queryClient = typeof supabase?.schema === 'function' ? supabase.schema('public') : supabase
        const pageSize = 1000
        const names = []

        for (let offset = 0; offset < 10_000; offset += pageSize) {
          const { data, error } = await queryClient
            .from('committees')
            .select('name')
            .order('name', { ascending: true })
            .range(offset, offset + pageSize - 1)

          if (!active) return
          if (error) {
            console.warn('Failed to load committees.', error)
            setCommitteeNames([])
            setLoadingCommittees(false)
            return
          }

          const page = Array.isArray(data) ? data.map(row => row?.name).filter(Boolean) : []
          names.push(...page)
          if (page.length < pageSize) break
        }

        setCommitteeNames(names)
        setLoadingCommittees(false)
      } catch (error) {
        if (!active) return
        console.warn('Failed to load committees.', error)
        setCommitteeNames([])
        setLoadingCommittees(false)
      }
    }

    void loadCommittees()
    return () => {
      active = false
    }
  }, [committees, supabaseEnabled])

  const displayVolunteerPeople = useMemo(() => {
    if (kusganVolunteerPeople.length > 0) return kusganVolunteerPeople
    if (loadingPeople) return []

    if (!supabaseEnabled || !supabase) {
      if (contextMemberPeople.length > 0) return contextMemberPeople
      return KUSGAN_VOLUNTEERS
        .map(name => ({ name, image: HERO_IMAGE, committee: '', committeeRole: '' }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    return []
  }, [contextMemberPeople, kusganVolunteerPeople, loadingPeople, supabaseEnabled])

  const committeeOptions = useMemo(() => {
    const source =
      Array.isArray(committeeNames) && committeeNames.length > 0
        ? committeeNames
        : (Array.isArray(committees) ? committees : [])

    const uniqueByKey = new Map()
    source
      .map(name => String(name || '').trim())
      .filter(Boolean)
      .forEach(name => {
        const key = normalizeCommitteeKey(name)
        if (!key || uniqueByKey.has(key)) return
        uniqueByKey.set(key, name)
      })

    return [...uniqueByKey.values()].sort((a, b) => a.localeCompare(b))
  }, [committeeNames, committees])

  const overallOicPeople = useMemo(() => {
    const seen = new Set()
    return displayVolunteerPeople.filter(person => {
      const isOic = String(person?.committeeRole || '').trim().toLowerCase() === 'oic'
      if (!isOic) return false
      const key = String(person.name || '').trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [displayVolunteerPeople])

  const committeeGroups = useMemo(() => {
    const grouped = new Map(
      committeeOptions.map(name => [normalizeCommitteeKey(name), { committee: name, oic: [], members: [] }])
    )

    displayVolunteerPeople.forEach(person => {
      const committee = String(person?.committee || '').trim()
      if (!committee) return
      const key = normalizeCommitteeKey(committee)
      if (!grouped.has(key)) grouped.set(key, { committee, oic: [], members: [] })
      const isOic = String(person?.committeeRole || '').trim().toLowerCase() === 'oic'
      if (isOic) grouped.get(key).oic.push(person)
      else grouped.get(key).members.push(person)
    })

    return [...grouped.values()]
      .map(group => ({
        ...group,
        oic: [...group.oic].sort((a, b) => a.name.localeCompare(b.name)),
        members: [...group.members].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.committee.localeCompare(b.committee))
  }, [committeeOptions, displayVolunteerPeople])

  const pageTitle = mode === 'kusgan' ? 'KUSGAN Committee' : 'Board Members'
  const pageSubtitle = mode === 'kusgan'
    ? 'Browse committees, OIC assignments, and volunteer groupings.'
    : 'Kusgan Board Members 2026.'

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

        {mode === 'board' ? (
          <div className="rounded-3xl border border-white/15 bg-black/20 p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-yellow-300/25" />
              <span className="rounded-full border border-yellow-300/30 bg-yellow-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-yellow-100">
                Executive Board
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-300/25" />
            </div>
            <div className="flex flex-wrap items-start justify-center gap-6">
              {[BOARD_STRUCTURE.chairperson, BOARD_STRUCTURE.viceChairperson, BOARD_STRUCTURE.executiveDirector].map(person => (
                <OrgPersonCard key={person.name} person={person} />
              ))}
            </div>

            <div className="mt-10 grid grid-cols-1 place-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BOARD_STRUCTURE.officers.map(person => (
                <OrgPersonCard key={person.name} person={person} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-3xl border border-white/15 bg-black/20 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-yellow-300/25" />
                <span className="inline-flex flex-col items-center rounded-full border border-yellow-300/30 bg-yellow-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-yellow-100">
                  <span>OIC</span>
                  <span className="text-[9px] normal-case tracking-wide">(Community Development Officer)</span>
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-300/25" />
              </div>

              {loadingPeople ? (
                <div className="text-center text-sm text-white/70">Loading committee data...</div>
              ) : overallOicPeople.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {overallOicPeople.map(person => (
                    <div
                      key={person.name}
                      className="min-w-[220px] rounded-lg border border-white/12 bg-black/45 px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm"
                    >
                      {person.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-white/70">No OIC assigned.</div>
              )}
            </div>

            {loadingPeople || loadingCommittees ? (
              <div className="rounded-3xl border border-white/15 bg-black/20 p-6 text-center text-sm text-white/70 backdrop-blur-xl">
                Loading committee groups...
              </div>
            ) : committeeGroups.length === 0 ? (
              <div className="rounded-3xl border border-white/15 bg-black/20 p-6 text-center text-sm text-white/70 backdrop-blur-xl">
                No committee data available yet.
              </div>
            ) : (
              <div
                className="flex flex-nowrap gap-6 overflow-x-auto pb-2"
                style={{
                  scrollbarGutter: 'stable',
                  WebkitOverflowScrolling: 'touch',
                  paddingInline: '16px',
                  scrollPaddingInline: '16px',
                }}
              >
                {committeeGroups.map(group => (
                  <div
                    key={group.committee}
                    className="shrink-0 text-center"
                    style={{ minWidth: '220px', maxWidth: '220px', width: '100%' }}
                  >
                    <div className="mb-3 flex items-center justify-center gap-2">
                      <span
                        className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                        style={{
                          color: THEME.yellowText,
                          background: 'rgba(250,204,21,0.12)',
                          borderColor: 'rgba(250,204,21,0.28)',
                        }}
                      >
                        {group.committee}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      {group.oic.map(person => (
                        <div
                          key={`${group.committee}-oic-${person.name}`}
                          className="w-full rounded-lg border border-yellow-300/20 bg-yellow-400/10 px-2.5 py-2 text-center text-[11px] font-semibold text-yellow-100 sm:text-xs"
                        >
                          {person.name}
                        </div>
                      ))}

                      {group.members.length > 0 ? (
                        group.members.map(person => (
                          <div
                            key={`${group.committee}-${person.name}`}
                            className="w-full rounded-lg border border-white/12 bg-black/45 px-2.5 py-2 text-center text-[11px] font-semibold text-white sm:text-xs"
                          >
                            {person.name}
                          </div>
                        ))
                      ) : (
                        <div className="w-full rounded-lg border border-white/10 bg-black/35 px-2.5 py-2 text-center text-[11px] text-white/60 sm:text-xs">
                          No members assigned yet.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
