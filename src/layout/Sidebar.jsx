import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, User, LogOut, ChevronLeft, ChevronRight, Users, FileText, Sun, Moon, Settings, ChevronDown, ChevronUp, SlidersHorizontal, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/useI18n'

function Sidebar({ isOpen, toggleSidebar, darkMode, onToggleDarkMode }) {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin'
  const shellTone = darkMode
    ? 'bg-gradient-to-b from-gray-900 to-black text-white'
    : 'bg-gradient-to-b from-white to-gray-100 text-gray-900 border-r border-gray-200'
  const navTone = darkMode
    ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
    : 'text-gray-700 hover:bg-red-50 hover:text-gray-900'
  const navActiveTone = darkMode
    ? 'text-white bg-gray-800/80 border-l-2 border-red-600'
    : 'text-red-700 bg-red-50 border-l-2 border-red-600'
  const sectionMutedText = darkMode ? 'text-gray-500' : 'text-gray-600'
  const panelTone = darkMode
    ? 'rounded-lg bg-gray-900/60 border border-gray-800'
    : 'rounded-lg bg-white border border-gray-200'
  const utilityBtnTone = darkMode
    ? 'text-gray-300 hover:bg-red-600/20 hover:text-white'
    : 'text-gray-700 hover:bg-red-50 hover:text-gray-900'
  const userDividerTone = darkMode ? 'border-t border-gray-800' : 'border-t border-gray-200'
  const userNameTone = darkMode ? 'text-white' : 'text-gray-900'
  const userMetaTone = darkMode ? 'text-gray-500' : 'text-gray-600'

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('Dashboard') },
    { to: '/calendar', icon: Calendar, label: t('Calendar') },
    ...(!isAdmin ? [{ to: '/attendance', icon: ClipboardCheck, label: 'Attendance' }] : []),
    ...(isAdmin ? [{ to: '/report', icon: FileText, label: t('Report') }] : []),
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
        className={`fixed left-0 top-0 h-full shadow-2xl z-40 transition-all duration-300 ${shellTone} ${
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
                <div className="w-10 h-10 bg-white logo-no-dark rounded-full flex items-center justify-center overflow-hidden">
                  <img
                    src="/image-removebg-preview.png"
                    alt="KUSGAN logo"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>KUSGAN</h1>
                  <p className="text-xs text-red-600">Volunteer Inc.</p>
                </div>
              </div>
              <p className={`text-xs mt-1 ${sectionMutedText}`}>Cares Department</p>
            </div>
          ) : (
            <div className="w-10 h-10 bg-white logo-no-dark rounded-full flex items-center justify-center mx-auto overflow-hidden">
              <img
                src="/image-removebg-preview.png"
                alt="KUSGAN logo"
                className="w-8 h-8 object-contain"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-2 space-y-1">
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 hover:scale-[1.02] ${navTone} ${
                  isActive ? navActiveTone : 'border-l-2 border-transparent'
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
              className={`group relative flex w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-4 py-3 transition-all duration-200 hover:scale-[1.02] ${navTone} ${
                !isOpen && 'justify-center px-3'
              }`}
            >
              <Users size={20} className={isOpen ? '' : 'mx-auto'} />
              {isOpen && <span>{t('Management')}</span>}
            </button>
          )}
        </nav>

        <div className={`px-3 mt-4 ${isOpen ? 'space-y-2' : 'space-y-3'}`}>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(prev => !prev)}
            className={`w-full flex items-center ${isOpen ? 'gap-3 px-3 justify-start' : 'justify-center'} py-2 rounded-lg transition-all ${utilityBtnTone}`}
          >
            <SlidersHorizontal size={18} />
            {isOpen && (
              <>
                <span className="flex-1 text-left">{t('Appearance')}</span>
                {isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </>
            )}
          </button>

          {isSettingsOpen && (
            <div className={`${panelTone} ${isOpen ? 'p-2 space-y-1' : 'p-1 space-y-2'}`}>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`w-full flex items-center ${isOpen ? 'gap-3 px-2 justify-start' : 'justify-center'} py-2 rounded-lg transition-all ${utilityBtnTone}`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                {isOpen && <span>{darkMode ? t('Light Mode') : t('Dark Mode')}</span>}
              </button>
            </div>
          )}
        </div>

        {/* User Section */}
        <div className={`absolute bottom-0 w-full p-4 ${userDividerTone} ${!isOpen && (darkMode ? 'border-l border-gray-800' : 'border-l border-gray-200')}`}>
          {isOpen ? (
            <>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className={`w-full flex items-center gap-3 mb-2 px-2 py-1 rounded-lg transition-colors ${utilityBtnTone}`}
              >
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center overflow-hidden">
                  <img
                    src={user?.profileImage || '/image-removebg-preview.png'}
                    alt={user?.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${userNameTone}`}>{user?.name || 'Guest'}</p>
                  <p className={`text-xs truncate ${userMetaTone}`}>{user?.idNumber || user?.email || 'Guest User'}</p>
                  {user?.role === 'admin' && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-red-600/20 text-red-600 text-xs rounded">Admin</span>
                  )}
                </div>
                {isUserMenuOpen ? <ChevronUp size={16} className={userMetaTone} /> : <ChevronDown size={16} className={userMetaTone} />}
              </button>
              {isUserMenuOpen && (
                <div className={`${panelTone} mb-3 p-2 space-y-1`}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      navigate('/profile')
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all ${utilityBtnTone}`}
                  >
                    <User size={16} />
                    <span>{t('Profile')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      navigate('/settings')
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all ${utilityBtnTone}`}
                  >
                    <Settings size={16} />
                    <span>{t('Settings')}</span>
                  </button>
                </div>
              )}
              <button
                onClick={handleLogout}
                className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg transition-all ${utilityBtnTone}`}
              >
                <LogOut size={18} />
                <span>{t('Logout')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className={`flex items-center justify-center w-full p-2 rounded-lg transition-all ${utilityBtnTone}`}
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
