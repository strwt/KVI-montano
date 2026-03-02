import { useEffect, useState } from 'react'
import { ArrowLeft, KeyRound } from 'lucide-react'
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
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Profile
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <KeyRound size={20} className="text-red-600" />
          Change Password
        </h3>

        {passwordError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="password"
            placeholder="Current password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <input
            type="password"
            placeholder="New password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <div className="md:col-span-3">
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePassword
