import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function ChangePassword() {
  const navigate = useNavigate()
  const { user, changeCurrentUserPassword } = useAuth()

  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.')
      return
    }

    const result = await changeCurrentUserPassword(passwordForm.currentPassword, passwordForm.newPassword)
    if (!result.success) {
      if (result.message === 'Session expired. Please log in again.') {
        navigate('/login', { replace: true, state: { message: result.message } })
        return
      }
      setPasswordError(result.message)
      return
    }

    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordSuccess('Password updated successfully.')
  }

  return (
    <div className="animate-fade-in py-4">
      <div className="mx-auto w-full max-w-6xl">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/15 p-1"
          style={{
            background: 'linear-gradient(145deg, rgba(14,116,144,0.88), rgba(30,64,175,0.84) 52%, rgba(59,130,246,0.78))',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="absolute -left-16 -bottom-20 h-64 w-64 rounded-full bg-blue-200/10 blur-3xl" />
          <div
            className="relative rounded-[22px] border border-white/10 p-6 backdrop-blur-md md:p-8"
            style={{
              background: 'linear-gradient(145deg, rgba(14,116,144,0.34), rgba(30,64,175,0.28) 52%, rgba(96,165,250,0.24))',
            }}
          >
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Profile Management</p>
                <h3 className="text-2xl font-bold text-white md:text-3xl">Change Password</h3>
                <p className="mt-1 text-sm text-white/75">Update your account password securely.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                <KeyRound size={14} className="text-yellow-300" />
                Password Security
              </div>
            </div>

            <div
              className="rounded-2xl border border-white/10 p-4 backdrop-blur-md md:p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(14,116,144,0.24), rgba(30,64,175,0.2) 52%, rgba(96,165,250,0.16))',
              }}
            >
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <KeyRound size={20} className="text-yellow-300" />
                Change Password
              </h3>

              {passwordError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-white">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-zinc-800 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 transition-colors hover:text-yellow-300"
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-white">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-zinc-800 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 transition-colors hover:text-yellow-300"
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <label htmlFor="confirm-new-password" className="mb-1.5 block text-sm font-medium text-white">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-new-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-zinc-800 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 transition-colors hover:text-yellow-300"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="md:col-span-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-xl bg-yellow-400 px-5 py-3 font-medium text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300"
                      style={{ boxShadow: '0 8px 24px rgba(250,204,21,0.35)' }}
                    >
                      Update Password
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      className="rounded-lg bg-slate-900 px-4 py-2.5 text-white transition-colors hover:bg-black"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword
