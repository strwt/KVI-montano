import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, ChevronLeft, ChevronRight, Users, FileText, ClipboardCheck, LogOut, Tags, Settings, ChevronDown, ChevronUp, HandHeart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/useI18n'
import { useConfirm } from '../context/ConfirmContext'

function Sidebar({ isOpen, toggleSidebar }) {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const location = useLocation()
  const [managementOpen, setManagementOpen] = useState(null)

  const isAdmin = user?.role === 'admin'
  const shellTone = 'bg-[#041221]/90 text-white border-r border-white/10 backdrop-blur-xl'
  const navTone = 'text-white/80 hover:bg-white/10 hover:text-white'
  const navActiveTone = 'text-white bg-white/10 border border-white/15 backdrop-blur-xl shadow-none border-l-2 border-yellow-400'
  const utilityBtnTone = 'text-white-300 hover:bg-white/10 hover:text-white'
  const navIconTone = 'text-yellow-300 group-hover:text-yellow-200'
  const userDividerTone = 'border-t border-white/10'
  const userNameTone = 'text-white'
  const sidebarAccentTone = 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'
  const avatarTone = 'bg-white ring-2 ring-yellow-400/30'
  const footerBorderTone = 'border-l border-white/10'
  const footerButtonBorderTone = 'border-white/15'
  const managementRoutes = ['/members', '/achievements', '/category-management', '/committee-management']
  const isOnManagementRoute = managementRoutes.some(route => location.pathname.startsWith(route))
  const resolvedManagementOpen = managementOpen ?? isOnManagementRoute
  const getNavLabelClass = (label) => {
    const text = String(label || '')
    if (text === 'Attendance Management') return 'min-w-0 whitespace-nowrap text-sm text-white'
    if (text.length > 18) return 'min-w-0 whitespace-nowrap text-[12px] tracking-[-0.01em] text-white'
    if (text.length > 12) return 'min-w-0 whitespace-nowrap text-[13px] tracking-[-0.01em] text-white'
    return 'min-w-0 whitespace-nowrap text-sm text-white'
  }

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('Dashboard') },
    { to: '/calendar', icon: Calendar, label: t('Calendar') },
    ...(!isAdmin ? [{ to: '/attendance', icon: ClipboardCheck, label: 'Attendance' }] : []),
    ...(isAdmin ? [{ to: '/attendance-management', icon: ClipboardCheck, label: 'Attendance Management' }] : []),
    ...(isAdmin ? [{ to: '/report', icon: FileText, label: t('Report') }] : []),
    ...(isAdmin ? [{ to: '/donations', icon: HandHeart, label: t('Donations') }] : []),
  ]

  const handleLogout = async () => {
    const ok = await confirm({
      title: t('Logout'),
      description: 'Are you sure you want to log out?',
      confirmText: t('Logout'),
      cancelText: 'Cancel',
      danger: true,
    })
    if (!ok) return
    await logout()
    navigate('/landing', { replace: true })
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
        className={`fixed left-0 top-0 h-full z-40 w-64 flex flex-col transition-transform md:transition-all md:translate-x-0 duration-300 ${shellTone} ${
          isOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:w-20'
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={`hidden md:flex absolute -right-3 top-20 rounded-full p-1 transition-all z-50 ${sidebarAccentTone}`}
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-2"
          style={{ scrollbarGutter: 'stable' }}
        >
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
                  className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden transition-colors ${avatarTone} ${utilityBtnTone}`}
                  aria-label={t('Profile')}
                  title={t('Profile')}
                >
                  <img
                    src={user?.profileImage || '/kvi.png'}
                    alt={user?.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                </button>
                <div className="flex flex-col items-center min-w-0">
                  <p className={`font-normal truncate ${userNameTone}`}>{user?.name || 'Guest'}</p>
                  {user?.role === 'admin' ? (
                    <span
                      className="inline-block mt-1 rounded px-2 py-0.5 text-xs border border-yellow-300/20 bg-yellow-300/15 text-yellow-200"
                    >
                      Admin
                    </span>
                  ) : (user?.committeeRole || user?.committee_role) === 'OIC' ? (
                    <span className="inline-block mt-1 rounded px-2 py-0.5 text-xs border border-yellow-300/20 bg-yellow-300/15 text-yellow-200">
                      OIC
                    </span>
                  ) : null}
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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${avatarTone}`}>
                <img
                  src={user?.profileImage || '/kvi.png'}
                  alt={user?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-2 px-2 space-y-1">
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (window.innerWidth < 768 && isOpen) toggleSidebar()
              }}
              className={({ isActive }) =>
                `group relative flex min-h-[48px] items-center gap-2.5 rounded-lg px-3 py-3 transition-all duration-200 ${navTone} ${
                  isActive ? navActiveTone : 'border-l-2 border-transparent'
                } ${!isOpen && 'justify-center px-3'}`
              }
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <item.icon size={20} className={`${navIconTone} ${isOpen ? 'shrink-0' : 'mx-auto'}`} />
              {isOpen && <span className={getNavLabelClass(item.label)}>{item.label}</span>}
            </NavLink>
          ))}

          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setManagementOpen(prev => {
                    const current = prev ?? isOnManagementRoute
                    return !current
                  })
                }}
                className={`group relative flex min-h-[48px] w-full items-center justify-between gap-2.5 rounded-lg border-l-2 border-transparent px-3 py-3 transition-all duration-200 ${navTone} ${
                  !isOpen && 'justify-center px-3'
                }`}
              >
                <div className={`flex items-center gap-3 ${!isOpen ? 'w-full justify-center' : ''}`}>
                  <Settings size={20} className={`${navIconTone} ${isOpen ? '' : 'mx-auto'}`} />
                  {isOpen && <span>{t('Management')}</span>}
                </div>
                {isOpen ? (
                  resolvedManagementOpen ? <ChevronUp size={18} className="text-current" /> : <ChevronDown size={18} className="text-current" />
                ) : null}
              </button>

              {resolvedManagementOpen && (
                <div
                  className={`space-y-1 bg-[#041221]/60 border border-white/10 backdrop-blur-md rounded-lg p-2 ${
                    isOpen ? 'mt-1 pl-8' : 'mt-1'
                  }`}
                >
                  <NavLink
                    to="/members"
                    onClick={() => {
                      setManagementOpen(false)
                      if (window.innerWidth < 768 && isOpen) toggleSidebar()
                    }}
                    className={({ isActive }) =>
                      `group relative flex min-h-[40px] min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${navTone} ${
                        isActive ? navActiveTone : 'border-l-2 border-transparent'
                      } ${!isOpen ? 'justify-center px-2' : ''}`
                    }
                  >
                    <Users size={18} className={`${navIconTone} shrink-0`} />
                    {isOpen ? (
                      <span className="min-w-0 truncate text-sm text-white">{t('User Management')}</span>
                    ) : null}
                  </NavLink>

                  <NavLink
                    to="/achievements"
                    onClick={() => {
                      setManagementOpen(false)
                      if (window.innerWidth < 768 && isOpen) toggleSidebar()
                    }}
                    className={({ isActive }) =>
                      `group relative flex min-w-0 items-center gap-3 rounded-lg px-4 py-2 text-sm transition-all duration-200 ${navTone} ${
                        isActive ? navActiveTone : 'border-l-2 border-transparent'
                      } ${!isOpen ? 'justify-center px-2' : ''}`
                    }
                  >
                    <Tags size={18} className={`${navIconTone} shrink-0`} />
                    {isOpen ? <span className="min-w-0 truncate text-sm text-white">Achievements</span> : null}
                  </NavLink>

                  <NavLink
                    to="/category-management"
                    onClick={() => {
                      setManagementOpen(false)
                      if (window.innerWidth < 768 && isOpen) toggleSidebar()
                    }}
                    className={({ isActive }) =>
                      `group relative flex min-h-[40px] min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${navTone} ${
                        isActive ? navActiveTone : 'border-l-2 border-transparent'
                      } ${!isOpen ? 'justify-center px-2' : ''}`
                    }
                  >
                    <Tags size={18} className={`${navIconTone} shrink-0`} />
                    {isOpen ? <span className="min-w-0 truncate text-sm text-white">{t('Categories')}</span> : null}
                  </NavLink>

                  <NavLink
                    to="/committee-management"
                    onClick={() => {
                      setManagementOpen(false)
                      if (window.innerWidth < 768 && isOpen) toggleSidebar()
                    }}
                    className={({ isActive }) =>
                      `group relative flex min-h-[40px] min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${navTone} ${
                        isActive ? navActiveTone : 'border-l-2 border-transparent'
                      } ${!isOpen ? 'justify-center px-2' : ''}`
                    }
                  >
                    <Users size={18} className={`${navIconTone} shrink-0`} />
                    {isOpen ? (
                      <span className="min-w-0 truncate text-sm text-white">{t('Committee Management')}</span>
                    ) : null}
                  </NavLink>
                </div>
              )}
            </div>
          )}

        </nav>

        </div>
        {/* Footer Section */}
        <div className={`mt-auto w-full p-4 space-y-3 ${userDividerTone} ${!isOpen && footerBorderTone}`}>
          {isOpen ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white logo-no-dark rounded-full flex items-center justify-center overflow-hidden">
                  <img
                    src="/kvi.png"
                    alt="KUSGAN logo"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-white">
                    KUSGAN
                  </h1>
                  <p className="text-xs text-yellow-300">Volunteer Inc.</p>
                </div>
              </div>
              <div className="flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${footerButtonBorderTone} transition-all ${utilityBtnTone}`}
                  aria-label={t('Logout')}
                  title={t('Logout')}
                >
                  <LogOut size={18} className="text-red-500" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-white logo-no-dark rounded-full flex items-center justify-center overflow-hidden">
                <img
                  src="/kvi.png"
                  alt="KUSGAN logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${footerButtonBorderTone} transition-all ${utilityBtnTone}`}
                aria-label={t('Logout')}
                title={t('Logout')}
              >
                <LogOut size={18} className="text-red-500" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
