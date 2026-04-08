import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KUSGAN_VOLUNTEERS } from '../data/kusganVolunteers'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled } from '../lib/supabaseEvents'
import { useAuth } from '../context/AuthContext'
import {
  LogIn,
  Handshake,
  Sparkles,
  Crown,
  ShieldCheck,
  Leaf,
  Activity,
  Flame,
  HeartPulse,
  Users,
  FolderCheck,
  LayoutGrid,
  CalendarDays,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react'

const HERO_IMAGE = '/kvi.png'

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Services', href: '#services' },
  { label: 'Structure', href: '#organizational-structure' },
  { label: 'About', href: '#about' },
]

const SPONSOR_LOGOS = [
  'Armunds.jpg',
  'BFP.png',
  'BJMP.png',
  'Bohol-mpc.png',
  'CityMall.png',
  'CLIFSA.png',
  'Climbs.jpg',
  'COCPO.png',
  'Golden Dream.png',
  'JNT.png',
  'Knorr.png',
  'Natco.jpeg',
  'Nature.webp',
  'NCSC.jpg',
  'NGO.jpg',
  'NO.png',
  'OIC.webp',
  'Oro.png',
  'PNP.png',
  'PNVCA.jpg',
  'Pop-Com.png',
  'Remys.jpg',
  'Strong.jpg',
  'VENUS.png',
]

const SPONSOR_MARQUEE_REPEAT = 4
const SPONSOR_MARQUEE_SHIFT = `-${100 / SPONSOR_MARQUEE_REPEAT}%`
const SPONSOR_LOGOS_LOOP = Array.from({ length: SPONSOR_MARQUEE_REPEAT }, () => SPONSOR_LOGOS).flat()

const SERVICES = [
  {
    key: 'environmental',
    title: 'Environmental',
    description: 'Tree planting, clean-up drives, and ecosystem care for greener communities.',
    icon: Leaf,
    iconClass: 'icon-theme-environmental',
    accent: '#22c55e',
    iconBg: 'rgba(34,197,94,0.12)',
    iconColor: '#4ade80',
  },
  {
    key: 'relief',
    title: 'Relief Operation',
    description: 'Rapid volunteer coordination and emergency support during disasters.',
    icon: Activity,
    iconClass: 'icon-theme-relief',
    accent: '#3b82f6',
    iconBg: 'rgba(59,130,246,0.12)',
    iconColor: '#60a5fa',
  },
  {
    key: 'fire',
    title: 'Fire Response',
    description: 'Community fire incident assistance and coordinated response support.',
    icon: Flame,
    iconClass: 'icon-theme-fire',
    accent: '#f97316',
    iconBg: 'rgba(249,115,22,0.12)',
    iconColor: '#fb923c',
  },
  {
    key: 'medical',
    title: 'Medical',
    description: 'Medical missions, first aid support, and health outreach programs.',
    icon: HeartPulse,
    iconClass: 'icon-theme-medical',
    accent: '#ef4444',
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: '#f87171',
  },
]

