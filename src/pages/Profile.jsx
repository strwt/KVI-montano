import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  User,
  Mail,
  Hash,
  Shield,
  MapPin,
  Phone,
  Droplets,
  Edit2,
  ChevronRight,
  Sparkles,
  BadgeCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

function Profile() {
  const { user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [showEditOptions, setShowEditOptions] = useState(false)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const autoCloseTimeoutRef = useRef(null)
  const userCommitteeRole = user?.committeeRole || user?.committee_role || 'Member'
  const userType = userCommitteeRole === 'OIC' ? 'oic' : (user?.role === 'admin' ? 'admin' : 'member')

  const clearAutoCloseTimeout = useCallback(() => {
    if (!autoCloseTimeoutRef.current) return
    window.clearTimeout(autoCloseTimeoutRef.current)
    autoCloseTimeoutRef.current = null
  }, [])

  const closeMenu = useCallback(({ restoreFocus = true } = {}) => {
    clearAutoCloseTimeout()
    if (restoreFocus) {
      const active = typeof document !== 'undefined' ? document.activeElement : null
      if (panelRef.current && active && panelRef.current.contains(active)) {
        triggerRef.current?.focus?.()
      }
    }
    setShowEditOptions(false)
  }, [clearAutoCloseTimeout])

  const scheduleAutoClose = useCallback(() => {
    clearAutoCloseTimeout()
    autoCloseTimeoutRef.current = window.setTimeout(() => {
      closeMenu({ restoreFocus: false })
    }, 900)
  }, [clearAutoCloseTimeout, closeMenu])

  useEffect(() => {
    if (!showEditOptions) return undefined

    const handleOutsideClick = (event) => {
      if (!menuRef.current) return
      if (menuRef.current.contains(event.target)) return
      closeMenu()
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeMenu()
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearAutoCloseTimeout()
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [clearAutoCloseTimeout, closeMenu, showEditOptions])

  const profileFields = useMemo(() => ([
    { label: t('Full Name'), value: user?.name || 'N/A', icon: User },
    { label: t('Email'), value: user?.email || 'N/A', icon: Mail },
    { label: t('ID Number'), value: user?.idNumber || 'N/A', icon: Hash },
    { label: t('Address'), value: user?.address || 'Not set', icon: MapPin },
    { label: t('Contact Number'), value: user?.contactNumber || 'Not set', icon: Phone },
    { label: t('Blood Type'), value: user?.bloodType || 'Not set', icon: Droplets },
    {
      label: t('Insurance'),
      value:
        user?.insuranceStatus === 'Insured'
          ? `Insured${user?.insuranceYear ? ` (${user.insuranceYear})` : ''}`
          : (user?.insuranceStatus || 'Not set'),
      icon: Shield,
    },
    {
      label: t('Role'),
      value: userType === 'admin' ? t('Administrator') : (userType === 'oic' ? 'OIC' : t('Member')),
      icon: Shield,
    },
    { label: t('Account Status'), value: user?.accountStatus || t('Active'), icon: BadgeCheck },
  ]), [user, t, userType])

  const completion = useMemo(() => {
    const tracked = [user?.name, user?.email, user?.idNumber, user?.address, user?.contactNumber, user?.bloodType, user?.insuranceStatus]
    const filled = tracked.filter((field) => String(field || '').trim().length > 0).length
    return Math.round((filled / tracked.length) * 100)
  }, [user])

  return (
    <div
      className="animate-fade-in rounded-[28px] border border-white/10 p-4 shadow-[0_24px_70px_rgba(8,47,73,0.18)] md:p-5"
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
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-2xl border border-white/70 bg-[#1d4ed8]/25 shadow-[0_14px_32px_rgba(15,23,42,0.18)]">
                <img
                  src={user?.profileImage || '/kvi.png'}
                  alt={user?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">{t('Account Center')}</p>
                <h2 className="font-heading text-3xl font-bold text-white">{user?.name || t('User Profile')}</h2>
                <p className="text-white/75">{user?.email || t('No email available')}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    userType === 'admin'
                      ? 'border border-yellow-300/20 bg-yellow-300/15 text-yellow-200'
                      : 'border border-white/15 bg-[#1d4ed8]/25 text-white'
                  }`}>
                    <Shield size={13} />
                    {userType === 'admin' ? t('Administrator') : (userType === 'oic' ? 'OIC' : t('Member'))}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/15 px-3 py-1 text-xs font-semibold text-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    {user?.accountStatus || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div
              ref={menuRef}
              className="relative self-start flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center"
              onMouseEnter={clearAutoCloseTimeout}
              onMouseLeave={() => {
                if (showEditOptions) scheduleAutoClose()
              }}
            >
              <button
                onClick={() => {
                  setShowEditOptions((prev) => {
                    const next = !prev
                    if (next) {
                      scheduleAutoClose()
                    } else {
                      clearAutoCloseTimeout()
                    }
                    return next
                  })
                }}
                aria-label={t('Profile actions')}
                ref={triggerRef}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300 sm:w-auto"
                style={{ boxShadow: '0 8px 24px rgba(250,204,21,0.35)' }}
              >
                <Edit2 size={16} />
                <span className="text-sm font-semibold">{t('Manage')}</span>
              </button>

              {showEditOptions && (
                <div
                  ref={panelRef}
                  role="menu"
                  aria-label={t('Profile actions')}
                  className="relative z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-[white] p-2.5 text-black sm:absolute sm:right-0 sm:top-12 sm:mt-0 sm:w-60"
                  onMouseEnter={clearAutoCloseTimeout}
                  onMouseLeave={scheduleAutoClose}
                  style={{
                    background: '#ffffff',
                    backgroundColor: '#ffffff',
                    backgroundImage: 'none',
                    colorScheme: 'light',
                    boxShadow: '0 8px 18px rgba(148,163,184,0.12)',
                    opacity: 1,
                  }}
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      closeMenu({ restoreFocus: false })
                      navigate('/account/edit')
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-yellow-300 bg-yellow-400 px-3.5 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300"
                    style={{ colorScheme: 'light', boxShadow: 'none' }}
                  >
                    <span>{t('Account Info')}</span>
                    <ChevronRight size={16} className="text-slate-900" />
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      closeMenu({ restoreFocus: false })
                      navigate('/change-password')
                    }}
                    className="mt-2 flex w-full items-center justify-between rounded-xl border border-yellow-300 bg-yellow-400 px-3.5 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300"
                    style={{ colorScheme: 'light', boxShadow: 'none' }}
                  >
                    <span>{t('Change Password')}</span>
                    <ChevronRight size={16} className="text-slate-900" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="rounded-2xl border border-white/10 px-4 py-4 backdrop-blur-md"
              style={{
                background: 'linear-gradient(145deg, rgba(14,116,144,0.28), rgba(30,64,175,0.22) 52%, rgba(96,165,250,0.18))',
              }}
            >
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-white/65">{t('Profile Completion')}</p>
              <div className="flex items-end justify-between gap-3">
                <p className="text-2xl font-bold text-white">{completion}%</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-200">
                  <Sparkles size={14} />
                  {t('Keep details updated')}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-200/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-300 to-yellow-300 transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>

            <div
              className="rounded-2xl border border-white/10 px-4 py-4 backdrop-blur-md"
              style={{
                background: 'linear-gradient(145deg, rgba(14,116,144,0.28), rgba(30,64,175,0.22) 52%, rgba(96,165,250,0.18))',
              }}
            >
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-cyan-100">{t('Identity')}</p>
              <p className="text-sm text-white/70">{t('Member ID')}</p>
              <p className="text-lg font-semibold text-white">{user?.idNumber || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="mb-6 rounded-3xl border border-white/15 p-6 shadow-[0_24px_70px_rgba(8,47,73,0.22)] backdrop-blur-md md:p-7"
        style={{
          background: 'linear-gradient(145deg, rgba(14,116,144,0.52), rgba(30,64,175,0.46) 52%, rgba(96,165,250,0.36))',
        }}
      >
        <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
          <User size={20} className="text-yellow-300" />
          {t('Profile Details')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profileFields.map((field) => (
            <div
              key={field.label}
              className="group rounded-2xl border border-[white] px-4 py-3.5 transition-colors hover:border-white/20"
              style={{
                background: 'linear-gradient(145deg, rgba(14,116,144,0.24), rgba(30,64,175,0.18) 52%, rgba(96,165,250,0.16))',
              }}
            >
              <p className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-white/65">
                <field.icon size={14} className="text-yellow-300 group-hover:text-yellow-200" />
                {field.label}
              </p>
              <p className="break-words font-semibold text-white">{field.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Profile
