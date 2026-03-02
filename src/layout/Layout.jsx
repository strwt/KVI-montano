import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'

const getStoredSoundEnabled = () => {
  const stored = localStorage.getItem('kusgan_sound_enabled')
  return stored ? JSON.parse(stored) : true
}

const getStoredDarkMode = () => {
  const stored = localStorage.getItem('kusgan_dark_mode')
  return stored ? JSON.parse(stored) : false
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(getStoredSoundEnabled)
  const [darkMode, setDarkMode] = useState(getStoredDarkMode)

  useEffect(() => {
    localStorage.setItem('kusgan_sound_enabled', JSON.stringify(soundEnabled))
  }, [soundEnabled])

  useEffect(() => {
    localStorage.setItem('kusgan_dark_mode', JSON.stringify(darkMode))
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className={`flex min-h-screen transition-colors ${darkMode ? 'bg-gray-950' : 'bg-gray-100'}`}>
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
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />
      
      <main 
        className={`flex-1 p-6 transition-all duration-300 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-20'
        }`}
      >
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
