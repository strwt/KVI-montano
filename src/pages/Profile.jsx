import { useEffect, useMemo, useRef, useState } from 'react'
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

function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showEditOptions, setShowEditOptions] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current) return
      if (menuRef.current.contains(event.target)) return
      setShowEditOptions(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const profileFields = useMemo(() => ([
    { label: 'Full Name', value: user?.name || 'N/A', icon: User },
    { label: 'Email', value: user?.email || 'N/A', icon: Mail },
    { label: 'ID Number', value: user?.idNumber || 'N/A', icon: Hash },
    { label: 'Address', value: user?.address || 'Not set', icon: MapPin },
    { label: 'Contact Number', value: user?.contactNumber || 'Not set', icon: Phone },
    { label: 'Blood Type', value: user?.bloodType || 'Not set', icon: Droplets },
    { label: 'Role', value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member', icon: Shield },
    { label: 'Account Status', value: user?.accountStatus || 'Active', icon: BadgeCheck },
  ]), [user])

  const completion = useMemo(() => {
    const tracked = [user?.name, user?.email, user?.idNumber, user?.address, user?.contactNumber, user?.bloodType]
    const filled = tracked.filter((field) => String(field || '').trim().length > 0).length
    return Math.round((filled / tracked.length) * 100)
  }, [user])

  return (
    <div className="animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl border border-red-900/40 bg-gradient-to-br from-black via-zinc-950 to-red-950 p-1 mb-6">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />

        <div className="relative rounded-[22px] bg-white/95 backdrop-blur-md p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-red-100 shadow-lg shadow-red-900/20 bg-white">
                <img
                  src={user?.profileImage || '/image-removebg-preview.png'}
                  alt={user?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-red-700 font-semibold mb-1">Account Center</p>
                <h2 className="text-3xl font-bold text-zinc-900 font-heading">{user?.name || 'User Profile'}</h2>
                <p className="text-zinc-600">{user?.email || 'No email available'}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    user?.role === 'admin'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-zinc-100 text-zinc-700'
                  }`}>
                    <Shield size={13} />
                    {user?.role === 'admin' ? 'Administrator' : 'Member'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {user?.accountStatus || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div ref={menuRef} className="relative self-start">
              <button
                onClick={() => setShowEditOptions((prev) => !prev)}
                aria-label="Profile actions"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl hover:bg-zinc-900 transition-colors border border-red-600/70 shadow-md shadow-red-900/25"
              >
                <Edit2 size={16} />
                <span className="text-sm font-semibold">Manage</span>
              </button>

              <div
                aria-hidden={!showEditOptions}
                className={`absolute right-0 top-12 z-30 w-56 rounded-xl border border-zinc-200 bg-white shadow-2xl p-2 transition-all duration-200 ${
                  showEditOptions ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
                }`}
              >
                <button
                  onClick={() => {
                    setShowEditOptions(false)
                    navigate('/account/edit')
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <span>Account Info</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => {
                    setShowEditOptions(false)
                    navigate('/change-password')
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <span>Change Password</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 mb-2">Profile Completion</p>
              <div className="flex items-end justify-between gap-3">
                <p className="text-2xl font-bold text-zinc-900">{completion}%</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                  <Sparkles size={14} />
                  Keep details updated
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-zinc-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-black via-zinc-900 to-red-600 transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-red-700 mb-2">Identity</p>
              <p className="text-sm text-zinc-600">Member ID</p>
              <p className="text-lg font-semibold text-zinc-900">{user?.idNumber || 'N/A'}</p>
              <p className="text-xs text-zinc-500 mt-2">This profile is secured and accessible only to authorized users.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-6 md:p-7 mb-6">
        <h3 className="text-lg font-semibold text-zinc-900 mb-5 flex items-center gap-2">
          <User size={20} className="text-red-600" />
          Profile Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profileFields.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="group rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 px-4 py-3.5 hover:border-red-300 transition-colors"
            >
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500 mb-1.5 flex items-center gap-2">
                <Icon size={14} className="text-red-600 group-hover:text-red-700" />
                {label}
              </p>
              <p className="text-zinc-900 font-semibold break-words">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Profile
