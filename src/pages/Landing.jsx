import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
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
  ChevronDown,
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
  { label: 'Programs', href: '#services' },
  { label: 'Contact Us', href: '#contact' },
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
    description:
      'Focuses on protecting and sustaining nature through activities like tree planting and clean-up drives. In KUSGAN Volunteers Inc., this shows their commitment to creating greener, more sustainable communities through active volunteer involvement.',
    icon: Leaf,
    iconClass: 'icon-theme-environmental',
    accent: '#22c55e',
    iconBg: 'rgba(34,197,94,0.12)',
    iconColor: '#4ade80',
  },
  {
    key: 'relief',
    title: 'Relief Operation',
    description:
      'Involves quick and organized response during disasters, providing essential aid to affected communities. In KUSGAN Volunteers Inc., it reflects their ability to mobilize rapidly and support recovery efforts during emergencies.',
    icon: Activity,
    iconClass: 'icon-theme-relief',
    accent: '#3b82f6',
    iconBg: 'rgba(59,130,246,0.12)',
    iconColor: '#60a5fa',
  },
  {
    key: 'fire',
    title: 'Fire Response',
    description:
      'Covers coordinated assistance during fire incidents to ensure safety and reduce damage. In KUSGAN Volunteers Inc., it highlights their role in supporting fire emergencies and promoting community preparedness.',
    icon: Flame,
    iconClass: 'icon-theme-fire',
    accent: '#f97316',
    iconBg: 'rgba(249,115,22,0.12)',
    iconColor: '#fb923c',
  },
  {
    key: 'medical',
    title: 'Medical',
    description:
      'Aims to improve health through medical missions, first aid, and outreach programs. In KUSGAN Volunteers Inc., it represents their dedication to providing accessible care and supporting community well-being.',
    icon: HeartPulse,
    iconClass: 'icon-theme-medical',
    accent: '#ef4444',
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: '#f87171',
  },
]

const PROGRAM_SLIDES = {
  environmental: [
    '/Programs/environmental.jpg',
    '/Programs/environmental01.jpg',
    '/Programs/environmental02.jpg',
    '/Programs/environmental03.jpeg',
    '/Programs/environmental04.jpeg',
  ],
  relief: [
    '/Programs/relief_operation.jpg',
    '/Programs/relief_operation01.jpg',
    '/Programs/relief_operation02.jpg',
    '/Programs/relief_operation03.jpg',
    '/Programs/relief_operation04.jpg',
  ],
  fire: [
    '/Programs/fire_response.jpg',
    '/Programs/fire_response01.jpg',
    '/Programs/fire_response02.jpg',
    '/Programs/fire_response03.jpg',
    '/Programs/fire_response04.jpg',
  ],
  medical: [
    '/Programs/medical.png',
    '/Programs/medical01.JPG',
    '/Programs/medical02.JPG',
    '/Programs/medical03.png',
    '/Programs/medical04.png',
  ],
}

