import { useEffect, useState } from 'react'
import { KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function ChangePassword() {
  const navigate = useNavigate()
  const { user, changeCurrentUserPassword } = useAuth()

  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  const handlePasswordChange = (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.')
      return
    }

    const result = changeCurrentUserPassword(passwordForm.currentPassword, passwordForm.newPassword)
    if (!result.success) {
      setPasswordError(result.message)
      return
    }

    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordSuccess('Password updated successfully.')
  }

  return (
    <div className="animate-fade-in py-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-red-900/35 bg-gradient-to-br from-black via-zinc-950 to-red-950 p-1">
          <div className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-red-600/25 blur-3xl" />
          <div className="absolute -left-16 -bottom-20 w-64 h-64 rounded-full bg-red-500/20 blur-3xl" />

          <div className="relative rounded-[22px] bg-white/95 backdrop-blur-md p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-red-700 font-semibold mb-1">Security Settings</p>
                <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 font-heading flex items-center gap-2">
                  <KeyRound size={24} className="text-red-600" />
                  Change Password
                </h3>
                <p className="text-sm text-zinc-600 mt-1">Keep your account secure with a strong and unique password.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 bg-white">
                <ShieldCheck size={14} className="text-red-600" />
                Protected Account
              </div>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <label className="block text-sm text-zinc-700 mb-1.5 font-medium flex items-center gap-2">
                  <Lock size={15} className="text-red-600" />
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <label className="block text-sm text-zinc-700 mb-1.5 font-medium flex items-center gap-2">
                  <Lock size={15} className="text-red-600" />
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Create new password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <label className="block text-sm text-zinc-700 mb-1.5 font-medium flex items-center gap-2">
                  <Lock size={15} className="text-red-600" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                />
              </div>

              <div className="md:col-span-3 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-white px-4 py-3 text-xs text-zinc-600">
                Use at least 8 characters and avoid reusing your old password for better account security.
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="px-4 py-2.5 bg-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-black text-white border border-red-600/80 rounded-lg hover:bg-zinc-900 transition-colors font-medium shadow-md shadow-red-900/25"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword
