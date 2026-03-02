import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ReminderSound from '../components/ReminderSound'
import { Menu, X } from 'lucide-react'

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex min-h-screen bg-gray-100 w-full overflow-x-hidden">
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-all md:hidden"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <main 
        className={`flex-1 px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 pt-20 md:pt-6 transition-all duration-300 overflow-x-hidden ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-20'
        }`}
      >
        <Outlet />
      </main>
      
      <ReminderSound />
    </div>
  )
}

export default Layout
