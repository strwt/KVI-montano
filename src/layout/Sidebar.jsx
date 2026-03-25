import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, ChevronLeft, ChevronRight, Users, FileText, Sun, Moon, ClipboardCheck, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/useI18n'

function Sidebar({ isOpen, toggleSidebar, darkMode, onToggleDarkMode }) {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

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
  const utilityBtnTone = darkMode
    ? 'text-gray-300 hover:bg-red-600/20 hover:text-white'
    : 'text-gray-700 hover:bg-red-50 hover:text-gray-900'
  const userDividerTone = darkMode ? 'border-t border-gray-800' : 'border-t border-gray-200'
  const userNameTone = darkMode ? 'text-white' : 'text-gray-900'

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('Dashboard') },
    { to: '/calendar', icon: Calendar, label: t('Calendar') },
    ...(!isAdmin ? [{ to: '/attendance', icon: ClipboardCheck, label: 'Attendance' }] : []),
    ...(isAdmin ? [{ to: '/attendance-management', icon: ClipboardCheck, label: 'Attendance' }] : []),
    ...(isAdmin ? [{ to: '/report', icon: FileText, label: t('Report') }] : []),
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

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
        className={`fixed left-0 top-0 h-full shadow-2xl z-40 w-64 transition-transform md:transition-all md:translate-x-0 duration-300 ${shellTone} ${
          isOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:w-20'
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-20 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 transition-all z-50"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* User Section (Top) */}
        <div className={`p-6 ${!isOpen && 'px-2'}`}>
          {isOpen ? (
            <div className="animate-fade-in">
              <div className="w-full flex flex-col items-center gap-2 px-2 py-2 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/profile')
                    if (window.innerWidth < 768 && isOpen) toggleSidebar()
                  }}
                  className={`w-20 h-20 rounded-full bg-red-600 border border-red-600 flex items-center justify-center overflow-hidden transition-colors ${utilityBtnTone}`}
                  aria-label={t('Profile')}
                  title={t('Profile')}
                >
                  <img
                    src={user?.profileImage || '/image-removebg-preview.png'}
                    alt={user?.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                </button>
                <div className="flex flex-col items-center min-w-0">
                  <p className={`font-normal truncate ${userNameTone}`}>{user?.name || 'Guest'}</p>
                  {user?.role === 'admin' && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-red-600/20 text-red-600 text-xs rounded">Admin</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                navigate('/profile')
                if (window.innerWidth < 768 && isOpen) toggleSidebar()
              }}
              className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors ${utilityBtnTone}`}
            >
              <div className="w-14 h-14 rounded-full bg-red-600 border border-red-600 flex items-center justify-center overflow-hidden">
                <img
                  src={user?.profileImage || '/image-removebg-preview.png'}
                  alt={user?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-2 space-y-1">
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (window.innerWidth < 768 && isOpen) toggleSidebar()
              }}
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
              onClick={() => {
                navigate('/members')
                if (window.innerWidth < 768 && isOpen) toggleSidebar()
              }}
              className={`group relative flex w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-4 py-3 transition-all duration-200 hover:scale-[1.02] ${navTone} ${
                !isOpen && 'justify-center px-3'
              }`}
            >
              <Users size={20} className={isOpen ? '' : 'mx-auto'} />
              {isOpen && <span>{t('Management')}</span>}
            </button>
          )}

        </nav>

        {/* Footer Section */}
        <div className={`absolute bottom-0 w-full p-4 space-y-3 ${userDividerTone} ${!isOpen && (darkMode ? 'border-l border-gray-800' : 'border-l border-gray-200')}`}>
          {isOpen ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white logo-no-dark rounded-full flex items-center justify-center overflow-hidden">
                  <img
                    src="/image-removebg-preview.png"
                    alt="KUSGAN logo"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h1 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>KUSGAN</h1>
                  <p className="text-xs text-red-600">Volunteer Inc.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-600/60 transition-all ${utilityBtnTone}`}
                  aria-label={darkMode ? t('Light Mode') : t('Dark Mode')}
                  title={darkMode ? t('Light Mode') : t('Dark Mode')}
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-600/60 transition-all ${utilityBtnTone}`}
                  aria-label={t('Logout')}
                  title={t('Logout')}
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 bg-white logo-no-dark rounded-full flex items-center justify-center overflow-hidden">
                <img
                  src="/image-removebg-preview.png"
                  alt="KUSGAN logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-600/60 transition-all ${utilityBtnTone}`}
                  aria-label={darkMode ? t('Light Mode') : t('Dark Mode')}
                  title={darkMode ? t('Light Mode') : t('Dark Mode')}
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-600/60 transition-all ${utilityBtnTone}`}
                  aria-label={t('Logout')}
                  title={t('Logout')}
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
