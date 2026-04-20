import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KUSGAN_VOLUNTEERS } from '../data/kusganVolunteers'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled } from '../lib/supabaseEvents'
import { useAuth } from '../context/AuthContext'
import {
  LogIn,
  Handshake,
  HandHeart,
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
const DONATION_BANK_NAME = 'BDO Unibank, Inc.'
const DONATION_ACCOUNT_NAME = 'Kusgan Volunteers Inc.'
const DONATION_ACCOUNT_NUMBER = '003168018017'
const DONATION_NOTIFICATION_EMAIL = 'kusganvolunteersinc@gmail.com'

const THEME = {
  // Royal blue palette (keeps enough contrast for white text)
  navy: '#2b56d8', // royalblue
  navyDeep: '#1a42af', // deep royal
  navyMid: '#1b7ff2', // light royal tint
  yellow: '#FACC15',
  yellowText: '#FDE68A',
}

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
    label: 'KUSGAN Committee',
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
          ? 'rgba(4,18,33,0.9)'
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
            style={{ boxShadow: '0 0 0 2px rgba(250,204,21,0.32)' }}
          >
            <img src={HERO_IMAGE} alt="KUSGAN logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm leading-tight font-heading tracking-widest text-white">KUSGAN</p>
            <p className="text-[9px] text-yellow-300 tracking-[0.2em] uppercase">Volunteer Inc.</p>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-white-400 hover:text-white transition-colors duration-200 relative group"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-yellow-400 group-hover:w-full transition-all duration-300 rounded-full" />
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
            background: 'rgba(4,18,33,0.96)',
            backdropFilter: 'blur(24px)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 text-sm text-white-300 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-xl transition-colors"
            >
              <span className="w-1 h-1 rounded-full bg-yellow-400" />
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
              className="flex-1 text-sm py-2.5 rounded-xl bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-colors"
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
              background: 'rgba(250,204,21,0.12)',
              borderColor: 'rgba(250,204,21,0.28)',
              color: THEME.yellowText,
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
          <div className="w-8 h-0.5 bg-yellow-400 rounded-full shrink-0" />
          <p className="text-sm sm:text-base text-white-400 leading-relaxed">{subtitle}</p>
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
        className={`mx-auto rounded-2xl overflow-hidden ${sizeClass} ${size === 'board' ? '' : 'aspect-[3/4]'} bg-white-900`}
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
            background: 'rgba(250,204,21,0.14)',
            borderColor: 'rgba(250,204,21,0.32)',
            color: THEME.yellowText,
          }}
        >
          {Icon ? <Icon size={10} /> : null}
          {position}
        </span>
      ) : null}
      {person.committee ? (
        <p className="mt-1 text-[10px] uppercase tracking-widest" style={{ color: 'rgba(253,230,138,0.75)' }}>
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
  const heroFloatRef = useRef(null)
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
  const [donationOpen, setDonationOpen] = useState(false)
  const [donationForm, setDonationForm] = useState({ name: '', email: '', referenceNo: '' })
  const [donationCopied, setDonationCopied] = useState(false)
  const [donationSubmitting, setDonationSubmitting] = useState(false)
  const [donationSubmitError, setDonationSubmitError] = useState('')
  const [publicCommittees, setPublicCommittees] = useState([])
  const [publicCommitteesLoaded, setPublicCommitteesLoaded] = useState(false)
  const [committeeDragging, setCommitteeDragging] = useState(false)

  const openDonation = () => {
    setDonationOpen(true)
    setDonationCopied(false)
    setDonationSubmitError('')
    setDonationSubmitting(false)
  }

  const closeDonation = () => {
    setDonationOpen(false)
    setDonationCopied(false)
    setDonationSubmitError('')
    setDonationSubmitting(false)
    setDonationForm({ name: '', email: '', referenceNo: '' })
  }

  const copyDonationBankNumber = async () => {
    try {
      if (!DONATION_ACCOUNT_NUMBER) return
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(DONATION_ACCOUNT_NUMBER)
        setDonationCopied(true)
        window.setTimeout(() => setDonationCopied(false), 1400)
      }
    } catch {
      // ignore
    }
  }

  const submitDonationForm = async (event) => {
    event.preventDefault()
    if (donationSubmitting) return
    setDonationSubmitError('')
    setDonationSubmitting(true)

    const donorName = String(donationForm?.name || '').trim()
    const donorEmail = String(donationForm?.email || '').trim()
    const referenceNo = String(donationForm?.referenceNo || '').trim()

    let savedOk = true
    if (supabaseEnabled) {
      try {
        const { error } = await supabase.from('donations').insert({
          donor_name: donorName || null,
          donor_email: donorEmail || null,
          reference_no: referenceNo || null,
        })
        if (error) {
          setDonationSubmitError(error.message || 'Unable to save donation record.')
          savedOk = false
        }
      } catch (error) {
        setDonationSubmitError(error?.message ? String(error.message) : 'Unable to save donation record.')
        savedOk = false
      }
    }

    if (!savedOk) {
      setDonationSubmitting(false)
      return
    }

    const subject = `Donation Reference${referenceNo ? `: ${referenceNo}` : ''}`
    const lines = [
      'Donation Notification',
      '',
      `Name: ${donorName || '-'}`,
      `Email: ${donorEmail || '-'}`,
      `Reference No.: ${referenceNo || '-'}`,
      '',
      `Bank: ${DONATION_BANK_NAME || '-'}`,
      `Account Name: ${DONATION_ACCOUNT_NAME || '-'}`,
      `Account Number: ${DONATION_ACCOUNT_NUMBER || '-'}`,
      `Submitted: ${new Date().toLocaleString()}`,
    ]

    window.location.href = `mailto:${DONATION_NOTIFICATION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
    closeDonation()
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
    const resolvedRole = matched?.role || person?.role || 'member'
    const resolvedCommitteeRole = matched?.committeeRole || matched?.committee_role || person?.committeeRole || person?.committee_role || 'Member'
    setSelectedPerson({
      name: person.name,
      image: resolvedImage,
      idNumber: coerceString(matched?.idNumber || matched?.id_number || person.idNumber),
      contactNumber: coerceString(matched?.contactNumber || person.contactNumber),
      bloodType: coerceString(matched?.bloodType || person.bloodType),
      role: resolvedRole,
      committeeRole: resolvedCommitteeRole,
      committee: (resolvedRole === 'admin' || resolvedCommitteeRole === 'OIC') ? '' : coerceString(matched?.committee || person.committee),
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
    const element = heroFloatRef.current
    if (!element) return

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (prefersReducedMotion) return

    let lastScrollY = window.scrollY
    let lastTime = performance.now()
    let rafId = 0
    let stopTimerId = 0

    element.style.willChange = 'transform'
    element.style.transition = 'transform 220ms ease'

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

    const update = () => {
      rafId = 0
      const nowY = window.scrollY
      const nowTime = performance.now()
      const dy = nowY - lastScrollY
      const dt = Math.max(16, nowTime - lastTime)

      const velocity = dy / dt // px per ms
      const offset = clamp(-velocity * 140, -10, 10)

      element.style.transform = `translateY(${offset.toFixed(2)}px)`
      lastScrollY = nowY
      lastTime = nowTime
    }

    const reset = () => {
      element.style.transform = 'translateY(0px)'
    }

    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(update)
      window.clearTimeout(stopTimerId)
      stopTimerId = window.setTimeout(reset, 140)
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(stopTimerId)
      if (rafId) window.cancelAnimationFrame(rafId)
      reset()
    }
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
              committeeRole: String(row?.committee_role || row?.committeeRole || '').trim(),
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
        if (!grouped.has(key)) grouped.set(key, { committee, oic: [], members: [] })
        const roleRaw = String(person?.committeeRole || person?.committee_role || '').trim()
        const isOic = roleRaw.toLowerCase() === 'oic'
        if (isOic) grouped.get(key).oic.push(person)
        else grouped.get(key).members.push(person)
      })

      const groups = [...grouped.values()].map(group => ({
        ...group,
        oic: [...group.oic].sort((a, b) => a.name.localeCompare(b.name)),
        members: [...group.members].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      groups.sort((a, b) => a.committee.localeCompare(b.committee))

      return groups
    }

    const grouped = new Map(
      trimmedOptions.map(name => {
        const committee = String(name || '').trim()
        return [normalizeCommitteeKey(committee), { committee, oic: [], members: [] }]
      })
    )

    displayVolunteerPeople.forEach(person => {
      const committee = String(person?.committee || '').trim()
      if (!committee) return
      const key = normalizeCommitteeKey(committee)
      if (!grouped.has(key)) grouped.set(key, { committee, oic: [], members: [] })
      const roleRaw = String(person?.committeeRole || person?.committee_role || '').trim()
      const isOic = roleRaw.toLowerCase() === 'oic'
      if (isOic) grouped.get(key).oic.push(person)
      else grouped.get(key).members.push(person)
    })

    const groups = [...grouped.values()].map(group => ({
      ...group,
      oic: [...group.oic].sort((a, b) => a.name.localeCompare(b.name)),
      members: [...group.members].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    groups.sort((a, b) => a.committee.localeCompare(b.committee))

    return groups
  }, [committeeOptions, displayVolunteerPeople])

  const overallOicPeople = useMemo(() => {
    const oicPeople = []

    displayVolunteerPeople.forEach(person => {
      const roleRaw = String(person?.committeeRole || person?.committee_role || '').trim()
      if (roleRaw.toLowerCase() === 'oic') oicPeople.push(person)
    })

    oicPeople.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))

    const seen = new Set()
    return oicPeople.filter(person => {
      const name = String(person?.name || '').trim()
      if (!name) return false
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [displayVolunteerPeople])

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
    <div ref={pageRef} className="min-h-screen text-white overflow-x-hidden" style={{ background: THEME.navyDeep }}>
      {/* ── NAVBAR ── */}
      <NavBar navigate={navigate} />

      {/* ── HERO ── */}
      <section id="home" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${THEME.navyDeep} 0%, ${THEME.navy} 50%, ${THEME.navyMid} 100%)` }}
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
            style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(250,204,21,0.14) 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-1/2 -left-64 rounded-full"
            style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(250,204,21,0.12) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-40 right-1/3 rounded-full"
            style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(250,204,21,0.1) 0%, transparent 70%)' }}
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
              <p className="text-xl sm:text-2xl lg:text-3xl font-semibold mt-2 leading-snug font-heading" style={{ color: THEME.yellow }}>
                Volunteerism for<br className="hidden sm:block" /> Inclusive Communities
              </p>
            </div>

            <p className="text-base sm:text-lg text-white-400 max-w-lg leading-relaxed">
              Serbisyong Kusgan represents strength, unity, and genuine care for the community. It delivers dedicated service with unwavering commitment, reaching those who need support the most. A stronger, safer, and more compassionate community begins with consistent and selfless action.
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
                    <Icon size={13} className="text-yellow-300 shrink-0" />
                    <span className="text-white font-bold text-sm font-heading">{stat.value}</span>
                    <span className="text-white-500 text-xs">{stat.label}</span>
                  </div>
                )
              })}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold hover:-translate-y-0.5 transition-all duration-200"
                style={{ boxShadow: '0 8px 24px rgba(250,204,21,0.35)' }}
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
                ref={heroFloatRef}
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
                  <p
                    className="text-xs tracking-widest uppercase font-semibold"
                    style={{ color: 'rgba(107,114,128,0.75)' }}
                  >
                    KUSGAN Volunteer Inc.
                  </p>
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
                  background: 'radial-gradient(circle, rgba(250,204,21,0.22) 0%, transparent 70%)',
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
          background: 'linear-gradient(90deg, rgba(4,18,33,0.85) 0%, rgba(7,26,47,0.85) 50%, rgba(4,18,33,0.85) 100%)',
          borderTop: '1px solid rgba(250,204,21,0.18)',
          borderBottom: '1px solid rgba(250,204,21,0.18)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div
            className="relative overflow-hidden rounded-[28px] px-4 py-5 sm:px-6 sm:py-6"
            style={{
              background: 'transparent',
              boxShadow: 'none',
            }}
          >
            <div
              className="absolute -top-24 right-0 h-48 w-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
            />
            <p className="relative text-center text-[10px] tracking-[0.2em] uppercase text-white-500 mb-4 sm:mb-5">Partnered by</p>
            <div className="space-y-3 relative">
            <div className="sponsor-marquee">
                                          <div
                className="sponsor-marquee-track sponsor-marquee-track--ltr"
                style={{ '--sponsor-marquee-duration': '70s', '--sponsor-marquee-shift': SPONSOR_MARQUEE_SHIFT }}
              >
                {SPONSOR_LOGOS_LOOP.map((filename, index) => (
                  <div
                    key={`${filename}-${index}`}
                    data-sponsor-logo
                    className="sponsor-marquee-item h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-full p-1.5 overflow-hidden"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))',
                      border: '1px solid rgba(255,255,255,0.24)',
                      boxShadow: '0 16px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.32)',
                      backdropFilter: 'blur(18px)',
                    }}
                    title={filename.replace(/\.(png|jpe?g|webp)$/i, '')}
                  >
                    <img
                      src={`/${encodeURIComponent(filename)}`}
                      alt={filename.replace(/\.(png|jpe?g|webp)$/i, '').replace(/[-_]/g, ' ')}
                      className="h-full w-full object-contain rounded-full bg-white/90"
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
                    background: 'linear-gradient(150deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))',
                    border: '1px solid rgba(255,255,255,0.14)',
                    boxShadow: '0 18px 42px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(18px)',
                  }}
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: service.accent }} />
                  <div
                    className="absolute inset-x-0 top-0 h-20 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }}
                  />

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
                  <p className="text-sm text-white/76 leading-relaxed">{service.description}</p>
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
                      background: isActive ? 'rgba(250,204,21,0.16)' : 'transparent',
                      color: isActive ? THEME.yellowText : '#9ca3af',
                      border: isActive ? '1px solid rgba(250,204,21,0.4)' : '1px solid transparent',
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
                <div className="w-full flex flex-col items-center">
                  <div className="w-full flex items-center gap-3 mb-2">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(250,204,21,0.25))' }} />
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border shrink-0 inline-flex flex-col items-center leading-tight"
                      style={{ color: THEME.yellowText, background: 'rgba(250,204,21,0.12)', borderColor: 'rgba(250,204,21,0.28)' }}
                    >
                      <span className="tracking-widest uppercase">OIC</span>
                      <span className="text-[9px] font-semibold tracking-wide normal-case">(Community Development Officer)</span>
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(250,204,21,0.25))' }} />
                  </div>

                  {overallOicPeople.length > 0 ? (
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-center justify-center w-full">
                      {overallOicPeople.map(person => (
                        <button
                          key={`overall-oic-${person.name}`}
                          type="button"
                          onClick={() => openPerson(person)}
                          className="w-full sm:w-auto rounded-lg px-4 py-2 text-center text-[11px] sm:text-xs font-semibold text-white border transition hover:border-yellow-300/70 hover:bg-yellow-400/10"
                          style={{
                            background: 'rgba(12,12,12,0.85)',
                            borderColor: 'rgba(255,255,255,0.12)',
                            boxShadow: '0 10px 22px rgba(0,0,0,0.35)',
                            minWidth: '220px',
                          }}
                        >
                          {person.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="w-full max-w-md rounded-xl border px-4 py-3 text-center text-sm font-semibold text-white-300"
                      style={{ background: 'rgba(12,12,12,0.65)', borderColor: 'rgba(255,255,255,0.12)' }}
                    >
                      No OIC assigned
                    </div>
                  )}
                </div>

                <div className="w-full flex items-center gap-3 mb-2">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(250,204,21,0.25))' }} />
                  
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(250,204,21,0.25))' }} />
                </div>

                <div
                  className="flex flex-nowrap gap-6 overflow-x-auto pb-2 landing-scrollbar snap-x snap-mandatory"
                  style={{
                    scrollbarGutter: 'stable',
                    cursor: committeeDragging ? 'grabbing' : 'grab',
                    userSelect: committeeDragging ? 'none' : 'auto',
                    touchAction: 'pan-x',
                    WebkitOverflowScrolling: 'touch',
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
                      className="w-full rounded-2xl border border-white/10 bg-black/60 p-6 text-center text-sm text-white-400"
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
                              color: THEME.yellowText,
                              background: 'rgba(250,204,21,0.12)',
                              borderColor: 'rgba(250,204,21,0.28)',
                            }}
                          >
                            {group.committee}
                          </span>
                        </div>
                        {group.members.length === 0 ? (
                          <p className="text-xs text-white-400">No members assigned yet.</p>
                        ) : (
                          <div className="flex flex-col gap-2 items-center">
                            {group.members.map(person => (
                              <button
                                key={person.name}
                                type="button"
                                onClick={() => openPerson(person)}
                                className="w-full rounded-lg px-2.5 py-2 text-center text-[11px] sm:text-xs font-semibold text-white border transition hover:border-yellow-400/40 hover:bg-yellow-400/10"
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
                <div className="w-px h-8 my-1" style={{ background: 'linear-gradient(to bottom, rgba(250,204,21,0.55), rgba(250,204,21,0.15))' }} />

                {/* Vice Chairperson */}
                <div className="w-full max-w-[180px]">
                  <OrgPersonCard person={BOARD_STRUCTURE.viceChairperson} size="board" />
                </div>

                {/* Connector to executive director */}
                <div className="w-px h-8 my-1" style={{ background: 'linear-gradient(to bottom, rgba(250,204,21,0.55), rgba(250,204,21,0.15))' }} />

                {/* Executive Director */}
                <div className="w-full max-w-[180px]">
                  <OrgPersonCard person={BOARD_STRUCTURE.executiveDirector} size="board" />
                </div>

                {/* Connector to members */}
                <div className="w-px h-8 my-1" style={{ background: 'linear-gradient(to bottom, rgba(250,204,21,0.55), rgba(250,204,21,0.15))' }} />

                {/* Board members label */}
                <div className="w-full flex items-center gap-3 mb-6 max-w-4xl">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(250,204,21,0.25))' }} />
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border shrink-0"
                    style={{ color: THEME.yellowText, background: 'rgba(250,204,21,0.12)', borderColor: 'rgba(250,204,21,0.28)' }}
                  >
                    Board Members
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(250,204,21,0.25))' }} />
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

            {/* What is Kusgan & History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              <article
                className="rounded-3xl p-6 sm:p-8 lg:p-10 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(150deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(18px)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${THEME.yellow}, ${THEME.yellowText})` }} />
                <div
                  className="absolute inset-x-0 top-0 h-24"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }}
                />
                <h3 className="text-xl sm:text-2xl font-bold text-white font-heading mb-3">What is Kusgan?</h3>
                <div className="space-y-4 text-sm sm:text-base leading-relaxed text-white/82">
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
              </article>

              <article
                className="rounded-3xl p-6 sm:p-8 lg:p-10 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(150deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(18px)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${THEME.yellow}, ${THEME.yellowText})` }} />
                <div
                  className="absolute inset-x-0 top-0 h-24"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }}
                />
                <h3 className="text-xl sm:text-2xl font-bold text-white font-heading mb-3">History</h3>
                <div className="space-y-4 text-sm sm:text-base leading-relaxed text-white/82">
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
              </article>
            </div>

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              <article
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(150deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))',
                  border: '1px solid rgba(255,255,255,0.14)',
                  boxShadow: '0 18px 42px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(18px)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-t-2xl" />
                <div
                  className="absolute inset-x-0 top-0 h-16"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }}
                />
                <div
                  className="absolute bottom-0 right-0 w-32 h-32 rounded-full -z-0"
                  style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.07) 0%, transparent 70%)' }}
                />
                <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: THEME.yellow }}>Mission</p>
                <h3 className="text-lg font-bold text-white font-heading mb-2">Our Purpose</h3>
                <p className="text-sm text-white/80 leading-relaxed relative">
                  to be catalyst of community involvement though volunteerism and creating social inclusion for a better world to live in

                </p>
              </article>

              <article
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(150deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))',
                  border: '1px solid rgba(255,255,255,0.14)',
                  boxShadow: '0 18px 42px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(18px)',
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, ${THEME.yellow}, ${THEME.yellowText})` }}
                />
                <div
                  className="absolute inset-x-0 top-0 h-16"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }}
                />
                <div
                  className="absolute bottom-0 left-0 w-32 h-32 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.07) 0%, transparent 70%)' }}
                />
                <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: THEME.yellow }}>Vision</p>
                <h3 className="text-lg font-bold text-white font-heading mb-2">Our Future</h3>
                <p className="text-sm text-white/80 leading-relaxed relative">
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
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-yellow-400 opacity-80" />
                </article>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section data-reveal className="reveal-on-scroll relative overflow-hidden py-20 sm:py-28">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${THEME.navyDeep} 0%, ${THEME.navy} 45%, ${THEME.navyMid} 100%)` }}
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
            <span style={{ color: THEME.yellowText }}>Difference?</span>
          </h2>
          <p className="text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed" style={{ color: 'rgba(248, 240, 240, 0.88)' }}>
            Join KUSGAN and become part of a growing community dedicated to meaningful action and lasting impact.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/recruitment')}
              className="inline-flex w-full sm:w-56 h-12 items-center justify-center gap-2.5 px-8 rounded-xl bg-yellow-400 text-slate-900 font-bold hover:-translate-y-0.5 transition-all duration-200 hover:bg-yellow-300"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}
            >
              <Handshake size={18} />
              Join Us Today
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex w-full sm:w-56 h-12 items-center justify-center gap-2.5 px-8 rounded-xl text-white font-semibold hover:-translate-y-0.5 transition-all duration-200 border"
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.25)',
              }}
            >
              <LogIn size={18} />
              Member Login
            </button>
            <button
              type="button"
              onClick={openDonation}
              className="inline-flex w-full sm:w-56 h-12 items-center justify-center gap-2.5 px-8 rounded-xl text-white font-semibold hover:-translate-y-0.5 transition-all duration-200 border"
              style={{
                background: 'rgba(0,0,0,0.18)',
                borderColor: 'rgba(252,165,165,0.5)',
              }}
            >
              <HandHeart size={18} />
              Donate
            </button>
          </div>
        </div>
      </section>

      {donationOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          role="dialog"
          aria-modal="true"
          onClick={closeDonation}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/90 p-6 text-left"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-yellow-200">Donation</p>
                <h3 className="mt-2 text-xl font-bold text-white font-heading">Donate to KUSGAN</h3>
                <p className="mt-1 text-sm text-white/60">
                  Your contribution goes directly toward sustaining our operations, supporting volunteer activities, and expanding our reach to more communities. Even the smallest donation fuels real change.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDonation}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                aria-label="Close donation form"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold tracking-[0.14em] uppercase text-white/60">Bank Information</p>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1 text-sm text-white/90">
                  <p className="truncate">
                    <span className="text-white/60">Bank:</span> {DONATION_BANK_NAME}
                  </p>
                  <p className="truncate">
                    <span className="text-white/60">Account Name:</span> {DONATION_ACCOUNT_NAME}
                  </p>
                  <p className="font-mono text-white">
                    <span className="font-sans text-white/60">Account Number:</span> {DONATION_ACCOUNT_NUMBER}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyDonationBankNumber}
                  className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
                >
                  {donationCopied ? 'Copied' : 'Copy account no.'}
                </button>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={submitDonationForm}>
              {donationSubmitError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {donationSubmitError}
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="donor-name" className="text-xs font-semibold tracking-[0.14em] uppercase text-white/60">
                    Name (optional)
                  </label>
                  <input
                    id="donor-name"
                    type="text"
                    value={donationForm.name}
                    onChange={event => setDonationForm(prev => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-yellow-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="donor-email" className="text-xs font-semibold tracking-[0.14em] uppercase text-white/60">
                    Email (optional)
                  </label>
                  <input
                    id="donor-email"
                    type="email"
                    value={donationForm.email}
                    onChange={event => setDonationForm(prev => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-yellow-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                  <label htmlFor="donor-reference" className="text-xs font-semibold tracking-[0.14em] uppercase text-white/60">
                    Reference No.
                  </label>
                <input
                  id="donor-reference"
                  type="text"
                  value={donationForm.referenceNo}
                  onChange={event => setDonationForm(prev => ({ ...prev, referenceNo: event.target.value }))}
                  placeholder="Bank reference / transaction number"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-yellow-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={donationSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-yellow-300"
                >
                  {donationSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>

              <p className="text-[11px] leading-relaxed text-white/45">
                By donating, you’re not just giving money you’re becoming a partner in every good deed, every smile, and every life improved through this platform.
              </p>
            </form>
          </div>
        </div>
      )}

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
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-yellow-200">Profile</p>
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
                {selectedPerson.role !== 'admin' && selectedPerson.committeeRole !== 'OIC' ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-white/60">Committee</span>
                    <span className="text-white">{selectedPerson.committee || '—'}</span>
                  </div>
                ) : null}
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
          background: THEME.navyDeep,
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
                  <p className="text-[9px] text-yellow-300 tracking-[0.2em] uppercase">Volunteer Inc.</p>
                </div>
              </div>
              <p className="text-sm text-white-600 leading-relaxed max-w-xs">
                Mobilizing communities through compassion, service, and unity for a better tomorrow.
              </p>
            </div>

            {/* Contact */}
            <div className="flex flex-col items-start text-left">
              <h4 className="text-xs font-bold text-white-400 font-heading mb-3 tracking-widest uppercase">
                CONTACT
              </h4>
              <div className="space-y-5 text-sm text-white-400 max-w-sm">
                <p className="leading-relaxed flex flex-wrap items-baseline justify-start gap-x-2">
                  <span className="text-white-500 shrink-0">Address:</span>
                  <span className="min-w-0">Zone 5 Bulua, Cagayan de Oro City</span>
                </p>
                <p className="leading-relaxed flex flex-wrap items-baseline justify-start gap-x-2">
                  <span className="text-white-500 shrink-0">Contact number:</span>
                  <a href="tel:09676651777" className="hover:text-white-300 transition-colors tabular-nums">
                    09676651777
                  </a>
                </p>
                <p className="leading-relaxed flex flex-wrap items-baseline justify-start gap-x-2">
                  <span className="text-white-500 shrink-0">Facebook:</span>
                  <a
                    href="https://www.facebook.com/KusganVolunteersINC"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white-300 transition-colors break-all min-w-0"
                  >
                    https://www.facebook.com/KusganVolunteersINC
                  </a>
                </p>
                <p className="leading-relaxed flex flex-wrap items-baseline justify-start gap-x-2">
                  <span className="text-white-500 shrink-0">Email:</span>
                  <a
                    href="mailto:kusganvolunteersinc@gmail.com"
                    className="hover:text-white-300 transition-colors break-all min-w-0"
                  >
                    kusganvolunteersinc@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Copyright */}
            <p className="text-xs" style={{ color: '#ffffff' }}>
              © {new Date().getFullYear()} Developed By : Niel Caspillo, Prince Laurence Montaño, and Dun Kenneth Salon
            </p>
    
        </div>
      </footer>
    </div>
  )
}

export default Landing















































