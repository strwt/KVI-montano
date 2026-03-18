import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, ArrowLeft, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [idNumber, setIdNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState(false)
  const { login, supabaseEnabled, supabaseConfigError, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const message = location.state?.message
    if (typeof message === 'string' && message.trim()) {
      setInfo(message.trim())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!pendingRedirect) return
    if (user) {
      navigate('/', { replace: true })
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPendingRedirect(false)
      setError('Signed in but the app did not load your session. Please refresh and try again.')
    }, 5000)

    return () => window.clearTimeout(timeoutId)
  }, [navigate, pendingRedirect, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setPendingRedirect(false)

    if (!supabaseEnabled) {
      setError(supabaseConfigError || 'Supabase is not configured.')
      return
    }

    if (!idNumber.trim() || !password.trim()) {
      setError('All fields are required.')
      return
    }

    const normalizedIdNumber = idNumber.trim()
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdNumber.toLowerCase())) {
      setError('Please enter your ID number (email sign-in is disabled).')
      return
    }

    setIsLoading(true)

    try {
      // Simulate network delay for animation
      await new Promise(resolve => setTimeout(resolve, 500))

      const timeout = new Promise(resolve =>
        setTimeout(() => resolve({ success: false, message: 'Login timed out. Please try again.' }), 15_000)
      )

      const result = await Promise.race([login(normalizedIdNumber, password), timeout])
      if (result.success) {
        setInfo('Signed in. Redirecting...')
        setPendingRedirect(true)
      } else {
        setError(result.message || 'Login failed.')
      }
    } catch (err) {
      const message = err?.message ? String(err.message) : ''
      setError(message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-zinc-100 to-red-100 dark:from-black dark:via-gray-900 dark:to-red-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full shadow-lg flex items-center justify-center">
            <img
              src="/image-removebg-preview.png"
              alt="KUSGAN logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">KUSGAN Volunteer</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Community Service under Cares Department</p>
        </div>

        {/* Login Form */}
<div className="bg-white dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-red-600">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <button
              type="button"
              onClick={() => navigate('/landing')}
              className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <ArrowLeft size={14} />
              Back to Landing
            </button>
            <button
              type="button"
              onClick={() => navigate('/recruitment')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-600/30 dark:text-red-100 dark:hover:bg-red-600/45 text-xs"
            >
              <UserPlus size={14} />
              Recruitment
            </button>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Welcome Back
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-200 text-sm animate-shake">
              {error}
            </div>
          )}

          {info && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-200 text-sm">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email / ID Input */}
            <div className="relative">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">ID Number</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400" size={18} />
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Enter your ID number"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="relative">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}

export default Login
