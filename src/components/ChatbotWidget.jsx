import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, Send, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const PAGE_SUGGESTIONS = [
  {
    match: ({ pathname, hash }) => pathname.startsWith('/landing') && hash === '#services',
    title: 'Services',
    suggestions: [
      'What services does KVI offer?',
      'Where can I see the partners of KVI?',
      'How do I go back to Home?',
    ],
    links: [
      { label: 'Services', to: '/landing#services' },
      { label: 'Home', to: '/landing' },
      { label: 'About', to: '/landing#about' },
    ],
  },
  {
    match: ({ pathname, hash }) => pathname.startsWith('/landing') && hash === '#organizational-structure',
    title: 'Organization Structure',
    suggestions: [
      'Where is the Board Organizational Structure?',
      'How do I view the KUSGAN Organization Structure?',
      'How do I see member details?',
    ],
    links: [
      { label: 'Structure', to: '/landing#organizational-structure' },
      { label: 'Home', to: '/landing' },
      { label: 'About', to: '/landing#about' },
    ],
  },
  {
    match: ({ pathname, hash }) => pathname.startsWith('/landing') && hash === '#about',
    title: 'About KUSGAN',
    suggestions: [
      'Where can I read the Mission and Vision?',
      'Where are the Core Values?',
      'How do I find Contact Details?',
    ],
    links: [
      { label: 'About', to: '/landing#about' },
      { label: 'Home', to: '/landing' },
      { label: 'Services', to: '/landing#services' },
    ],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/landing'),
    title: 'Landing Page',
    suggestions: [
      'Where can I log in?',
      'How do I apply for recruitment?',
      'Where can I see Services, Structure, and About?',
    ],
    links: [
      { label: 'Login', to: '/login' },
      { label: 'Recruitment', to: '/recruitment' },
      { label: 'Home', to: '/landing' },
    ],
  },
  {
    match: ({ pathname }) => pathname === '/',
    title: 'Dashboard',
    suggestions: [
      'Where can I see recent activities?',
      'Where can I view all events?',
      'Why do categories appear automatically?',
    ],
    suggestionsByRole: {
      admin: [
        'How do I create an event?',
        'Where can I see recent activities?',
        'Why do categories appear automatically?',
      ],
      member: [
        'Where can I see recent activities?',
        'Where can I view all events?',
        'Can I create events as a member?',
      ],
    },
    links: [
      { label: 'Dashboard', to: '/' },
      { label: 'Calendar', to: '/calendar' },
      { label: 'Reports', to: '/report' },
      { label: 'Profile', to: '/profile' },
    ],
    linksByRole: {
      member: [
        { label: 'Dashboard', to: '/' },
        { label: 'Calendar', to: '/calendar' },
        { label: 'Attendance', to: '/attendance' },
        { label: 'Profile', to: '/profile' },
      ],
    },
  },
  {
    match: ({ pathname }) => pathname.startsWith('/calendar'),
    title: 'Calendar & Events',
    suggestions: [
      'How do I create an event?',
      'How can I edit or delete an event?',
      'How do I filter by category?',
    ],
    links: [
      { label: 'Create Event', to: '/calendar', state: { openCreateEventForm: true } },
      { label: 'Event List', to: '/events' },
    ],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/events'),
    title: 'Event List',
    suggestions: [
      'How do I filter by category?',
      'How do I open an event details?',
      'How do I create a new event?',
    ],
    links: [
      { label: 'Create Event', to: '/calendar', state: { openCreateEventForm: true } },
      { label: 'Calendar', to: '/calendar' },
      { label: 'Dashboard', to: '/' },
    ],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/attendance-management'),
    title: 'Attendance Management',
    suggestions: [
      'How do I mark attendance for today?',
      'How do I update a member time out?',
      'Where can I see attendance history?',
    ],
    links: [
      { label: 'Attendance Mgmt', to: '/attendance-management' },
      { label: 'Dashboard', to: '/' },
    ],
    roles: ['admin'],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/attendance'),
    title: 'Attendance',
    suggestions: [
      'How do I time in for today?',
      'Where can I see my attendance records?',
      'Can admin edit my attendance?',
    ],
    links: [
      { label: 'Attendance', to: '/attendance' },
      { label: 'Profile', to: '/profile' },
    ],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/report'),
    title: 'Reports',
    suggestions: [
      'How do I export a report?',
      'Can I view monthly or quarterly reports?',
      'Are reports grouped by event type?',
    ],
    links: [
      { label: 'Reports', to: '/report' },
      { label: 'Dashboard', to: '/' },
    ],
    roles: ['admin'],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/category-management'),
    title: 'Category Management',
    suggestions: [
      'How do I add a new category?',
      'Can I add custom fields like seedling count?',
      'How do I edit a category?',
    ],
    links: [
      { label: 'Categories', to: '/category-management' },
      { label: 'Members', to: '/members' },
      { label: 'Calendar', to: '/calendar' },
    ],
    roles: ['admin'],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/members'),
    title: 'Members',
    suggestions: [
      'How do I create a member account?',
      'How do I update a member details?',
      'How do I delete members?',
    ],
    links: [
      { label: 'Members', to: '/members' },
      { label: 'Categories', to: '/category-management' },
    ],
    roles: ['admin'],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/settings'),
    title: 'Settings',
    suggestions: [
      'How do I change the theme?',
      'Where is the logout button?',
      'How do I update notifications?',
    ],
    links: [
      { label: 'Settings', to: '/settings' },
      { label: 'Profile', to: '/profile' },
    ],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/profile'),
    title: 'Profile',
    suggestions: [
      'How do I update my profile info?',
      'How do I change my password?',
      'How do I upload a new avatar?',
    ],
    links: [
      { label: 'Edit Profile', to: '/account/edit' },
      { label: 'Change Password', to: '/change-password' },
      { label: 'Profile', to: '/profile' },
    ],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/account/edit'),
    title: 'Edit Profile',
    suggestions: [
      'How do I update my name and contact info?',
      'Can I change my blood type here?',
      'How do I upload a profile image?',
    ],
    links: [
      { label: 'Edit Profile', to: '/account/edit' },
      { label: 'Profile', to: '/profile' },
    ],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/change-password'),
    title: 'Change Password',
    suggestions: [
      'What do I need to change my password?',
      'Why does my new password not match?',
      'Where do I go after changing it?',
    ],
    links: [
      { label: 'Change Password', to: '/change-password' },
      { label: 'Profile', to: '/profile' },
    ],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/login'),
    title: 'Login',
    suggestions: [
      'How do I sign in?',
      'I forgot my password. What now?',
      'Why does login fail?',
    ],
    links: [
      { label: 'Login', to: '/login' },
      { label: 'Recruitment', to: '/recruitment' },
    ],
  },
  {
    match: ({ pathname }) => pathname.startsWith('/recruitment'),
    title: 'Recruitment',
    suggestions: [
      'How do I submit the recruitment form?',
      'What fields are required?',
      'How long does approval take?',
    ],
    links: [
      { label: 'Recruitment', to: '/recruitment' },
      { label: 'Login', to: '/login' },
    ],
  },
]