const CORE_VALUES = [
  {
    title: 'Kindness',
    description: 'Everyone with compassion and Care',
    image: '/Kindness.jpg',
  },
  {
    title: 'Unity',
    description: 'Working together as a team work for a common goal.',
    image: '/Unity.jpg',
  },
  {
    title: 'Service',
    description: 'Helping other and giving back to the community.',
    image: '/Service.jpg',
  },
  {
    title: 'Generosity',
    description: 'Giving time, resources, and effort selflessly..',
    image: '/Generosity.jpg',
  },
  {
    title: 'Aspiration',
    description: 'Striving to achieve our best and reach our goal.',
    image: '/Aspiration.jpg',
  },
  {
    title: 'Nurture',
    description: 'Nurture providing care and support to other thrive.',
    image: '/Nurture.jpg',
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
  const [managementOpen, setManagementOpen] = useState(false)
  const [whoWeAreOpen, setWhoWeAreOpen] = useState(false)
  const managementMenuRef = useRef(null)
  const whoWeAreMenuRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onPointerDown = event => {
      if (!managementMenuRef.current?.contains(event.target)) {
        setManagementOpen(false)
      }
      if (!whoWeAreMenuRef.current?.contains(event.target)) {
        setWhoWeAreOpen(false)
      }
    }

    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
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
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
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
        <nav className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-bold text-white-400 hover:text-white transition-colors duration-200 relative group"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-yellow-400 group-hover:w-full transition-all duration-300 rounded-full" />
            </a>
          ))}

          <div
            className="relative flex items-center"
            ref={managementMenuRef}
            onMouseEnter={() => setManagementOpen(true)}
            onMouseLeave={() => setManagementOpen(false)}
          >
            <button
              type="button"
              onClick={() => setManagementOpen(true)}
              className={`group relative inline-flex items-center gap-1 text-sm font-bold transition-colors duration-200 ${
                managementOpen ? 'text-white' : 'text-white-400 hover:text-white'
              }`}
              aria-expanded={managementOpen}
              aria-haspopup="menu"
            >
              Management
              <ChevronDown size={15} className={`transition-transform duration-200 ${managementOpen ? 'rotate-180' : ''}`} />
              <span className={`absolute -bottom-0.5 left-0 h-px rounded-full bg-yellow-400 transition-all duration-300 ${managementOpen ? 'w-full' : 'w-0 group-hover:w-full'}`} />
            </button>

            {managementOpen && (
              <>
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-full z-40 h-4 w-72 -translate-x-1/2"
                />
              <div
                className="absolute left-1/2 top-full z-50 mt-4 w-72 -translate-x-1/2 rounded-2xl border p-2"
                role="menu"
                style={{
                  background: '#ffffff',
                  borderColor: 'rgba(226,232,240,0.95)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setManagementOpen(false)
                    navigate('/organization/board')
                  }}
                  className="flex w-full items-start rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
                  role="menuitem"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Board Members</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManagementOpen(false)
                    navigate('/organization/kusgan')
                  }}
                  className="flex w-full items-start rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
                  role="menuitem"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">KUSGAN Committee</p>
                  </div>
                </button>
              </div>
              </>
            )}
          </div>

          <div
            className="relative flex items-center"
            ref={whoWeAreMenuRef}
            onMouseEnter={() => setWhoWeAreOpen(true)}
            onMouseLeave={() => setWhoWeAreOpen(false)}
          >
            <button
              type="button"
              onClick={() => setWhoWeAreOpen(true)}
              className={`group relative inline-flex items-center gap-1 text-sm font-bold transition-colors duration-200 ${
                whoWeAreOpen ? 'text-white' : 'text-white-400 hover:text-white'
              }`}
              aria-expanded={whoWeAreOpen}
              aria-haspopup="menu"
            >
              About Us
              <ChevronDown size={15} className={`transition-transform duration-200 ${whoWeAreOpen ? 'rotate-180' : ''}`} />
              <span className={`absolute -bottom-0.5 left-0 h-px rounded-full bg-yellow-400 transition-all duration-300 ${whoWeAreOpen ? 'w-full' : 'w-0 group-hover:w-full'}`} />
            </button>

            {whoWeAreOpen && (
              <>
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-full z-40 h-4 w-80 -translate-x-1/2"
                />
                <div
                  className="absolute left-1/2 top-full z-50 mt-4 w-80 -translate-x-1/2 rounded-2xl border p-2"
                  role="menu"
                  style={{
                    background: '#ffffff',
                    borderColor: 'rgba(226,232,240,0.95)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setWhoWeAreOpen(false)
                      navigate('/who-we-are/overview')
                    }}
                    className="flex w-full items-start rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
                    role="menuitem"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">What is Kusgan and History</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWhoWeAreOpen(false)
                      navigate('/who-we-are/mission-vision')
                    }}
                    className="flex w-full items-start rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
                    role="menuitem"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Mission and Vision</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="hidden md:inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-yellow-300"
            title="Login"
          >
            <LogIn size={16} />
            Login
          </button>

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
          <div className="px-3 pt-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-200/80">Management</p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  navigate('/organization/board')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <span className="h-1 w-1 rounded-full bg-yellow-400" />
                Board Organizational Structure
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  navigate('/organization/kusgan')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <span className="h-1 w-1 rounded-full bg-yellow-400" />
                KUSGAN Committee
              </button>
            </div>
          </div>
          <div className="px-3 pt-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-200/80">About Us</p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  navigate('/who-we-are/overview')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <span className="h-1 w-1 rounded-full bg-yellow-400" />
                What is Kusgan and History
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  navigate('/who-we-are/mission-vision')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <span className="h-1 w-1 rounded-full bg-yellow-400" />
                Mission and Vision
              </button>
            </div>
          </div>
          <div className="flex pt-4 mt-2 border-t border-white/8">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full text-sm py-2.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/8 transition-colors"
            >
              Login
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

