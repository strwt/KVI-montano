import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const getInitialSidebarOpen = () => {
  if (typeof window === 'undefined') return true
  return window.innerWidth >= 768
}

function Layout() {
  const { darkMode, setDarkMode, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen)
  const location = useLocation()
  const navigate = useNavigate()
  const restoredRouteRef = useRef(false)

  useEffect(() => {
    if (restoredRouteRef.current) return
    restoredRouteRef.current = true

    if (location.pathname !== '/') return

    try {
      const skipRestore = window.sessionStorage.getItem('kusgan:skip_last_route_restore') || ''
      if (skipRestore) {
        window.sessionStorage.removeItem('kusgan:skip_last_route_restore')
        return
      }
      const lastRoute = window.localStorage.getItem('kusgan:last_route') || ''
      if (!lastRoute || lastRoute === '/' || !lastRoute.startsWith('/')) return
      navigate(lastRoute, { replace: true })
    } catch {
      // ignore
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    const fullPath = `${location.pathname || '/'}${location.search || ''}${location.hash || ''}`

    if (fullPath === '/') {
      try {
        const existing = window.localStorage.getItem('kusgan:last_route') || ''
        if (existing && existing !== '/') return
      } catch {
        // ignore
      }
    }

    try {
      window.localStorage.setItem('kusgan:last_route', fullPath)
    } catch {
      // ignore
    }
  }, [location.hash, location.pathname, location.search])

  useEffect(() => {
    // Deterministic theme application avoids stale dark class state.
    document.documentElement.classList.remove('dark')
    document.body.classList.remove('dark')
    if (darkMode) {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    }
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const handleChange = event => {
      if (!event.matches) setSidebarOpen(false)
    }

    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev)
  }

  return (
    <div className="flex min-h-screen bg-neutral-100 dark:bg-neutral-900 w-full overflow-x-hidden transition-colors">
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-all md:hidden"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />
      
      <main 
        className={`flex-1 px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 pt-20 md:pt-6 transition-all duration-300 overflow-x-hidden ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-20'
        }`}
      >
        {loading && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            Syncing the latest data in the background.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