const DEFAULT_SUGGESTIONS = {
  title: 'KUSGAN Assistant',
  suggestions: [
    'How do I log in?',
    'How do I apply for recruitment?',
    'Where can I see the calendar?',
  ],
  links: [
    { label: 'Home', to: '/landing' },
    { label: 'Calendar', to: '/calendar' },
    { label: 'Recruitment', to: '/recruitment' },
    { label: 'Profile', to: '/profile' },
  ],
}

const buildResponse = (input, role) => {
  const text = String(input || '').toLowerCase()
  const response = (lines) => lines.map((line, index) => `${index + 1}. ${line}`).join('\n')

  if (role === 'member' && (text.includes('create event') || text.includes('add event'))) {
    return response([
      'Only admins can create events.',
      'Members can view events and notifications in the Calendar.',
    ])
  }
  if (role === 'member' && text.includes('report')) {
    return response([
      'Reports are for admins only.',
      'Members can view events and notifications in the Calendar.',
    ])
  }
  if (role === 'member' && (text.includes('category') || text.includes('categories'))) {
    return response([
      'Category management is for admins only.',
      'Members can view events in the Calendar.',
    ])
  }
  if (role === 'member' && (text.includes('members') || text.includes('management'))) {
    return response([
      'Member management is for admins only.',
      'Members can update their own profile and password.',
    ])
  }
  if (role === 'member' && (text.includes('attendance management') || text.includes('calendar management'))) {
    return response([
      'Attendance Management is for admins only.',
      'Members can Time In and Time Out in Attendance.',
    ])
  }

  if (text.includes('login') || text.includes('log in') || text.includes('sign in')) {
    return response([
      'Go to Login and enter your ID Number and Password.',
      'If you do not have an account, click Recruitment to apply.',
      'Accounts and temporary passwords are provided by the admin.',
      'You can change your password after you log in.',
    ])
  }
  if (text.includes('logout') || text.includes('log out') || text.includes('sign out')) {
    return response([
      'Open the sidebar footer and click Logout.',
      'It is beside the theme toggle.',
    ])
  }
  if (text.includes('theme') || text.includes('dark') || text.includes('light')) {
    return response([
      'Use the theme toggle in the sidebar footer.',
      'Click the sun/moon icon to switch Light or Dark.',
    ])
  }
  if (text.includes('attendance') || text.includes('time in') || text.includes('time out')) {
    return role === 'member'
      ? response([
          'Go to Attendance and tap Time In or Time Out.',
          'You can view your attendance records there.',
        ])
      : response([
          'Go to Attendance Management to edit attendance and view past records.',
          'Use Export PDF to download present members only.',
        ])
  }
  if (text.includes('event') || text.includes('calendar')) {
    return response([
      role === 'member'
        ? 'Go to Calendar to view events (read-only for members).'
        : 'Go to Calendar to view, add, update, or delete events.',
      role === 'member'
        ? 'You can see event details and schedules there.'
        : 'You can assign members and filter by title, content, address, or category.',
      'Switch between All Months and Event Months and navigate previous months.',
    ])
  }
  if (text.includes('calendar management') || text.includes('attendance management')) {
    return response([
      'Admins: Go to Attendance Management to track attendance for each day.',
      'You can edit Time In and Time Out and view previous records.',
      'Use Export PDF to download present members only.',
    ])
  }
  if (text.includes('report')) {
    return role === 'member'
      ? response([
          'Reports are only available to admins.',
          'You can view events and notifications in the Calendar instead.',
        ])
      : response([
          'Go to Reports to view Monthly, Quarterly, or Yearly reports.',
          'Use the export buttons to download CSV, PDF, or DOCS.',
          'Reports are categorized by event type.',
        ])
  }
  if (
    text.includes('update member') ||
    text.includes('edit member') ||
    text.includes('member details') ||
    text.includes('member profile') ||
    text.includes('update user') ||
    text.includes('edit user') ||
    text.includes('change details')
  ) {
    return role === 'member'
      ? response([
          'You can only edit your own account info and password.',
          'Go to Profile and use Manage to update your details.',
        ])
      : response([
          'Go to Members and click a member card to open details.',
          'Click Update, edit the fields, then Save Changes.',
        ])
  }
  if (text.includes('delete member')) {
    return role === 'member'
      ? response([
          'Only admins can delete members.',
          'You can update your own account info and password in Profile.',
        ])
      : response([
          'Go to Members and open the member details.',
          'Click Update, then Delete Member, then confirm.',
          'You can also select members on the list and click Delete selected.',
        ])
  }
  if (text.includes('search member') || (text.includes('search') && text.includes('member'))) {
    return role === 'member'
      ? response([
          'Member search is available to admins.',
          'You can view your own profile details in Profile.',
        ])
      : response([
          'Go to Members and use the Search box.',
          'You can filter by role and committee, then click a member to view details.',
        ])
  }
  if (text.includes('committee management') || text.includes('manage committee')) {
    return role === 'member'
      ? response([
          'Committee management is available to admins only.',
          'You can view your assigned committee in your Profile.',
        ])
      : response([
          'Go to Management → Committee Management.',
          'Use Add, Edit, or Delete to manage committees.',
        ])
  }
  if (text.includes('create member') || text.includes('create user') || text.includes('add member')) {
    return role === 'member'
      ? response([
          'Only admins can create member accounts.',
          'You can apply through Recruitment if you do not have an account.',
        ])
      : response([
          'Go to Members and use the Create Member form.',
          'Fill in Full Name, ID Number, Temporary Password, address, contact number, blood type, status, role, committee, and member since.',
          'Click Create Member to save.',
        ])
  }
  if (text.includes('member') || text.includes('committee')) {
    return role === 'member'
      ? response([
          'Member management is only available to admins.',
          'You can update your own profile and password.',
        ])
      : response([
          'Go to Members to manage users and committees.',
          'Use Search by name, email, or ID, then click a member to view details.',
        ])
  }
  if (text.includes('profile') || text.includes('avatar')) {
    return response([
      'Go to Profile and click Manage.',
      'Choose Account Info to update your details and profile image.',
      'Choose Change Password to update your password.',
    ])
  }
  if (text.includes('account info') || text.includes('edit account') || text.includes('edit profile')) {
    return response([
      'Go to Profile and click Manage.',
      'Choose Account Info.',
      'Update your details, then click Save Changes.',
    ])
  }
  if (text.includes('account info') || text.includes('manage account') || text.includes('manage button')) {
    return response([
      'Admin: Open your avatar to go to Profile.',
      'Click Manage, then Account Info to update profile details and image.',
    ])
  }
  if (text.includes('password')) {
    return response([
      'Open Profile and click Manage.',
      'Choose Change Password.',
      'Enter current password, new password, and confirm.',
    ])
  }
  if (text.includes('settings') || text.includes('notification')) {
    return response([
      'Go to Settings to update your preferences.',
      'You can also toggle the theme from the sidebar footer.',
    ])
  }
  if (text.includes('recruitment') || text.includes('apply') || text.includes('join') || text.includes('register')) {
    return response([
      'Go to Recruitment and fill out the form.',
      'Required fields: Full Name, Email, Contact Number, Address, Blood Type.',
      'Insurance can be N/A or Insured. If Insured, enter the year.',
      'Submit Application and wait for admin review.',
    ])
  }
  if (text.includes('services') || text.includes('partners')) {
    return response([
      'Go to Landing and open the Services section.',
      'You will see KVI services and the partner organizations at the top.',
    ])
  }
  if (text.includes('structure') || text.includes('board') || text.includes('organization')) {
    return response([
      'Go to Landing and open the Structure section.',
      'Click Board Organizational Structure to see the leaders.',
      'Click KUSGAN Organization Structure to view committees and members, then click a name to view details.',
    ])
  }
  if (text.includes('about') || text.includes('mission') || text.includes('vision') || text.includes('values') || text.includes('contact')) {
    return response([
      'Go to Landing and open the About section.',
      'You can see the Mission, Vision, Core Values, and Contact Details there.',
    ])
  }
  if (text.includes('category') || text.includes('categories') || text.includes('custom field')) {
    return role === 'member'
      ? response([
          'Category management is only available to admins.',
          'You can view events in the Calendar.',
        ])
      : response([
          'Go to Category Management to create or manage event categories.',
          'You can add custom fields per category (example: seedling count for mangrove events).',
        ])
  }
  if (text.includes('dashboard') || text.includes('activity') || text.includes('recent')) {
    return response([
      'Go to Dashboard and click Create Event to add an event.',
      'Use Recent Activity to open a specific event, or View All to see all created events.',
      'Event categories appear automatically after creation.',
    ])
  }
  if (text.includes('notification') || text.includes('notifications')) {
    return response([
      'Members: You can view events and notifications assigned by admins.',
      'Check Calendar for event schedules (read-only for members).',
    ])
  }
  if (text.includes('inbox') || text.includes('applicant') || text.includes('recruitment inbox')) {
    return role === 'member'
      ? response([
          'Recruitment Inbox is only available to admins.',
          'You can apply through the Recruitment form.',
        ])
      : response([
          'Go to Members and open Recruitment Inbox.',
          'Click Approve & Create Account or Reject Application.',
          'Approved applicants pre-fill the Create Member form.',
        ])
  }
  if (text.includes('management') || text.includes('create user') || text.includes('committee')) {
    return role === 'member'
      ? response([
          'Management features are only available to admins.',
          'You can update your own profile and password.',
        ])
      : response([
          'Go to Members to create users with full details and role.',
          'You can assign committee, status (active/inactive), and member since.',
          'Use Committee Management to add, edit, or delete committees.',
        ])
  }
  if (text.includes('theme') || text.includes('dark') || text.includes('light') || text.includes('logout')) {
    return response([
      'Use the theme toggle in the sidebar footer to switch Dark/Light.',
      'Click Logout beside it to sign out.',
    ])
  }
  if (text.includes('member') && text.includes('can')) {
    return response([
      'Members can view events and notifications, and view the calendar (read-only).',
      'Members can update their account info and password.',
      'Members can Time In and Time Out; only admins can edit attendance.',
    ])
  }
  if (text.includes('support') || text.includes('help')) {
    return response([
      'Tell me what you are trying to do, and I will guide you step-by-step.',
      'If it is account-related, an admin can also assist.',
    ])
  }

  return response([
    'I can help with login, recruitment, events, attendance, reports, and profile updates.',
    'What do you want to do right now?',
  ])
}