const HoverSlideshow = forwardRef(function HoverSlideshow({ images, alt, className, intervalMs = 900, isActive = false }, ref) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [disabledImages, setDisabledImages] = useState([])

  const slides = useMemo(() => {
    const imageList = Array.isArray(images) ? images : []
    if (!disabledImages.length) return imageList
    return imageList.filter(src => !disabledImages.includes(src))
  }, [disabledImages, images])

  useEffect(() => {
    if (!isActive) return undefined
    if (slides.length < 2) return undefined

    const intervalId = window.setInterval(() => {
      setActiveIndex(prev => (prev + 1) % slides.length)
    }, intervalMs)

    return () => window.clearInterval(intervalId)
  }, [intervalMs, isActive, slides.length])

  useEffect(() => {
    if (!isActive) return undefined
    if (slides.length < 2) return undefined
    const nextIndex = (activeIndex + 1) % slides.length
    const preload = new Image()
    preload.src = slides[nextIndex]
    return undefined
  }, [activeIndex, isActive, slides])

  useImperativeHandle(ref, () => ({
    reset: () => setActiveIndex(0),
  }), [])

  const safeActiveIndex = slides.length ? activeIndex % slides.length : 0
  const displayIndex = isActive ? safeActiveIndex : 0
  const currentSrc = slides[displayIndex]
  if (!currentSrc) return null

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        setDisabledImages(prev => (prev.includes(currentSrc) ? prev : [...prev, currentSrc]))
        setActiveIndex(0)
      }}
    />
  )
})

