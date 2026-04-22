import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, ArrowLeft, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const LANDING_THEME = {
  navy: '#4169E1',
  navyDeep: '#1E3A8A',
  navyMid: '#93C5FD',
}

function Login() {
  const [idNumber, setIdNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [postLoginWaiting, setPostLoginWaiting] = useState(false)
  const [postLoginSlow, setPostLoginSlow] = useState(false)
  const { login, supabaseEnabled, supabaseConfigError, user, loading, authResolved } = useAuth()
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
    if (!user) return
    if (!authResolved) return
    if (loading) return
    if (!user?.role) return

    // If a user session is already present (and hydrated), go straight to the app.
    try {
      window.sessionStorage.setItem('kusgan:skip_last_route_restore', '1')
    } catch {
      // ignore
    }
    navigate('/', { replace: true })
  }, [authResolved, loading, navigate, user])

  useEffect(() => {
    if (!postLoginWaiting) return undefined
    setPostLoginSlow(false)
    const timeoutId = window.setTimeout(() => setPostLoginSlow(true), 12_000)
    return () => window.clearTimeout(timeoutId)
  }, [postLoginWaiting])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setPostLoginWaiting(false)
    setPostLoginSlow(false)

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
      let didTimeout = false
      const timeoutId = window.setTimeout(() => {
        didTimeout = true
        setIsLoading(false)
        setPostLoginWaiting(false)
        setError('Login is taking too long. Check your Supabase env vars (.env locally / Vercel in production), then try again.')
      }, 20_000)

      const result = await login(normalizedIdNumber, password)
      window.clearTimeout(timeoutId)
      if (didTimeout) return

      if (result.success) {
        setPostLoginWaiting(true)
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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden text-white"
      style={{ background: LANDING_THEME.navyDeep }}
    >
      {(isLoading || postLoginWaiting) ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/15 text-yellow-200">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Signing in…</h3>
            <p className="mt-1 text-sm text-white/75">Please wait…</p>
            {postLoginSlow ? (
              <button
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-yellow-300"
              >
                Continue
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${LANDING_THEME.navyDeep} 0%, ${LANDING_THEME.navy} 50%, ${LANDING_THEME.navyMid} 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div
          className="absolute -top-40 -right-40 rounded-full"
          style={{
            width: 600,
            height: 600,
            background: `radial-gradient(circle, rgba(250,204,21,0.14) 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute top-1/2 -left-64 rounded-full"
          style={{
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(250,204,21,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -bottom-40 right-1/3 rounded-full"
          style={{
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(250,204,21,0.1) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full shadow-lg flex items-center justify-center">
            <img
              src="/kvi.png"
              alt="KUSGAN logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
            KUSGAN Volunteer
          </h1>
          <p
            className="mt-2 text-sm font-medium text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
          >
            Community Service under Cares Department
          </p>
        </div>

        {/* Login Form */}
        <div
          className="backdrop-blur-2xl rounded-2xl shadow-2xl p-8 border border-white/20"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
            boxShadow: '0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <button
              type="button"
              onClick={() => navigate('/landing')}
              className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white"
            >
              <ArrowLeft size={14} />
              Back to Landing
            </button>
            <button
              type="button"
              onClick={() => navigate('/recruitment')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-400 text-slate-950 hover:bg-yellow-300 text-xs font-semibold shadow-[0_10px_24px_rgba(250,204,21,0.28)] transition-colors"
            >
              <UserPlus size={14} />
              Recruitment
            </button>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-6 drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
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
              <label
                htmlFor="login-id-number"
                className="block text-white/75 text-sm font-medium mb-2"
              >
                ID Number
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  id="login-id-number"
                  name="idNumber"
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  disabled={isLoading || postLoginWaiting}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Enter your ID number"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="relative">
              <label
                htmlFor="login-password"
                className="block text-white/75 text-sm font-medium mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || postLoginWaiting}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || postLoginWaiting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || postLoginWaiting}
              className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-300 text-slate-950 font-semibold rounded-lg hover:from-yellow-300 hover:to-amber-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_16px_34px_rgba(250,204,21,0.28)]"
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
