import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const getInitialSidebarOpen = () => {
  if (typeof window === 'undefined') return true
  return window.innerWidth >= 768
}

function Layout() {
  const { darkMode, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen)
  const location = useLocation()
  const dashboardThemeRoutes = [
    '/',
    '/calendar',
    '/attendance-management',
    '/report',
    '/donations',
    '/members',
    '/profile',
    '/account/edit',
    '/change-password',
    '/category-management',
    '/committee-management',
  ]
  const isDashboardThemeRoute = dashboardThemeRoutes.some(route => {
    if (route === '/') return location.pathname === '/'
    return location.pathname.startsWith(route)
  })
  const shellTone = isDashboardThemeRoute
    ? 'bg-gradient-to-br from-blue-900 via-[#4169E1] to-blue-300 text-white'
    : 'bg-neutral-100 dark:bg-neutral-900'
  const mobileToggleTone = isDashboardThemeRoute
    ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'
    : 'bg-red-600 text-white hover:bg-red-700'
  const forcedDarkClass = isDashboardThemeRoute ? 'dark' : ''

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
    <div className={`flex min-h-screen w-full overflow-x-hidden transition-colors ${shellTone} ${forcedDarkClass}`}>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 left-4 z-50 rounded-lg p-2 shadow-lg transition-all md:hidden ${mobileToggleTone}`}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
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
