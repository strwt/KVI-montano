import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'

const getStoredDarkMode = () => {
  try {
    const stored = localStorage.getItem('kusgan_dark_mode')
    return stored ? Boolean(JSON.parse(stored)) : false
  } catch {
    return false
  }
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(getStoredDarkMode)

  useEffect(() => {
    localStorage.setItem('kusgan_dark_mode', JSON.stringify(darkMode))
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
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
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />
      
      <main 
        className={`flex-1 px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 pt-20 md:pt-6 transition-all duration-300 overflow-x-hidden ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-20'
        }`}
      >
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
