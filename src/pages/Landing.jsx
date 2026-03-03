import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogIn,
  Handshake,
  Sparkles,
  Crown,
  ShieldCheck,
  Briefcase,
  Leaf,
  Activity,
  Flame,
  HeartPulse,
} from 'lucide-react'

const HERO_IMAGE = '/image-removebg-preview.png'

const SERVICES = [
  {
    key: 'environmental',
    title: 'Environmental',
    description: 'Tree planting, clean-up drives, and ecosystem care for greener communities.',
    icon: Leaf,
  },
  {
    key: 'relief',
    title: 'Relief Operation',
    description: 'Rapid volunteer coordination and emergency support during disasters.',
    icon: Activity,
  },
  {
    key: 'fire',
    title: 'Fire Response',
    description: 'Community fire incident assistance and coordinated response support.',
    icon: Flame,
  },
  {
    key: 'medical',
    title: 'Medical',
    description: 'Medical missions, first aid support, and health outreach programs.',
    icon: HeartPulse,
  },
]

const CORE_VALUES = [
  {
    title: 'Kindness',
    description: 'Serve every person with empathy and respect.',
    image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Unity',
    description: 'Collaborate as one team to achieve shared goals.',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Service',
    description: 'Deliver practical help where communities need it most.',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Generosity',
    description: 'Give time, care, and effort with sincere commitment.',
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Aspiration',
    description: 'Pursue continuous growth and meaningful impact.',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Nurture',
    description: 'Support people and communities with lasting care.',
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=900&q=80',
  },
]

