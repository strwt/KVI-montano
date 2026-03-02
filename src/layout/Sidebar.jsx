import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, User, LogOut, ChevronLeft, ChevronRight, Users, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Sidebar({ isOpen, toggleSidebar }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin'

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    ...(isAdmin ? [{ to: '/report', icon: FileText, label: 'Report' }] : []),
    { to: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside 
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-gray-900 to-black shadow-2xl z-40 transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 transition-all z-50"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Logo Section */}
        <div className={`p-6 ${!isOpen && 'px-2'}`}>
          {isOpen ? (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                  <img
                    src="/image-removebg-preview.png"
                    alt="KUSGAN logo"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">KUSGAN</h1>
                  <p className="text-xs text-red-400">Volunteer Inc.</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Cares Department</p>
            </div>
          ) : (
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto overflow-hidden">
              <img
                src="/image-removebg-preview.png"
                alt="KUSGAN logo"
                className="w-8 h-8 object-contain"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-red-600/20 hover:text-white transition-all ${
                  isActive ? 'bg-red-600/30 text-white border-r-4 border-red-600' : ''
                } ${!isOpen && 'justify-center px-3'}`
              }
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <item.icon size={20} className={isOpen ? '' : 'mx-auto'} />
              {isOpen && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Members Section - Admin Only - Now navigates to /members page */}
          {isAdmin && (
            <button
              onClick={() => navigate('/members')}
              className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-red-600/20 hover:text-white transition-all w-full ${
                !isOpen && 'justify-center px-3'
              }`}
            >
              <Users size={20} className={isOpen ? '' : 'mx-auto'} />
              {isOpen && <span>Members</span>}
            </button>
          )}
        </nav>

        {/* User Section */}
        <div className={`absolute bottom-0 w-full p-4 border-t border-gray-800 ${!isOpen && 'border-l'}`}>
          {isOpen ? (
            <>
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{user?.name || 'Guest'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.idNumber || user?.email || 'Guest User'}</p>
                  {user?.role === 'admin' && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-red-600/20 text-red-400 text-xs rounded">Admin</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-300 hover:bg-red-600/20 hover:text-white rounded-lg transition-all"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full p-2 text-gray-300 hover:bg-red-600/20 hover:text-white rounded-lg transition-all"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
