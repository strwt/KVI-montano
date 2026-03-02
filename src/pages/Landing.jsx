import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogIn,
  Handshake,
  Leaf,
  Activity,
  Flame,
  FileText,
  HeartPulse,
  Target,
  Eye,
  Sparkles,
} from 'lucide-react'

const SERVICES = [
  {
    key: 'environmental',
    title: 'Environmental',
    description: 'Tree planting, coastal clean-ups, and eco-restoration projects.',
    icon: Leaf,
    iconClass: 'icon-theme-environmental',
  },
  {
    key: 'relief operation',
    title: 'Relief Operation',
    description: 'Rapid response coordination for disaster and evacuation support.',
    icon: Activity,
    iconClass: 'icon-theme-relief',
  },
  {
    key: 'fire response',
    title: 'Fire Response',
    description: 'Emergency assistance and community fire incident support.',
    icon: Flame,
    iconClass: 'icon-theme-fire',
  },
  {
    key: 'notes',
    title: 'Notes',
    description: 'Volunteer meetings, trainings, and operational documentation.',
    icon: FileText,
    iconClass: 'icon-theme-notes',
  },
  {
    key: 'medical',
    title: 'Medical',
    description: 'Medical missions, first aid, and health-centered outreach.',
    icon: HeartPulse,
    iconClass: 'icon-theme-medical',
  },
]

const CORE_VALUES = [
  { letter: 'K', value: 'Kindness', description: 'Everyone with compassion and care.' },
  { letter: 'U', value: 'Unity', description: 'Working together as a team for a common goal.' },
  { letter: 'S', value: 'Service', description: 'Helping others and giving back to the community.' },
  { letter: 'G', value: 'Generosity', description: 'Giving time, resources, and effort selflessly.' },
  { letter: 'A', value: 'Aspiration', description: 'Striving to achieve our best and reach our goal.' },
  { letter: 'N', value: 'Nurture', description: 'Providing care and support to help others thrive.' },
]

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
              KUSGAN Volunteer Inc. mobilizes people to participate in meaningful community action,
              strengthening social inclusion through practical volunteer programs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-xl shadow-red-900/35 hover:-translate-y-1 transition-all"
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

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -top-8 right-2 w-32 h-32 rounded-full bg-red-500/40 blur-2xl" />
            <div className="absolute -bottom-8 left-8 w-44 h-44 rounded-full bg-red-700/30 blur-3xl" />
            <div className="relative rounded-[2.2rem] border border-white/20 bg-white/10 backdrop-blur-lg shadow-2xl p-5 sm:p-7 hero-float">
              <div className="rounded-[1.8rem] bg-gradient-to-b from-white/95 to-gray-100 p-5 sm:p-8">
                <img
                  src="/image-removebg-preview.png"
                  alt="KUSGAN hero"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="services" data-reveal className="reveal-on-scroll mt-16 sm:mt-20">
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-bold">Our Services</h2>
            <p className="text-sm text-gray-300 mt-2">Category-based volunteer initiatives of KUSGAN.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((service, index) => (
              <article
                key={service.key}
                className="statcard-3d statcard-3d-hover rounded-2xl p-5 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`statcard-icon-3d ${service.iconClass} w-11 h-11 rounded-xl bg-white/90 text-red-700 flex items-center justify-center shrink-0`}>
                    <service.icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{service.title}</h3>
                    <p className="text-sm text-gray-300 mt-1">{service.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="about" data-reveal className="reveal-on-scroll mt-16 sm:mt-20 pb-10">
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-bold">About Us</h2>
            <p className="text-sm text-gray-300 mt-2">Mission, vision, and the KUSGAN core values.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <article className="rounded-2xl border border-red-200/30 bg-white/10 backdrop-blur-md p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-red-600/30 flex items-center justify-center">
                  <Target size={18} className="text-red-200" />
                </div>
                <h3 className="font-semibold text-white">Mission</h3>
              </div>
              <p className="text-sm text-gray-200">
                To be a catalyst of community involvement through volunteerism and creating social inclusion for a better world to live in.
              </p>
            </article>

            <article className="rounded-2xl border border-red-200/30 bg-white/10 backdrop-blur-md p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-red-600/30 flex items-center justify-center">
                  <Eye size={18} className="text-red-200" />
                </div>
                <h3 className="font-semibold text-white">Vision</h3>
              </div>
              <p className="text-sm text-gray-200">
                To inspire everyone through volunteerism.
              </p>
            </article>
          </div>

          <article className="rounded-2xl border border-red-200/30 bg-white/10 backdrop-blur-md p-5 shadow-xl">
            <h3 className="font-semibold text-white mb-4">Core Values (KUSGAN)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CORE_VALUES.map(item => (
                <div key={item.letter} className="rounded-xl border border-white/20 bg-black/20 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-600 text-white text-sm font-bold">
                      {item.letter}
                    </span>
                    <p className="text-sm font-semibold text-white">{item.value}</p>
                  </div>
                  <p className="text-xs text-gray-300">{item.description}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}

export default Landing