const ORG_STRUCTURE = {
  president: {
    role: 'President',
    name: 'Juan Dela Cruz',
    image: 'https://i.pravatar.cc/520?img=12',
    icon: Crown,
  },
  vicePresident: {
    role: 'Vice President',
    name: 'Maria Santos',
    image: 'https://i.pravatar.cc/520?img=5',
    icon: ShieldCheck,
  },
  committees: [
    {
      name: 'Environmental Committee',
      head: { name: 'Carlo Reyes', role: 'Committee Head', image: 'https://i.pravatar.cc/420?img=32' },
      members: [
        { name: 'Ana Lopez', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=47' },
        { name: 'Mark Villanueva', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=54' },
        { name: 'James Cruz', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=60' },
      ],
    },
    {
      name: 'Relief Operation Committee',
      head: { name: 'Sophia Ramos', role: 'Committee Head', image: 'https://i.pravatar.cc/420?img=23' },
      members: [
        { name: 'Kevin Torres', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=14' },
        { name: 'Angelica Lim', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=44' },
        { name: 'Brian Flores', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=17' },
      ],
    },
    {
      name: 'Fire Response Committee',
      head: { name: 'Michael Tan', role: 'Committee Head', image: 'https://i.pravatar.cc/420?img=36' },
      members: [
        { name: 'David Garcia', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=26' },
        { name: 'Louie Mendoza', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=31' },
        { name: 'Patrick Sy', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=63' },
      ],
    },
    {
      name: 'Medical Committee',
      head: { name: 'Angela Rivera', role: 'Committee Head', image: 'https://i.pravatar.cc/420?img=45' },
      members: [
        { name: 'Paolo Dizon', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=12' },
        { name: 'Shane Ortega', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=58' },
        { name: 'Rico Medina', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=50' },
      ],
    },
    {
      name: 'Community Outreach Committee',
      head: { name: 'Loren Santos', role: 'Committee Head', image: 'https://i.pravatar.cc/420?img=9' },
      members: [
        { name: 'Mia Alvarez', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=41' },
        { name: 'Joel Navarro', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=53' },
        { name: 'Nina Delgado', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=62' },
      ],
    },
    {
      name: 'Logistics Committee',
      head: { name: 'Carmina Lopez', role: 'Committee Head', image: 'https://i.pravatar.cc/420?img=8' },
      members: [
        { name: 'Troy Mendoza', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=11' },
        { name: 'Ella Fernandez', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=49' },
        { name: 'Ronel Castro', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=21' },
      ],
    },
    {
      name: 'Youth Engagement Committee',
      head: { name: 'Denise Salazar', role: 'Committee Head', image: 'https://i.pravatar.cc/420?img=38' },
      members: [
        { name: 'Kyle Ramos', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=57' },
        { name: 'Faith Aquino', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=33' },
        { name: 'Ian Morales', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=25' },
      ],
    },
    {
      name: 'Education Support Committee',
      head: { name: 'Marvin De Leon', role: 'Committee Head', image: 'https://i.pravatar.cc/420?img=29' },
      members: [
        { name: 'Jessa Cruz', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=64' },
        { name: 'Paolo Reyes', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=40' },
        { name: 'Grace Uy', role: 'KUSGAN Member', image: 'https://i.pravatar.cc/360?img=52' },
      ],
    },
  ],
}

function OrgPersonCard({ person, large = false }) {
  const Icon = person.icon
  return (
    <article className="text-center mx-auto">
      <img
        src={person.image}
        alt={person.name}
        className={`mx-auto rounded-2xl object-cover ${
          large ? 'w-[7.5rem] sm:w-[8.5rem] shadow-[0_18px_36px_rgba(0,0,0,0.35)]' : 'w-16 sm:w-20 shadow-[0_10px_20px_rgba(0,0,0,0.3)]'
        } aspect-[3/4] bg-gray-100 border border-gray-200`}
      />
      <p className={`${large ? 'mt-3 text-base sm:text-lg' : 'mt-1.5 text-xs sm:text-sm'} font-semibold text-white`}>{person.name}</p>
      <span className={`${large ? 'mt-1' : 'mt-1'} inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-600/20 text-red-100 border border-red-400/40`}>
        {Icon ? <Icon size={12} /> : null}
        {person.role}
      </span>
    </article>
  )
}

function CommitteeCard({ committee }) {
  return (
    <article className="h-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3 sm:p-4 shadow-[0_14px_28px_rgba(0,0,0,0.32)] hover:shadow-[0_18px_36px_rgba(0,0,0,0.42)] transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/90 text-red-700 flex items-center justify-center shrink-0">
          <Briefcase size={14} />
        </div>
        <h3 className="font-semibold text-sm sm:text-base text-white">{committee.name}</h3>
      </div>

      <div className="flex justify-center pb-3 mb-3 border-b border-white/20 relative">
        <OrgPersonCard person={committee.head} />
      </div>

      <div className="flex justify-center">
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {committee.members.map(member => (
            <li key={`${committee.name}-${member.name}`} className="hover:-translate-y-0.5 transition-transform">
              <OrgPersonCard person={member} />
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function Landing() {
  const navigate = useNavigate()
  const pageRef = useRef(null)

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
      { threshold: 0.18 }
    )

    targets.forEach(target => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={pageRef} className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-900 text-white overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-72 h-72 rounded-full bg-red-700/20 blur-3xl" />
        <div className="absolute -bottom-16 right-1/4 w-64 h-64 rounded-full bg-red-500/20 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="flex items-center justify-between mb-10">
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-full bg-white/90 p-1.5 shadow-lg">
              <img src="/image-removebg-preview.png" alt="KUSGAN logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg leading-5">KUSGAN</p>
              <p className="text-xs text-red-300">Volunteer Inc.</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-200">
            <a href="#home" className="hover:text-white transition-colors">Home</a>
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#organizational-structure" className="hover:text-white transition-colors">Structure</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
          </nav>
        </header>

        <section id="home" data-reveal className="reveal-on-scroll grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-400/40 text-red-100 text-xs font-semibold">
              <Sparkles size={14} />
              Community In Action
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              KUSGAN
              <span className="block text-red-400">Volunteerism for Inclusive Communities</span>
            </h1>
            <p className="text-lg text-gray-200 font-medium">
              Building a better world through compassion, service, and unity.
            </p>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl">
              KUSGAN Volunteer Inc. mobilizes people to participate in meaningful community action, strengthening social inclusion through practical volunteer programs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-xl shadow-red-900/35 hover:-translate-y-1 transition-all"
              >
                <LogIn size={18} />
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate('/recruitment')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-gray-100 to-white text-gray-900 hover:-translate-y-1 shadow-xl hover:shadow-2xl transition-all"
              >
                <Handshake size={18} />
                Join Us
              </button>
            </div>
          </div>

          <div className="w-full max-w-xl mx-auto">
            <div className="hero-float h-[290px] sm:h-[360px] rounded-3xl bg-gradient-to-b from-white/80 via-gray-100/70 to-gray-200/55 ring-2 ring-white/35 backdrop-blur-md shadow-[0_24px_46px_rgba(0,0,0,0.28),inset_0_2px_0_rgba(255,255,255,0.85),inset_0_-10px_20px_rgba(148,163,184,0.2)] [transform:perspective(1200px)_rotateX(2deg)] overflow-hidden">
              <img
                src={HERO_IMAGE}
                alt="KUSGAN logo hero"
                className="w-full h-full object-contain bg-gray-100/85 drop-shadow-[0_16px_28px_rgba(0,0,0,0.34)] brightness-110"
              />
            </div>
          </div>
        </section>

        <section id="services" data-reveal className="reveal-on-scroll mt-16 sm:mt-20">
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Our Services</h2>
            <p className="text-sm text-gray-300 mt-2">Focused volunteer initiatives of KUSGAN.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.map(service => (
              <article
                key={service.key}
                className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-5 shadow-xl hover:shadow-2xl transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-white/90 text-red-700 flex items-center justify-center mb-3">
                  <service.icon size={20} />
                </div>
                <h3 className="font-semibold text-white">{service.title}</h3>
                <p className="text-sm text-gray-300 mt-1">{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="organizational-structure" data-reveal className="reveal-on-scroll mt-16 sm:mt-20">
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Organizational Structure</h2>
            <p className="text-sm text-gray-300 mt-2">
              Leadership hierarchy and committee teams of KUSGAN.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="max-w-xl mx-auto">
              <OrgPersonCard person={ORG_STRUCTURE.president} large />
            </div>
            <div className="w-px h-7 bg-red-300/80 mx-auto" />
            <div className="max-w-xl mx-auto">
              <OrgPersonCard person={ORG_STRUCTURE.vicePresident} large />
            </div>
            <div className="w-px h-7 bg-red-300/80 mx-auto" />
            <div className="hidden xl:block max-w-7xl mx-auto mb-3">
              <div className="border-t border-red-300/80" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {ORG_STRUCTURE.committees.slice(0, 5).map(committee => (
                <div key={committee.name} className="relative h-full">
                  <div className="hidden xl:block absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-red-300/80" />
                  <CommitteeCard committee={committee} />
                </div>
              ))}
            </div>

            {ORG_STRUCTURE.committees.length > 5 && (
              <div className="mt-5 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                {ORG_STRUCTURE.committees.slice(5, 8).map(committee => (
                  <div key={committee.name} className="h-full">
                    <CommitteeCard committee={committee} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="about" data-reveal className="reveal-on-scroll mt-16 sm:mt-20 pb-10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">About Us</h2>
              <div className="w-20 h-px bg-red-300/80 mx-auto mt-4 mb-5" />
              <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
                KUSGAN Volunteer Inc. is committed to inclusive community service through compassion, coordinated action, and unity.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <article className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-white">Mission</h3>
                <p className="text-sm text-gray-200 mt-2">
                  To mobilize volunteers in delivering practical, compassionate service to communities.
                </p>
              </article>
              <article className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-white">Vision</h3>
                <p className="text-sm text-gray-200 mt-2">
                  To inspire inclusive and resilient communities through volunteerism.
                </p>
              </article>
            </div>

            <div className="mt-7">
              <h3 className="text-xl font-semibold text-white mb-4">Core Values</h3>
            </div>
            <div className="space-y-4">
              {CORE_VALUES.map(value => (
                <article
                  key={value.title}
                  className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-4 sm:p-5 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-full sm:w-40 shrink-0">
                      <div className="overflow-hidden rounded-xl bg-gray-100/85 border border-gray-200 shadow-[0_12px_22px_rgba(0,0,0,0.28)]">
                        <img src={value.image} alt={value.title} className="w-full h-24 object-cover" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{value.title}</h3>
                      <p className="text-sm text-gray-300 mt-1">{value.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Landing