const CORE_VALUES = [
  {
    title: 'Kindness',
    description: 'Everyone with compassion and Care',
    image: '/Kindness.jpg',
    letter: 'K',
  },
  {
    title: 'Unity',
    description: 'Working together as a team work for a common goal.',
    image: '/Unity.jpg',
    letter: 'U',
  },
  {
    title: 'Service',
    description: 'Helping other and giving back to the community.',
    image: '/Service.jpg',
    letter: 'S',
  },
  {
    title: 'Generosity',
    description: 'Giving time, resources, and effort selflessly..',
    image: '/Generosity.jpg',
    letter: 'G',
  },
  {
    title: 'Aspiration',
    description: 'Striving to achieve our best and reach our goal.',
    image: '/Aspiration.jpg',
    letter: 'A',
  },
  {
    title: 'Nurture',
    description: 'Nurture providing care and support to other thrive.',
    image: '/Nurture.jpg',
    letter: 'N',
  },
]

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
  BoardMembers: [
    { name: 'Love Jhoye "Golden Jhoye" Raboy', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/Love Jhoye Raboy.png' },
    { name: 'Ardex "Strong Ian" Mejares', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/KVI.png' },
    { name: 'Renan Diaz', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/Renan P. Diaz.png' },
    { name: 'Kusgan Joselyn Piñalosa', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/KVI.png' },
    { name: 'Kusgan Niña Dinorog', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/KVI.png' },
    { name: 'Kusgan Joel Marcaida', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/Joel Marcaida.jpg' },
    { name: 'Kusgan Lord Ubod', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/Lord Ubod.png' },
  ],
  officers: [
    { name: 'Love Jhoye "Golden Jhoye" Raboy', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/Love Jhoye Raboy.png' },
    { name: 'Ardex "Strong Ian" Mejares', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/KVI.png' },
    { name: 'Renan Diaz', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/Renan P. Diaz.png' },
    { name: 'Kusgan Joselyn Pinalosa', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/KVI.png' },
    { name: 'Kusgan Niña Dinorog', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/KVI.png' },
    { name: 'Kusgan Joel Marcaida', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/Joel Marcaida.jpg' },
    { name: 'Kusgan Lord Ubod', position: 'Board Member', committee: 'Board', image: '/Board Organizational Structure/Lord Ubod.png' },
  ],
}

const ORGANIZATION_VIEWS = [
  {
    key: 'board',
    label: 'Board Organizational Structure',
    subtitle: 'Board of Trustees and executive officers overseeing governance and strategy.',
  },
  {
    key: 'kusgan',
    label: 'KUSGAN Organizational Structure',
    subtitle: 'Committee teams of KUSGAN.',
  },
]

/* ── Sub-components ─────────────────────────────── */

function NavBar({ navigate }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'shadow-2xl shadow-black/60'
          : ''
      }`}
      style={{
        background: scrolled
          ? 'rgba(6,6,6,0.88)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate('/landing')}
          className="flex items-center gap-3 group"
        >
          <div
            className="w-9 h-9 rounded-full bg-white p-1.5 shadow-lg transition-all duration-200"
            style={{ boxShadow: '0 0 0 2px rgba(220,38,38,0.3)' }}
          >
            <img src={HERO_IMAGE} alt="KUSGAN logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm leading-tight font-heading tracking-widest text-white">KUSGAN</p>
            <p className="text-[9px] text-red-400 tracking-[0.2em] uppercase">Volunteer Inc.</p>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200 relative group"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-red-500 group-hover:w-full transition-all duration-300 rounded-full" />
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
       

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(v => !v)}
          className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-4 py-5 space-y-1 border-t"
          style={{
            background: 'rgba(6,6,6,0.96)',
            backdropFilter: 'blur(24px)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-xl transition-colors"
            >
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-4 mt-2 border-t border-white/8">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex-1 text-sm py-2.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/8 transition-colors"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/recruitment')}
              className="flex-1 text-sm py-2.5 rounded-xl bg-red-600 text-white font-semibold"
            >
              Join Us
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

function SectionHeader({ eyebrow, title, subtitle, centered = false }) {
  return (
    <div className={`mb-10 sm:mb-12 ${centered ? 'text-center' : ''}`}>
      {eyebrow && (
        <span
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-4 border"
          style={{
            background: 'rgba(220,38,38,0.1)',
            borderColor: 'rgba(220,38,38,0.25)',
            color: '#fca5a5',
          }}
        >
          {eyebrow}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white font-heading leading-tight">
        {title}
      </h2>
      {subtitle && (
        <div className={`mt-3 flex items-center gap-3 ${centered ? 'justify-center' : ''}`}>
          <div className="w-8 h-0.5 bg-red-600 rounded-full shrink-0" />
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{subtitle}</p>
        </div>
      )}
    </div>
  )
}

function OrgPersonCard({ person, large = false, size = 'normal' }) {
  const Icon = person.icon
  const position = person.position || person.role
  const sizeClass = large
    ? 'w-28 sm:w-36'
    : size === 'board'
      ? 'w-[6.2rem] h-[6.7rem] sm:w-[7.2rem] sm:h-32'
      : 'w-16 sm:w-20'
  return (
    <article className="text-center mx-auto">
      <div
        className={`mx-auto rounded-2xl overflow-hidden ${sizeClass} ${size === 'board' ? '' : 'aspect-[3/4]'} bg-gray-900`}
        style={{
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: large
            ? '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)'
            : '0 10px 20px rgba(0,0,0,0.45)',
        }}
      >
        <img src={person.image} alt={person.name} className="w-full h-full object-cover" />
      </div>
      <p
        className={`${large ? 'mt-3 text-base sm:text-lg' : 'mt-2 text-xs sm:text-sm'} font-semibold text-white font-heading`}
      >
        {person.name}
      </p>
      {position ? (
        <span
          className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
          style={{
            background: 'rgba(220,38,38,0.15)',
            borderColor: 'rgba(220,38,38,0.3)',
            color: '#fca5a5',
          }}
        >
          {Icon ? <Icon size={10} /> : null}
          {position}
        </span>
      ) : null}
      {person.committee ? (
        <p className="mt-1 text-[10px] uppercase tracking-widest" style={{ color: 'rgba(248,113,113,0.7)' }}>
          {person.committee}
        </p>
      ) : null}
    </article>
  )
}

/* ── Main Page ──────────────────────────────────── */

function Landing() {
  const navigate = useNavigate()
  const { user, getAllMembers, getAdmins, ensureAdminDataLoaded, committees } = useAuth()
  const supabaseEnabled = isSupabaseEnabled()
  const pageRef = useRef(null)
  const committeeScrollRef = useRef(null)
  const committeeDragStartXRef = useRef(0)
  const committeeDragStartScrollLeftRef = useRef(0)
  const committeeDragMovedRef = useRef(false)
  const [kusganVolunteerPeople, setKusganVolunteerPeople] = useState([])
  const [landingMembersLoading, setLandingMembersLoading] = useState(true)
  const landingMembersLoadedRef = useRef(false)
  const [structureKey, setStructureKey] = useState('board')
  const activeStructure = ORGANIZATION_VIEWS.find(view => view.key === structureKey) || ORGANIZATION_VIEWS[0]
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [publicCommittees, setPublicCommittees] = useState([])
  const [publicCommitteesLoaded, setPublicCommitteesLoaded] = useState(false)
  const [committeeDragging, setCommitteeDragging] = useState(false)

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

  const formatMemberSince = (value) => {
    if (!value) return ''
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    }

    const raw = String(value).trim()
    if (!raw) return ''

    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return raw
    return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const coerceString = (value) => String(value ?? '').trim()

  const openPerson = (person) => {
    if (!person?.name) return
    const allMembers = getAllMembers ? getAllMembers() : []
    const matched = (allMembers || []).find(
      member => String(member?.name || '').trim().toLowerCase() === String(person.name || '').trim().toLowerCase()
    )
    const resolvedImage = resolveProfileImage(matched?.profileImage || person.image)
    setSelectedPerson({
      name: person.name,
      image: resolvedImage,
      idNumber: coerceString(matched?.idNumber || matched?.id_number || person.idNumber),
      contactNumber: coerceString(matched?.contactNumber || person.contactNumber),
      bloodType: coerceString(matched?.bloodType || person.bloodType),
      committee: coerceString(matched?.committee || person.committee),
      memberSince: formatMemberSince(matched?.memberSince || person.memberSince),
      status: coerceString(matched?.status || person.status),
    })
  }
  useEffect(() => {
    const root = pageRef.current
    if (!root) return
    const targets = root.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    targets.forEach(t => observer.observe(t))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') return
    void ensureAdminDataLoaded()
  }, [ensureAdminDataLoaded, user?.role, user?.id])

  useEffect(() => {
    if (!isSupabaseEnabled()) return undefined

    let active = true

    const load = async () => {
      setPublicCommitteesLoaded(false)
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
            console.warn('Landing: failed to load committees from Supabase.', error)
            return
          }

          const page = Array.isArray(data) ? data.map(row => row?.name).filter(Boolean) : []
          names.push(...page)
          if (page.length < pageSize) break
        }

        setPublicCommittees(names)
      } catch {
        // ignore
      } finally {
        if (active) setPublicCommitteesLoaded(true)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [supabaseEnabled])

  const savedCommitteeCount = useMemo(() => {
    const source =
      Array.isArray(publicCommittees) && publicCommittees.length > 0
        ? publicCommittees
        : (Array.isArray(committees) ? committees : [])

    const unique = new Set(
      source
        .map(name => String(name || '').trim())
        .filter(Boolean)
    )

    return unique.size
  }, [committees, publicCommittees])

  const stats = useMemo(() => {
    const committeeValue = supabaseEnabled && !publicCommitteesLoaded ? '...' : String(savedCommitteeCount)
    return [
      { label: 'Volunteers', value: '100+', icon: Users },
      { label: 'Activities', value: '150+', icon: FolderCheck },
      { label: 'Committees', value: committeeValue, icon: LayoutGrid },
      { label: 'Years Active', value: '5', icon: CalendarDays },
    ]
  }, [publicCommitteesLoaded, savedCommitteeCount, supabaseEnabled])

  const contextMemberPeople = useMemo(() => {
    const members = getAllMembers ? getAllMembers() : []
    const admins = getAdmins ? getAdmins() : []
    const combined = [...(Array.isArray(members) ? members : []), ...(Array.isArray(admins) ? admins : [])]
    const people = combined
      .map(member => ({
        name: String(member?.name || '').trim(),
        image: resolveProfileImage(String(member?.profileImage || '').trim()),
        committee: String(member?.committee || '').trim(),
      }))
      .filter(person => person.name)
    const unique = new Map()
	    people.forEach(person => {
	      const key = person.name.toLowerCase()
	      if (!unique.has(key)) unique.set(key, person)
	    })
	    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name))
	  }, [getAdmins, getAllMembers])

  const contextMemberPeopleRef = useRef([])
  useEffect(() => {
    contextMemberPeopleRef.current = contextMemberPeople
  }, [contextMemberPeople])

		  useEffect(() => {
		    let isMounted = true
		    let reloadTimer = null

        // Avoid flashing stale committee assignments on login/user switch.
        landingMembersLoadedRef.current = false

	    const normalizePeople = (rows = []) => {
	      const people = rows
	        .map(row => ({
	          name: String(row?.name || '').trim(),
	          image: resolveProfileImage(row?.profile_image || row?.profileImage),
	          idNumber: String(row?.id_number || row?.idNumber || '').trim(),
	          contactNumber: String(row?.contact_number || row?.contactNumber || '').trim(),
	          bloodType: String(row?.blood_type || row?.bloodType || '').trim(),
	          committee: String(row?.committee || '').trim(),
	          memberSince: row?.member_since || row?.memberSince || '',
	          status: String(row?.status || '').trim(),
	        }))
		        .filter(person => person.name)
	      const unique = new Map()
	      people.forEach(person => {
	        const key = person.name.toLowerCase()
	        if (!unique.has(key)) unique.set(key, person)
      })
      return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name))
    }

	    const loadMembers = async ({ initial = false } = {}) => {
        const shouldShowLoading = initial || !landingMembersLoadedRef.current
        if (isMounted && shouldShowLoading) {
          setLandingMembersLoading(true)
          if (initial) setKusganVolunteerPeople([])
        }

	      if (!supabaseEnabled || !supabase) {
	        if (isMounted) {
            setKusganVolunteerPeople(contextMemberPeopleRef.current || [])
            setLandingMembersLoading(false)
          }
	        return
	      }
	      try {
	        const rpcClient = typeof supabase?.schema === 'function' ? supabase.schema('public') : supabase
	        let result = await rpcClient.rpc('get_landing_committee_members')
	        if (result?.error?.code === 'PGRST202') {
	          // Backward-compatible fallback if the new RPC isn't deployed yet.
	          result = await rpcClient.rpc('get_landing_volunteers', { p_names: KUSGAN_VOLUNTEERS })
	        }
	        const { data, error } = result || {}

	        if (error) {
	          console.warn('Failed to load members for landing page.', error)
	          if (isMounted) {
              setKusganVolunteerPeople([])
              setLandingMembersLoading(false)
            }
	          return
        }
        if (isMounted) {
          setKusganVolunteerPeople(normalizePeople(data))
          landingMembersLoadedRef.current = true
          setLandingMembersLoading(false)
        }
      } catch (err) {
        console.warn('Failed to load members for landing page.', err)
        if (isMounted) {
          setKusganVolunteerPeople([])
          setLandingMembersLoading(false)
        }
      }
	    }

	    const scheduleReload = () => {
	      if (!isMounted) return
	      if (reloadTimer) window.clearTimeout(reloadTimer)
	      reloadTimer = window.setTimeout(() => {
	        void loadMembers()
	      }, 200)
	    }

      void loadMembers({ initial: true })

	    const handleVisibility = () => {
	      if (document.visibilityState === 'visible') scheduleReload()
	    }

	    window.addEventListener('focus', scheduleReload)
	    document.addEventListener('visibilitychange', handleVisibility)

	    let channel = null
	    if (supabaseEnabled && supabase) {
	      try {
	        channel = supabase
	          .channel('landing-profiles')
	          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
	            scheduleReload()
	          })
	          .subscribe()
	      } catch {
	        // ignore
	      }
	    }

		    return () => {
		      isMounted = false
		      if (reloadTimer) window.clearTimeout(reloadTimer)
		      window.removeEventListener('focus', scheduleReload)
		      document.removeEventListener('visibilitychange', handleVisibility)
		      if (channel && supabase) {
		        try {
		          supabase.removeChannel(channel)
		        } catch {
		          // ignore
		        }
		      }
		    }
		  }, [supabaseEnabled, user?.id])

	  const displayVolunteerPeople = useMemo(() => {
	    if (kusganVolunteerPeople.length > 0) return kusganVolunteerPeople
      if (landingMembersLoading) return []

      if (!supabaseEnabled || !supabase) {
        if (contextMemberPeople.length > 0) return contextMemberPeople
        return KUSGAN_VOLUNTEERS
          .map(name => ({ name, image: HERO_IMAGE }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }

      return []
	  }, [contextMemberPeople, kusganVolunteerPeople, landingMembersLoading, supabaseEnabled])

  const normalizeCommitteeKey = (value) => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const committeeOptions = useMemo(() => {
    const list =
      Array.isArray(committees) && committees.length > 0
        ? committees
        : Array.isArray(publicCommittees)
          ? publicCommittees
          : []
    const normalized = list.map(name => String(name || '').trim()).filter(Boolean)
    const uniqueByKey = new Map()
    normalized.forEach(name => {
      const key = normalizeCommitteeKey(name)
      if (!key) return
      if (!uniqueByKey.has(key)) uniqueByKey.set(key, name)
    })
    const unique = [...uniqueByKey.values()]
    unique.sort((a, b) => a.localeCompare(b))
    return unique
  }, [committees, publicCommittees])

  const committeeGroups = useMemo(() => {
    const trimmedOptions = committeeOptions.map(name => String(name || '').trim()).filter(Boolean)

    if (trimmedOptions.length === 0) {
      const grouped = new Map()

      displayVolunteerPeople.forEach(person => {
        const committee = String(person?.committee || '').trim()
        if (!committee) return
        const key = normalizeCommitteeKey(committee)
        if (!grouped.has(key)) grouped.set(key, { committee, members: [] })
        grouped.get(key).members.push(person)
      })

      const groups = [...grouped.values()].map(group => ({
        ...group,
        members: [...group.members].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      groups.sort((a, b) => a.committee.localeCompare(b.committee))

      return groups
    }

    const grouped = new Map(
      trimmedOptions.map(name => {
        const committee = String(name || '').trim()
        return [normalizeCommitteeKey(committee), { committee, members: [] }]
      })
    )

    displayVolunteerPeople.forEach(person => {
      const committee = String(person?.committee || '').trim()
      if (!committee) return
      const key = normalizeCommitteeKey(committee)
      if (!grouped.has(key)) grouped.set(key, { committee, members: [] })
      grouped.get(key).members.push(person)
    })

    const groups = [...grouped.values()].map(group => ({
      ...group,
      members: [...group.members].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    groups.sort((a, b) => a.committee.localeCompare(b.committee))

    return groups
  }, [committeeOptions, displayVolunteerPeople])

  const onCommitteePointerDown = (event) => {
    const scroller = committeeScrollRef.current
    if (!scroller) return
    if (event.pointerType && event.pointerType !== 'mouse') return
    if (event.button !== undefined && event.button !== 0) return

    const target = event.target
    if (target instanceof Element) {
      if (target.closest('button, a, input, select, textarea, [role="button"]')) return
    }

    committeeDragMovedRef.current = false
    setCommitteeDragging(true)
    committeeDragStartXRef.current = event.clientX
    committeeDragStartScrollLeftRef.current = scroller.scrollLeft

    try {
      scroller.setPointerCapture?.(event.pointerId)
    } catch {
      // ignore
    }
  }

  const onCommitteePointerMove = (event) => {
    const scroller = committeeScrollRef.current
    if (!scroller) return
    if (!committeeDragging) return
    if (event.pointerType && event.pointerType !== 'mouse') return

    const deltaX = event.clientX - committeeDragStartXRef.current
    if (Math.abs(deltaX) > 5) committeeDragMovedRef.current = true
    scroller.scrollLeft = committeeDragStartScrollLeftRef.current - deltaX
  }

  const endCommitteeDrag = (event) => {
    const scroller = committeeScrollRef.current
    if (scroller) {
      try {
        scroller.releasePointerCapture?.(event.pointerId)
      } catch {
        // ignore
      }
    }
    setCommitteeDragging(false)
  }

  return (
    <div ref={pageRef} className="min-h-screen text-white overflow-x-hidden" style={{ background: '#080808' }}>
      {/* ── NAVBAR ── */}
      <NavBar navigate={navigate} />

      {/* ── HERO ── */}
      <section id="home" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #000000 0%, #0d0d0d 50%, #1a0505 100%)' }}
          />
          {/* Subtle grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          {/* Glowing orbs */}
          <div
            className="absolute -top-40 -right-40 rounded-full"
            style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(185,28,28,0.18) 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-1/2 -left-64 rounded-full"
            style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(153,27,27,0.16) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-40 right-1/3 rounded-full"
            style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(220,38,38,0.1) 0%, transparent 70%)' }}
          />
        </div>

        {/* Hero content */}
        <div
          data-reveal
          className="reveal-on-scroll relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full"
        >
          {/* Left — text */}
          <div className="space-y-6 lg:space-y-7">
            <div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] font-heading tracking-tight">
                KUSGAN
              </h1>
              <p className="text-xl sm:text-2xl lg:text-3xl font-semibold mt-2 leading-snug font-heading" style={{ color: '#f87171' }}>
                Volunteerism for<br className="hidden sm:block" /> Inclusive Communities
              </p>
            </div>

            <p className="text-base sm:text-lg text-gray-400 max-w-lg leading-relaxed">
              Serbisyong KUSGAN
            </p>            {/* Stat chips */}
            <div className="flex flex-wrap gap-2.5">
              {stats.map(stat => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl border"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <Icon size={13} className="text-red-400 shrink-0" />
                    <span className="text-white font-bold text-sm font-heading">{stat.value}</span>
                    <span className="text-gray-500 text-xs">{stat.label}</span>
                  </div>
                )
              })}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold hover:-translate-y-0.5 transition-all duration-200"
                style={{ boxShadow: '0 8px 24px rgba(185,28,28,0.45)' }}
              >
                <LogIn size={17} />
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate('/recruitment')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold hover:-translate-y-0.5 transition-all duration-200 border"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Handshake size={17} />
                Join KUSGAN
                <ArrowRight size={14} style={{ color: '#9ca3af' }} />
              </button>
            </div>
          </div>

          {/* Right — logo visual with floating stat cards */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-xs sm:max-w-sm">
              {/* Main logo card */}
              <div
                className="hero-float relative rounded-3xl overflow-hidden"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow:
                    '0 40px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.12)',
                  padding: '28px 28px 20px',
                }}
              >
                <img
                  src={HERO_IMAGE}
                  alt="KUSGAN Volunteer Inc. logo"
                  className="w-full h-60 sm:h-72 object-contain"
                />
                {/* Bottom label */}
                <div
                  className="text-center mt-3 pb-1 pt-3"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
                >
                  <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#6b7280' }}>KUSGAN Volunteer Inc.</p>
                </div>
              </div>

              {/* Floating card — top-left */}
           

              {/* Floating card — top-right */}
              

              {/* Floating card — bottom-left */}
              

              {/* Red glow behind card */}
              <div
                className="absolute -z-10 rounded-3xl"
                style={{
                  inset: 0,
                  background: 'radial-gradient(circle, rgba(185,28,28,0.3) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                  transform: 'translateY(24px) scale(0.85)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2"
          style={{ color: '#374151' }}
        >
          <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, #374151, transparent)' }} />
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div
        data-reveal
        className="reveal-on-scroll relative overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, rgba(127,29,29,0.25) 0%, rgba(185,28,28,0.18) 50%, rgba(127,29,29,0.25) 100%)',
          borderTop: '1px solid rgba(185,28,28,0.2)',
          borderBottom: '1px solid rgba(185,28,28,0.2)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <p className="text-center text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-4">Partnered by</p>
          <div className="space-y-3">
            <div className="sponsor-marquee">
                                          <div
                className="sponsor-marquee-track sponsor-marquee-track--ltr"
                style={{ '--sponsor-marquee-duration': '70s', '--sponsor-marquee-shift': SPONSOR_MARQUEE_SHIFT }}
              >
                {SPONSOR_LOGOS_LOOP.map((filename, index) => (
                  <div
                    key={`${filename}-${index}`}
                    data-sponsor-logo
                    className="sponsor-marquee-item h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-full bg-white p-1 shadow-lg overflow-hidden"
                    title={filename.replace(/\.(png|jpe?g|webp)$/i, '')}
                  >
                    <img
                      src={`/${encodeURIComponent(filename)}`}
                      alt={filename.replace(/\.(png|jpe?g|webp)$/i, '').replace(/[-_]/g, ' ')}
                      className="h-full w-full object-contain"
                      loading="lazy"
                      onError={e => {
                        const wrapper = e.currentTarget.closest('[data-sponsor-logo]')
                        if (wrapper) wrapper.style.display = 'none'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            
          </div>
        </div>
      </div>

      {/* ── SERVICES ── */}
      <section id="services" data-reveal className="reveal-on-scroll relative pt-20 pb-28 sm:pt-24 sm:pb-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Our Services"
            subtitle="Focused volunteer initiatives making real community impact."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {SERVICES.map(service => {
              const Icon = service.icon
              return (
                <article
                  key={service.key}
                  className="group relative rounded-2xl overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1.5"
                  style={{
                    background: 'rgba(12,12,12,0.9)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: service.accent }} />

                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at 50% 0%, ${service.accent}18 0%, transparent 65%)`,
                    }}
                  />

                  {/* Icon */}
                  <div
                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-4`}
                    style={{ background: service.iconBg, color: service.iconColor }}
                  >
                    <Icon size={20} className={service.iconClass} />
                  </div>

                  <h3 className="font-bold text-white text-base mb-2 font-heading">{service.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{service.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── ORGANIZATIONAL STRUCTURE ── */}
      <section id="organizational-structure" data-reveal className="reveal-on-scroll relative py-20 sm:py-24">
        {/* Subtle bg differentiation */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(20,20,20,0.6) 50%, transparent 100%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Organization Structure"
            subtitle={activeStructure.subtitle}
          />

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3 mb-8">
            <div
              className="flex flex-col sm:inline-flex sm:flex-row w-full sm:w-auto rounded-2xl sm:rounded-full p-1 border gap-1"
              style={{
                background: 'rgba(12,12,12,0.7)',
                borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              }}
            >
              {ORGANIZATION_VIEWS.map(view => {
                const isActive = view.key === activeStructure.key
                return (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => setStructureKey(view.key)}
                    className="w-full sm:w-auto px-4 sm:px-5 py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 text-center leading-snug"
                    style={{
                      background: isActive ? 'rgba(220,38,38,0.2)' : 'transparent',
                      color: isActive ? '#fee2e2' : '#9ca3af',
                      border: isActive ? '1px solid rgba(248,113,113,0.4)' : '1px solid transparent',
                    }}
                  >
                    {view.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col items-center">
            {activeStructure.key === 'kusgan' ? (
              <div className="w-full max-w-none space-y-6">
                <div className="w-full flex items-center gap-3 mb-2">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(220,38,38,0.25))' }} />
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border shrink-0"
                    style={{ color: '#fca5a5', background: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.2)' }}
                  >
                    KUSGAN Volunteers
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(220,38,38,0.25))' }} />
                </div>

                <div
                  className="flex gap-6 overflow-x-auto pb-2 landing-scrollbar"
                  style={{
                    scrollbarGutter: 'stable',
                    cursor: committeeDragging ? 'grabbing' : 'grab',
                    userSelect: committeeDragging ? 'none' : 'auto',
                    touchAction: 'pan-y',
                    paddingInline: '16px',
                    scrollPaddingInline: '16px',
                  }}
                  ref={committeeScrollRef}
                  onPointerDown={onCommitteePointerDown}
                  onPointerMove={onCommitteePointerMove}
                  onPointerUp={endCommitteeDrag}
                  onPointerCancel={endCommitteeDrag}
                  onPointerLeave={committeeDragging ? endCommitteeDrag : undefined}
                  onClickCapture={(event) => {
                    if (committeeDragMovedRef.current) {
                      event.preventDefault()
                      event.stopPropagation()
                      committeeDragMovedRef.current = false
                    }
                  }}
                >
                  {committeeGroups.length === 0 ? (
                    <div
                      className="w-full rounded-2xl border border-white/10 bg-black/60 p-6 text-center text-sm text-gray-400"
                      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
                    >
                      No volunteer data available yet.
                    </div>
                  ) : (
                    committeeGroups.map(group => (
                      <div
                        key={group.committee}
                        className="shrink-0 text-center"
                        style={{ minWidth: '220px', maxWidth: '220px', width: '100%' }}
                      >
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <span
                            className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border shrink-0"
                            style={{
                              color: '#fca5a5',
                              background: 'rgba(220,38,38,0.1)',
                              borderColor: 'rgba(220,38,38,0.2)',
                            }}
                          >
                            {group.committee}
                          </span>
                        </div>
                        {group.members.length === 0 ? (
                          <p className="text-xs text-gray-400">No members assigned yet.</p>
                        ) : (
                          <div className="flex flex-col gap-2 items-center">
                            {group.members.map(person => (
                              <button
                                key={person.name}
                                type="button"
                                onClick={() => openPerson(person)}
                                className="w-full rounded-lg px-2.5 py-2 text-center text-[11px] sm:text-xs font-semibold text-white border transition hover:border-red-500/40 hover:bg-red-600/10"
                                style={{
                                  background: 'rgba(12,12,12,0.85)',
                                  borderColor: 'rgba(255,255,255,0.12)',
                                  boxShadow: '0 6px 14px rgba(0,0,0,0.3)',
                                }}
                              >
                                {person.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Board Chairperson */}
                <div className="w-full max-w-[180px]">
                  <OrgPersonCard person={BOARD_STRUCTURE.chairperson} size="board" />
                </div>

                {/* Connector */}
                <div className="w-px h-8 my-1" style={{ background: 'linear-gradient(to bottom, rgba(220,38,38,0.55), rgba(220,38,38,0.15))' }} />

                {/* Vice Chairperson */}
                <div className="w-full max-w-[180px]">
                  <OrgPersonCard person={BOARD_STRUCTURE.viceChairperson} size="board" />
                </div>

                {/* Connector to executive director */}
                <div className="w-px h-8 my-1" style={{ background: 'linear-gradient(to bottom, rgba(220,38,38,0.55), rgba(220,38,38,0.15))' }} />

                {/* Executive Director */}
                <div className="w-full max-w-[180px]">
                  <OrgPersonCard person={BOARD_STRUCTURE.executiveDirector} size="board" />
                </div>

                {/* Connector to members */}
                <div className="w-px h-8 my-1" style={{ background: 'linear-gradient(to bottom, rgba(220,38,38,0.55), rgba(220,38,38,0.15))' }} />

                {/* Board members label */}
                <div className="w-full flex items-center gap-3 mb-6 max-w-4xl">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(220,38,38,0.25))' }} />
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border shrink-0"
                    style={{ color: '#fca5a5', background: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.2)' }}
                  >
                    Board Members
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(220,38,38,0.25))' }} />
                </div>

                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl place-items-center">
                  {BOARD_STRUCTURE.officers.slice(0, 4).map(officer => (
                    <OrgPersonCard key={officer.name} person={officer} size="board" />
                  ))}
                </div>

                <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mt-4 place-items-center">
                  {BOARD_STRUCTURE.officers.slice(4).map(officer => (
                    <OrgPersonCard key={officer.name} person={officer} size="board" />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" data-reveal className="reveal-on-scroll relative py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <SectionHeader
              title="Who We Are"
              centered
            />

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              <article
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{
                  background: 'rgba(12,12,12,0.9)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-600 rounded-t-2xl" />
                <div
                  className="absolute bottom-0 right-0 w-32 h-32 rounded-full -z-0"
                  style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.06) 0%, transparent 70%)' }}
                />
                <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#f87171' }}>Mission</p>
                <h3 className="text-lg font-bold text-white font-heading mb-2">Our Purpose</h3>
                <p className="text-sm text-gray-400 leading-relaxed relative">
                  to be catalyst of community involvement though volunteerism and creating social inclusion for a better world to live in

                </p>
              </article>

              <article
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{
                  background: 'rgba(12,12,12,0.9)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                  style={{ background: 'linear-gradient(90deg, #dc2626, #f87171)' }}
                />
                <div
                  className="absolute bottom-0 left-0 w-32 h-32 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.06) 0%, transparent 70%)' }}
                />
                <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#f87171' }}>Vision</p>
                <h3 className="text-lg font-bold text-white font-heading mb-2">Our Future</h3>
                <p className="text-sm text-gray-400 leading-relaxed relative">
                  To inspire everyone through volunteerism.
                </p>
              </article>
            </div>            {/* Core Values - image grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CORE_VALUES.map(value => (
                <article
                  key={value.title}
                  className="group relative rounded-2xl overflow-hidden cursor-default"
                  style={{ height: '200px' }}
                >
                  <img
                    src={value.image}
                    alt={value.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0 transition-all duration-400"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)',
                    }}
                  />
                  {/* Center letter */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span
                      aria-hidden="true"
                      className="font-heading text-6xl sm:text-7xl font-black tracking-[0.2em] text-white drop-shadow-[0_10px_26px_rgba(0,0,0,0.65)]"
                      style={{ textShadow: '0 0 18px rgba(255,255,255,0.55)' }}
                    >
                      {value.letter || String(value.title || '').trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <h4 className="text-lg font-bold text-white font-heading leading-tight">{value.title}</h4>
                    <p className="text-xs sm:text-sm mt-1 leading-snug" style={{ color: '#9ca3af' }}>
                      {value.description}
                    </p>
                  </div>
                  {/* Red dot accent */}
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 opacity-80" />
                </article>
              ))}
            </div>

            {/* History */}
            <div className="mt-12 sm:mt-16">
              <SectionHeader title="History" centered />
              <div
                className="rounded-3xl p-6 sm:p-8 lg:p-10"
                style={{
                  background: 'rgba(8,8,8,0.92)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                }}
              >
                <div className="space-y-4 text-sm sm:text-base leading-relaxed text-gray-300">
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
                  <p>
                    The primary advocacy of Kusgan Volunteers Inc. is to provide the first meal during calamity and its
                    mission is to promote volunteerism and serve the community voluntarily. The organization conducts
                    environmental activities, outreach programs, medical missions, feeding programs, serbisyong kusgan,
                    and operation tuli.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
                  <div>
                    <strong className="block text-white font-heading">Jerson Ebal</strong>
                    <span className="text-gray-400">President/Executive Director</span>
                  </div>
                  <div>
                    <strong className="block text-white font-heading">Noel "Doy Danlag" Raboy</strong>
                    <span className="text-gray-400">Chairman</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section data-reveal className="reveal-on-scroll relative overflow-hidden py-20 sm:py-28">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #4a0000 0%, #7f1d1d 35%, #3d0000 100%)' }}
        />
        {/* Diamond pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 20L20 40L0 20Z' fill='%23ffffff'/%3E%3C/svg%3E\")",
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="absolute -top-32 -right-32 rounded-full"
          style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 rounded-full"
          style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, transparent 70%)' }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-heading leading-tight mb-4">
            Ready to Make a<br />
            <span style={{ color: '#fca5a5' }}>Difference?</span>
          </h2>
          <p className="text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed" style={{ color: 'rgba(252,165,165,0.75)' }}>
            Join KUSGAN and become part of a growing community dedicated to meaningful action and lasting impact.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/recruitment')}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-white text-red-700 font-bold hover:-translate-y-0.5 transition-all duration-200 hover:bg-gray-50"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}
            >
              <Handshake size={18} />
              Join Us Today
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-white font-semibold hover:-translate-y-0.5 transition-all duration-200 border"
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.25)',
              }}
            >
              <LogIn size={18} />
              Member Login
            </button>
          </div>
        </div>
      </section>

      {selectedPerson ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-6 text-center">
            <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-white">
              <img
                src={selectedPerson.image || HERO_IMAGE}
                alt={selectedPerson.name}
                className="h-full w-full object-cover"
                onError={(event) => {
                  if (event.currentTarget.src !== HERO_IMAGE) event.currentTarget.src = HERO_IMAGE
                }}
              />
            </div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-red-300">Profile</p>
            <h3 className="mt-2 text-xl font-bold text-white font-heading">{selectedPerson.name}</h3>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-left">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-white/60">ID number</span>
                  <span className="text-white tabular-nums">{selectedPerson.idNumber || '-'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-white/60">Contact</span>
                  <span className="text-white tabular-nums">{selectedPerson.contactNumber || '—'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-white/60">Blood type</span>
                  <span className="text-white">{selectedPerson.bloodType || '—'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-white/60">Joined</span>
                  <span className="text-white">{selectedPerson.memberSince || '—'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-white/60">Committee</span>
                  <span className="text-white">{selectedPerson.committee || '—'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-white/60">Status</span>
                  <span className="text-white">{selectedPerson.status || '—'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPerson(null)}
              className="mt-5 w-full rounded-xl border border-white/15 bg-white/5 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {/* � FOOTER � */}
      <footer
        className="relative py-12 sm:py-14"
        style={{
          background: '#050505',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10 pb-10"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-white p-1.5 shadow-lg">
                  <img src={HERO_IMAGE} alt="KUSGAN logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="font-bold text-white font-heading tracking-widest text-sm">KUSGAN</p>
                  <p className="text-[9px] text-red-400 tracking-[0.2em] uppercase">Volunteer Inc.</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs">
                Mobilizing communities through compassion, service, and unity for a better tomorrow.
              </p>
            </div>

            {/* Contact */}
            <div className="flex flex-col items-start text-left">
              <h4 className="text-xs font-bold text-gray-400 font-heading mb-3 tracking-widest uppercase">
                CONTACT
              </h4>
              <div className="space-y-5 text-sm text-gray-400 max-w-sm">
                <p className="leading-relaxed flex flex-wrap items-baseline justify-start gap-x-2">
                  <span className="text-gray-500 shrink-0">Address:</span>
                  <span className="min-w-0">Zone 5 Bulua, Cagayan de Oro City</span>
                </p>
                <p className="leading-relaxed flex flex-wrap items-baseline justify-start gap-x-2">
                  <span className="text-gray-500 shrink-0">Contact number:</span>
                  <a href="tel:09676651777" className="hover:text-gray-300 transition-colors tabular-nums">
                    09676651777
                  </a>
                </p>
                <p className="leading-relaxed flex flex-wrap items-baseline justify-start gap-x-2">
                  <span className="text-gray-500 shrink-0">Facebook:</span>
                  <a
                    href="https://www.facebook.com/KusganVolunteersINC"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-gray-300 transition-colors break-all min-w-0"
                  >
                    https://www.facebook.com/KusganVolunteersINC
                  </a>
                </p>
                <p className="leading-relaxed flex flex-wrap items-baseline justify-start gap-x-2">
                  <span className="text-gray-500 shrink-0">Email:</span>
                  <a
                    href="mailto:kusganvolunteersinc@gmail.com"
                    className="hover:text-gray-300 transition-colors break-all min-w-0"
                  >
                    kusganvolunteersinc@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Copyright */}
            <p className="text-xs" style={{ color: '#374151' }}>
              © {new Date().getFullYear()} Developed By : Niel Caspillo, Prince Laurence Montaño, and Dun Kenneth Salon
            </p>
    
        </div>
      </footer>
    </div>
  )
}

export default Landing















































