import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, Send, X } from 'lucide-react'

const PAGE_SUGGESTIONS = [
  {
    match: pathname => pathname.startsWith('/calendar'),
    title: 'Calendar & Events',
    suggestions: [
      'How do I create an event?',
      'How can I edit or delete an event?',
      'Can I view events in list mode?',
    ],
    links: [
      { label: 'Create Event', to: '/calendar' },
      { label: 'Event List', to: '/events' },
    ],
  },
  {
    match: pathname => pathname.startsWith('/attendance-management'),
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
  },
  {
    match: pathname => pathname.startsWith('/attendance'),
    title: 'Attendance',
    suggestions: [
      'How do I time in for today?',
      'Where can I see my attendance stats?',
      'How do I report a mistake?',
    ],
    links: [
      { label: 'Attendance', to: '/attendance' },
      { label: 'Profile', to: '/profile' },
    ],
  },
  {
    match: pathname => pathname.startsWith('/report'),
    title: 'Reports',
    suggestions: [
      'How do I export a report?',
      'How do I filter by date range?',
      'What does each category mean?',
    ],
    links: [
      { label: 'Reports', to: '/report' },
      { label: 'Dashboard', to: '/' },
    ],
  },
  {
    match: pathname => pathname.startsWith('/members'),
    title: 'Members',
    suggestions: [
      'How do I add a member?',
      'How can I edit a member profile?',
      'How do I delete or reassign a member?',
    ],
    links: [
      { label: 'Members', to: '/members' },
      { label: 'Settings', to: '/settings' },
    ],
  },
  {
    match: pathname => pathname.startsWith('/settings'),
    title: 'Settings',
    suggestions: [
      'How do I change the theme?',
      'Where do I change language?',
      'How do I update notifications?',
    ],
    links: [
      { label: 'Settings', to: '/settings' },
      { label: 'Profile', to: '/profile' },
    ],
  },
  {
    match: pathname => pathname.startsWith('/profile'),
    title: 'Profile',
    suggestions: [
      'How do I update my profile info?',
      'How do I change my password?',
      'How do I upload a new avatar?',
    ],
    links: [
      { label: 'Edit Profile', to: '/account/edit' },
      { label: 'Change Password', to: '/change-password' },
    ],
  },
  {
    match: pathname => pathname.startsWith('/login'),
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
    match: pathname => pathname.startsWith('/recruitment'),
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
  {
    match: pathname => pathname.startsWith('/landing'),
    title: 'Welcome',
    suggestions: [
      'How do I join KUSGAN?',
      'Where can I learn about programs?',
      'How do I sign in?',
    ],
    links: [
      { label: 'Login', to: '/login' },
      { label: 'Recruitment', to: '/recruitment' },
    ],
  },
]

const DEFAULT_SUGGESTIONS = {
  title: 'KUSGAN Assistant',
  suggestions: [
    'How do I create an event?',
    'How do I change my password?',
    'How do I update my profile?',
  ],
  links: [
    { label: 'Dashboard', to: '/' },
    { label: 'Calendar', to: '/calendar' },
    { label: 'Login', to: '/login' },
  ],
}

const buildResponse = (input) => {
  const text = String(input || '').toLowerCase()

  if (text.includes('login') || text.includes('sign in')) {
    return 'Go to the Login page and enter your ID number and password. If you cannot sign in, double-check your ID number and password or contact an admin.'
  }
  if (text.includes('logout') || text.includes('sign out')) {
    return 'Use the logout icon beside the theme toggle in the sidebar footer to sign out.'
  }
  if (text.includes('theme') || text.includes('dark') || text.includes('light')) {
    return 'Toggle the theme using the sun/moon button in the sidebar footer.'
  }
  if (text.includes('attendance')) {
    return 'Members can open Attendance to time in/out and view stats. Admins manage attendance in Attendance Management.'
  }
  if (text.includes('event') || text.includes('calendar')) {
    return 'Open Calendar to create, edit, and review events. Use the Event List view for a list-only format.'
  }
  if (text.includes('report')) {
    return 'Reports are available to admins. You can filter by date range and export as CSV/PDF/DOC.'
  }
  if (text.includes('member') || text.includes('committee')) {
    return 'Admins can manage members, committees, and roles in Members Management.'
  }
  if (text.includes('profile') || text.includes('avatar')) {
    return 'Open your Profile to update your avatar and personal info. Use Edit Account for details.'
  }
  if (text.includes('password')) {
    return 'Go to Change Password from your profile to update your password.'
  }
  if (text.includes('settings') || text.includes('language') || text.includes('notification')) {
    return 'Settings lets you change language, theme, and notification preferences.'
  }
  if (text.includes('recruitment') || text.includes('join') || text.includes('register')) {
    return 'Use the Recruitment form to apply. Fill out all required fields and submit.'
  }
  if (text.includes('support') || text.includes('help') || text.includes('contact')) {
    return 'If you need help beyond this assistant, please contact an admin for account or data issues.'
  }

  return 'I can help with navigation, events, attendance, profile, settings, and reports. Try one of the suggested questions or use the quick links.'
}

function ChatbotWidget() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
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
      text: 'Hi! I can answer questions about this system and guide you to the right page.',
    },
  ])

  const pageConfig = useMemo(() => {
    return PAGE_SUGGESTIONS.find(item => item.match(pathname)) || DEFAULT_SUGGESTIONS
  }, [pathname])

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

  const sendMessage = (text) => {
    const cleaned = String(text || '').trim()
    if (!cleaned) return

    const responseText = buildResponse(cleaned)
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
    const panelWidth = window.innerWidth >= 768 ? 360 : 320
    const panelHeight = 520
    const buttonSize = 48
    const gutter = 36

    const spaceRight = window.innerWidth - (position.x + buttonSize)
    const placeLeft = spaceRight < panelWidth + gutter
    const left = placeLeft ? position.x - panelWidth - gutter : position.x + buttonSize + gutter

    const centerY = position.y + buttonSize / 2
    let top = centerY - panelHeight / 2
    top = Math.max(gutter, Math.min(top, window.innerHeight - panelHeight - gutter))

    return {
      left: `${left}px`,
      top: `${top}px`,
    }
  }, [position])

  return (
    <div
      className="fixed z-50"
      style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
    >
      {isOpen && (
        <div
          className="fixed w-[320px] md:w-[360px] rounded-2xl border border-red-600 bg-white shadow-2xl dark:bg-zinc-900"
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

          <div className="max-h-[260px] overflow-y-auto px-4 py-3 space-y-3">
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
              {pageConfig.links.map(link => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => navigate(link.to)}
                  className="rounded-full border border-red-600/50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800"
                >
                  {link.label}
                </button>
              ))}
            </div>
            {showSuggestions && (
              <div className="flex flex-wrap gap-2">
                {pageConfig.suggestions.map(suggestion => (
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