function ChatbotWidget() {
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role || 'guest'
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return null
    const buttonSize = 48
    const offset = 24
    return {
      x: Math.max(0, window.innerWidth - buttonSize - offset),
      y: Math.max(0, window.innerHeight - buttonSize - offset),
    }
  })
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const dragStateRef = useRef({
    isDragging: false,
    hasMoved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  })
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! I can answer questions about the KUSGAN Volunteer System and guide you to the right page.',
    },
  ])

  const pageConfig = useMemo(() => {
    const matched = PAGE_SUGGESTIONS.find(item => item.match({ pathname, hash }))
    if (!matched) return DEFAULT_SUGGESTIONS
    if (matched.roles && !matched.roles.includes(role)) return DEFAULT_SUGGESTIONS
    return matched
  }, [pathname, hash, role])

  const roleSuggestions = pageConfig.suggestionsByRole?.[role] || pageConfig.suggestions

  const roleLinks = useMemo(() => {
    const baseLinks = pageConfig.linksByRole?.[role] || pageConfig.links || []
    if (role === 'admin') return baseLinks
    // Hide admin-only destinations for members and guests.
    const adminOnly = new Set([
      '/attendance-management',
      '/report',
      '/category-management',
      '/members',
    ])
    return baseLinks.filter(link => !adminOnly.has(link.to))
  }, [pageConfig.links, pageConfig.linksByRole, role])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => {
      setPosition(prev => {
        if (!prev) return prev
        const buttonSize = 48
        const offset = 24
        const nextX = Math.max(0, window.innerWidth - buttonSize - offset)
        const nextY = Math.min(prev.y, Math.max(0, window.innerHeight - buttonSize))
        return { x: nextX, y: nextY }
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const updatePosition = (clientX, clientY) => {
    const buttonSize = 48
    const nextX = Math.min(Math.max(0, clientX), Math.max(0, window.innerWidth - buttonSize))
    const nextY = Math.min(Math.max(0, clientY), Math.max(0, window.innerHeight - buttonSize))
    setPosition({ x: nextX, y: nextY })
  }

  const handlePointerDown = (event) => {
    if (!position) return
    const dragState = dragStateRef.current
    dragState.pointerId = event.pointerId
    dragState.isDragging = true
    dragState.hasMoved = false
    dragState.startX = event.clientX
    dragState.startY = event.clientY
    dragState.originX = position.x
    dragState.originY = position.y
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current
    if (!dragState.isDragging || dragState.pointerId !== event.pointerId) return
    const deltaX = event.clientX - dragState.startX
    const deltaY = event.clientY - dragState.startY
    const distance = Math.hypot(deltaX, deltaY)
    if (!dragState.hasMoved && distance < 6) return
    dragState.hasMoved = true
    updatePosition(dragState.originX + deltaX, dragState.originY + deltaY)
  }

  const handlePointerUp = (event) => {
    const dragState = dragStateRef.current
    if (dragState.pointerId !== event.pointerId) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    dragState.isDragging = false
    dragState.pointerId = null
    if (!dragState.hasMoved) {
      setIsOpen(prev => !prev)
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    if (!messagesEndRef.current) return
    const scrollToBottom = () => {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
    const frame = window.requestAnimationFrame(scrollToBottom)
    return () => window.cancelAnimationFrame(frame)
  }, [messages, isTyping, isOpen])

  const sendMessage = (text) => {
    const cleaned = String(text || '').trim()
    if (!cleaned) return

    const responseText = buildResponse(cleaned, role)
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', text: cleaned }])
    setInput('')
    setIsTyping(true)

    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current)
    typingTimerRef.current = window.setTimeout(() => {
      setMessages(prev => [...prev, { id: `bot-${Date.now() + 1}`, role: 'assistant', text: responseText }])
      setIsTyping(false)
    }, 700)
  }

  const chatPanelStyle = useMemo(() => {
    if (!position || typeof window === 'undefined') return undefined
    const gutter = 16
    const panelWidth = window.innerWidth >= 768 ? 360 : Math.min(320, window.innerWidth - gutter * 2)
    const panelHeight = Math.min(520, window.innerHeight - gutter * 2)
    const buttonSize = 48
    const spaceRight = window.innerWidth - (position.x + buttonSize)
    const placeLeft = spaceRight < panelWidth + gutter
    let left = placeLeft ? position.x - panelWidth - gutter : position.x + buttonSize + gutter
    left = Math.max(gutter, Math.min(left, window.innerWidth - panelWidth - gutter))

    const centerY = position.y + buttonSize / 2
    let top = centerY - panelHeight / 2
    top = Math.max(gutter, Math.min(top, window.innerHeight - panelHeight - gutter))

    return {
      left: `${left}px`,
      top: `${top}px`,
      height: `${panelHeight}px`,
      width: `${panelWidth}px`,
    }
  }, [position])

  return (
    <div
      className="fixed z-50"
      style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
    >
      {isOpen && (
        <div
          className="fixed rounded-2xl border border-red-600 bg-white shadow-2xl dark:bg-zinc-900 flex flex-col"
          style={chatPanelStyle}
        >
          <div className="flex items-center justify-between border-b border-red-600/30 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{pageConfig.title}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Ask anything about the system.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-600/50 text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-100'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:120ms]" />
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-red-600/30 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Quick actions</p>
              <button
                type="button"
                onClick={() => setShowSuggestions(prev => !prev)}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                {showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {roleLinks.map(link => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => {
                    if (link.state) {
                      navigate(link.to, { state: link.state })
                    } else {
                      navigate(link.to)
                    }
                  }}
                  className="rounded-full border border-red-600/50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800"
                >
                  {link.label}
                </button>
              ))}
            </div>
            {showSuggestions && (
              <div className="flex flex-wrap gap-2">
                {roleSuggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-xl bg-zinc-100 px-3 py-1 text-xs text-gray-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') sendMessage(input)
                }}
                placeholder="Type your question..."
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-red-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white hover:bg-red-700"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 touch-none"
        aria-label="Open chat"
      >
        <MessageCircle size={20} />
      </button>
    </div>
  )
}

export default ChatbotWidget