function ProgramCard({ service, reverse }) {
  const Icon = service.icon
  const slides = PROGRAM_SLIDES[service.key] ?? []
  const [isHovering, setIsHovering] = useState(false)
  const slideshowRef = useRef(null)

  return (
    <article
      className="group relative overflow-hidden rounded-3xl border border-white/12 bg-white/5 backdrop-blur-xl transition-transform transition-shadow duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-white/20 hover:bg-white/7"
      style={{
        boxShadow: isHovering
          ? '0 30px 78px rgba(0,0,0,0.48), 0 0 0 1px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.16)'
          : '0 18px 42px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.12)',
      }}
      onMouseEnter={() => {
        setIsHovering(true)
        slideshowRef.current?.reset?.()
      }}
      onMouseLeave={() => {
        setIsHovering(false)
        slideshowRef.current?.reset?.()
      }}
    >
        <div className={`grid grid-cols-1 gap-0 lg:grid-cols-2 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: service.accent }} />
            <div
              className="absolute inset-0 pointer-events-none opacity-45 transition-opacity duration-300 group-hover:opacity-75"
              style={{ background: `radial-gradient(ellipse at 0% 0%, ${service.accent}22 0%, transparent 60%)` }}
            />

          <div className="relative flex items-start gap-4">
            <div
              className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: service.iconBg, color: service.iconColor }}
            >
              <Icon size={22} className={service.iconClass} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-bold text-white font-heading">{service.title}</h3>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-white/80 max-w-xl">
                {service.description}
              </p>
            </div>
          </div>
        </div>

        <div className="relative min-h-[220px] sm:min-h-[260px] lg:min-h-[260px]">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(4,18,33,0.25) 0%, rgba(4,18,33,0.05) 45%, rgba(4,18,33,0.0) 70%)',
            }}
          />
          {slides.length ? (
            <HoverSlideshow
              ref={slideshowRef}
              isActive={isHovering}
              images={slides}
              alt={`${service.title} program`}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : null}
        </div>
      </div>
    </article>
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

function LatestNewsImageGallery({ imageUrls }) {
  const urls = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : []

  if (urls.length === 0) return null

  const [heroUrl, ...restUrls] = urls

  return (
    <div className="mb-5">
      <div className="mx-auto w-full max-w-4xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-slate-100 sm:col-span-2">
            <div className="relative h-64 w-full sm:h-80 md:h-[420px]">
              <img
                src={heroUrl}
                alt=""
                loading="lazy"
                draggable={false}
                className="absolute inset-0 block h-full w-full rounded-2xl bg-white object-contain"
              />
            </div>
          </div>

          {restUrls.map((url, index) => (
            <div key={`${url}-${index}`} className="overflow-hidden rounded-2xl bg-slate-100">
              <div className="relative h-40 w-full sm:h-48 md:h-56">
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="absolute inset-0 block h-full w-full rounded-2xl object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [donationOpen, setDonationOpen] = useState(false)
  const [donationForm, setDonationForm] = useState({ name: '', email: '', referenceNo: '' })
  const [donationCopied, setDonationCopied] = useState(false)
  const [donationSubmitting, setDonationSubmitting] = useState(false)
  const [donationSubmitError, setDonationSubmitError] = useState('')
  const [publicCommittees, setPublicCommittees] = useState([])
  const [publicCommitteesLoaded, setPublicCommitteesLoaded] = useState(false)
  const [committeeDragging, setCommitteeDragging] = useState(false)
  const [latestNewsItems, setLatestNewsItems] = useState([])
  const [latestNewsLoading, setLatestNewsLoading] = useState(false)
  const [latestNewsPage, setLatestNewsPage] = useState(1)
  const [latestNewsTotalPages, setLatestNewsTotalPages] = useState(1)
  const [selectedNewsItem, setSelectedNewsItem] = useState(null)

  const LATEST_NEWS_PAGE_SIZE = 5

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

  const normalizeAchievementImagePaths = (value) => {
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

  const selectedNewsImages = useMemo(() => {
    if (!selectedNewsItem) return []
    const paths = normalizeAchievementImagePaths(selectedNewsItem?.image_paths)
    return paths.map(resolveAchievementImage).filter(Boolean)
  }, [selectedNewsItem])

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
      console.warn('Failed to load latest news.', err)
      setLatestNewsItems([])
      setLatestNewsTotalPages(1)
    } finally {
      setLatestNewsLoading(false)
    }
  }

  useEffect(() => {
    void loadLatestNews(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseEnabled])

  useEffect(() => {
    if (!selectedNewsItem) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedNewsItem(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [selectedNewsItem])

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

  const _openPerson = (person) => {
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
            const fallbackPeople =
              Array.isArray(contextMemberPeopleRef.current) && contextMemberPeopleRef.current.length > 0
                ? contextMemberPeopleRef.current
                : normalizePeople(KUSGAN_VOLUNTEERS.map((name) => ({ name })))

            setKusganVolunteerPeople(fallbackPeople)
            landingMembersLoadedRef.current = true
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
              const fallbackPeople =
                Array.isArray(contextMemberPeopleRef.current) && contextMemberPeopleRef.current.length > 0
                  ? contextMemberPeopleRef.current
                  : normalizePeople(KUSGAN_VOLUNTEERS.map((name) => ({ name })))

              setKusganVolunteerPeople(fallbackPeople)
              landingMembersLoadedRef.current = true
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
          const fallbackPeople =
            Array.isArray(contextMemberPeopleRef.current) && contextMemberPeopleRef.current.length > 0
              ? contextMemberPeopleRef.current
              : normalizePeople(KUSGAN_VOLUNTEERS.map((name) => ({ name })))

          setKusganVolunteerPeople(fallbackPeople)
          landingMembersLoadedRef.current = true
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

  const _committeeGroups = useMemo(() => {
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

  const _overallOicPeople = useMemo(() => {
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

  const _onCommitteePointerDown = (event) => {
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

  const _onCommitteePointerMove = (event) => {
    const scroller = committeeScrollRef.current
    if (!scroller) return
    if (!committeeDragging) return
    if (event.pointerType && event.pointerType !== 'mouse') return

    const deltaX = event.clientX - committeeDragStartXRef.current
    if (Math.abs(deltaX) > 5) committeeDragMovedRef.current = true
    scroller.scrollLeft = committeeDragStartScrollLeftRef.current - deltaX
  }

  const _endCommitteeDrag = (event) => {
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

          </div>

          {/* Right — logo visual with floating stat cards */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-xs sm:max-w-sm bg-white rounded-3xl p-6">
              {/* Main logo card */}
              <img
                src={HERO_IMAGE}
                alt="KUSGAN Volunteer Inc. logo"
                className="w-full h-60 sm:h-72 object-contain"
              />

              {/* Floating card — top-left */}
           

              {/* Floating card — top-right */}
              

              {/* Floating card — bottom-left */}
              

              {/* Red glow behind card */}

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

      {/* ── STATS STRIP ── */}
      <section data-reveal className="reveal-on-scroll relative overflow-hidden py-20 sm:py-28">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${THEME.navyDeep} 0%, ${THEME.navy} 45%, ${THEME.navyMid} 100%)` }}
        />
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

      {/* ── SERVICES ── */}
      <section id="services" data-reveal className="reveal-on-scroll relative pt-20 pb-28 sm:pt-24 sm:pb-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Our Programs"
            subtitle="Focused volunteer initiatives making real community impact."
          />
          <div className="space-y-6 sm:space-y-7">
            {SERVICES.map((service, index) => (
              <ProgramCard key={service.key} service={service} reverse={index % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      {/* —— LATEST NEWS —— */}
            {/* -- LATEST NEWS -- */}
      <section data-reveal className="reveal-on-scroll relative pb-28 sm:pb-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Latest News" subtitle="Recent achievements and updates from KUSGAN Volunteers Inc." />

          {latestNewsLoading ? (
            <div className="rounded-3xl border border-white/12 bg-white/5 p-6 text-center text-sm text-white/70 backdrop-blur-xl">
              Loading latest news...
            </div>
          ) : latestNewsItems.length === 0 ? (
            <div className="rounded-3xl border border-white/12 bg-white/5 p-6 text-center text-sm text-white/70 backdrop-blur-xl">
              No news yet.
            </div>
          ) : (
            <>
              <div className="flex gap-4 overflow-x-auto pb-2 landing-scrollbar">
                {latestNewsItems.slice(0, LATEST_NEWS_PAGE_SIZE).map(item => {
                  const description = String(item?.description || '').trim()
                  const previewDescription = description.length > 120 ? `${description.slice(0, 120).trimEnd()}...` : description
                  const occurredAt = item?.occurred_at ? new Date(item.occurred_at) : null
                  const dateLabel =
                    occurredAt && !Number.isNaN(occurredAt.getTime())
                      ? occurredAt.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : ''
                  const images = normalizeAchievementImagePaths(item?.image_paths)
                  const imageUrl = images[0] ? resolveAchievementImage(images[0]) : ''

                  return (
                    <article
                      key={item.id}
                      className="group flex shrink-0 w-[260px] sm:w-[280px] flex-col rounded-3xl border border-slate-200 bg-white text-left transition-transform hover:-translate-y-0.5"
                    >
                      <div className="h-36 w-full overflow-hidden rounded-t-3xl border-b border-slate-200 bg-slate-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">No image</div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <p className="text-sm font-bold text-slate-900 line-clamp-2">
                          {String(item?.title || '').trim() || 'Untitled'}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {dateLabel}
                          {item?.location ? ` • ${String(item.location).trim()}` : ''}
                        </p>
                        {description ? (
                          <>
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                              <p className="min-h-[3rem] text-xs leading-6 text-slate-700">
                                {previewDescription}
                              </p>
                            </div>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="mt-auto inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-none transition-colors hover:bg-slate-50"
                          onClick={() => setSelectedNewsItem(item)}
                        >
                          Read More
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadLatestNews(Math.max(1, latestNewsPage - 1))}
                  disabled={latestNewsPage <= 1}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold text-white/70">
                  Page {latestNewsPage} of {latestNewsTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => void loadLatestNews(Math.min(latestNewsTotalPages, latestNewsPage + 1))}
                  disabled={latestNewsPage >= latestNewsTotalPages}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </section>
      <section id="organizational-structure" data-reveal aria-hidden="true" className="hidden">
        {/* Subtle bg differentiation */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(20,20,20,0.6) 50%, transparent 100%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Management"
            subtitle="Choose which organization structure you want to open."
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <article
              className="rounded-3xl border p-6 sm:p-8"
              style={{
                background: 'rgba(12,12,12,0.7)',
                borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-yellow-100">
                Board
              </div>
              <h3 className="mb-3 text-2xl font-bold text-white">Board Members</h3>
              <button
                type="button"
                onClick={() => navigate('/organization/board')}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
              >
                Open Board Structure
                <ArrowRight size={16} />
              </button>
            </article>

            <article
              className="rounded-3xl border p-6 sm:p-8"
              style={{
                background: 'rgba(12,12,12,0.7)',
                borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-yellow-100">
                Committee
              </div>
              <h3 className="mb-3 text-2xl font-bold text-white">KUSGAN Committee</h3>
              <button
                type="button"
                onClick={() => navigate('/organization/kusgan')}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
              >
                Open KUSGAN Committee
                <ArrowRight size={16} />
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" data-reveal aria-hidden="true" className="hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <SectionHeader
              title="About Us"
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
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <h4 className="text-lg font-bold text-white font-heading leading-tight">{value.title}</h4>
                    <p className="text-xs sm:text-sm mt-1 leading-snug" style={{ color: '#9ca3af' }}>
                      {value.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
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

      {selectedNewsItem ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Latest news details"
          onClick={() => setSelectedNewsItem(null)}
        >
          <div
            className="w-screen max-w-none overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-slate-900 sm:w-[calc(100vw-2rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative border-b border-slate-200 p-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-700">Latest News</p>
                <h3 className="mt-2 text-xl font-bold text-slate-900 font-heading">
                  {String(selectedNewsItem?.title || '').trim() || 'Untitled'}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {selectedNewsItem?.occurred_at
                    ? new Date(selectedNewsItem.occurred_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : ''}
                  {selectedNewsItem?.location ? ` - ${String(selectedNewsItem.location).trim()}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNewsItem(null)}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                aria-label="Close"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <LatestNewsImageGallery imageUrls={selectedNewsImages} />

              {selectedNewsItem?.description ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                    {String(selectedNewsItem.description)}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No description.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* FOOTER */}
      <footer
        id="contact"
        className="relative py-12 sm:py-14"
        style={{
          background: '#f3f4f6',
          borderTop: '1px solid rgba(15,23,42,0.12)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="grid grid-cols-1 gap-10 mb-10 pb-10 md:grid-cols-4"
            style={{ borderBottom: '1px solid rgba(15,23,42,0.12)' }}
          >
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-white p-1.5 shadow-lg">
                  <img src={HERO_IMAGE} alt="KUSGAN logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 font-heading tracking-widest text-sm">KUSGAN</p>
                  <p className="text-[9px] text-amber-700 tracking-[0.2em] uppercase">Volunteer Inc.</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
                Mobilizing communities through compassion, service, and unity for a better tomorrow.
              </p>
            </div>

            {/* Contact Us */}
            <div className="flex flex-col items-start text-left">
              <h4 className="text-xs font-bold text-slate-700 font-heading mb-3 tracking-widest uppercase">
                Contact Us
              </h4>
              <div className="space-y-4 text-sm text-slate-600 max-w-sm">
                <p className="leading-relaxed flex flex-wrap items-baseline justify-start gap-x-2">
                  <span className="text-slate-700 shrink-0">Contact number:</span>
                  <a href="tel:09676651777" className="hover:text-slate-900 transition-colors tabular-nums">
                    09676651777
                  </a>
                </p>
                <p className="leading-relaxed flex flex-wrap items-baseline justify-start gap-x-2">
                  <span className="text-slate-700 shrink-0">Email:</span>
                  <a
                    href="mailto:kusganvolunteersinc@gmail.com"
                    className="hover:text-slate-900 transition-colors break-all min-w-0"
                  >
                    kusganvolunteersinc@gmail.com
                  </a>
                </p>
              </div>
            </div>

            {/* Follow Us */}
            <div className="flex flex-col items-start text-left">
              <h4 className="text-xs font-bold text-slate-700 font-heading mb-3 tracking-widest uppercase">
                Follow Us
              </h4>
              <div className="text-sm text-slate-600 max-w-sm">
                <a
                  href="https://www.facebook.com/KusganVolunteers"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="KUSGAN Volunteers on Facebook"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M13.5 22v-8h2.7l.4-3H13.5V9.1c0-.9.2-1.5 1.5-1.5h1.6V5c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V11H6.7v3h2.7v8h4.1z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col items-start text-left">
              <h4 className="text-xs font-bold text-slate-700 font-heading mb-3 tracking-widest uppercase">
                Address
              </h4>
              <div className="space-y-4 text-sm text-slate-600 max-w-sm">
                <p className="leading-relaxed">
                  <span className="min-w-0">Zone 5 Bulua, Cagayan de Oro City</span>
                </p>
              </div>
            </div>
          </div>

          {/* Copyright */}
            <p className="text-xs" style={{ color: '#334155' }}>
              © {new Date().getFullYear()} Developed By : Niel Caspillo, Prince Laurence Montaño, and Dun Kenneth Salon
            </p>
    
        </div>
      </footer>
    </div>
  )
}

export default Landing




















































