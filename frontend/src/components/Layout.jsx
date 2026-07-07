// frontend/src/components/Layout.jsx
import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  MessageSquare, CheckSquare, Video, Megaphone, Shield,
  LogOut, Bell, Settings, ChevronLeft, ChevronRight,
  Menu, X, Wifi, WifiOff
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import useAuthStore from '../store/auth'
import Avatar from './Avatar'
import { cn, getRoleBadgeColor, getRoleLabel } from '../lib/utils'
import { getSocket, onNewMessage } from '../lib/socket'
import { playNotificationSound, requestDesktopNotification } from '../lib/utils'
import logo from '../assets/logo.png'

const NAV_ITEMS = [
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/meetings', icon: Video, label: 'Meetings' },
  { path: '/announcements', icon: Megaphone, label: 'Announcements' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unread, setUnread] = useState({})
  const [connected, setConnected] = useState(true)
  const [notifications, setNotifications] = useState([])

  const isAdmin = ['founder', 'co_founder'].includes(user?.role)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    setConnected(socket.connected)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [])

  useEffect(() => {
    const off = onNewMessage((msg) => {
      const isOnChatPage = location.pathname === '/chat'
      if (!isOnChatPage) {
        setUnread(prev => ({
          ...prev,
          chat: (prev.chat || 0) + 1
        }))
        playNotificationSound()
        requestDesktopNotification(
          `New message`,
          msg.text || 'Sent an attachment',
          '/favicon.ico'
        )
      }
    })
    return off
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname === '/chat') {
      setUnread(prev => ({ ...prev, chat: 0 }))
    }
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/auth')
    toast.success('Logged out successfully')
  }

  const navItems = isAdmin
    ? [...NAV_ITEMS, { path: '/admin', icon: Shield, label: 'Admin' }]
    : NAV_ITEMS

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-border',
        collapsed && 'px-3 justify-center'
      )}>
        <img src={logo} alt="MESSA" className="w-8 h-8 object-contain flex-shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <h1 className="font-bold text-white tracking-tight whitespace-nowrap">
                MESSA TEAMS
              </h1>
              <p className="text-xs text-text-muted">by MESSA SQUARE</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Connection Status */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-2',
        collapsed && 'justify-center px-2'
      )}>
        {connected ? (
          <Wifi size={12} className="text-online" />
        ) : (
          <WifiOff size={12} className="text-messa-red animate-pulse" />
        )}
        {!collapsed && (
          <span className={cn(
            'text-xs',
            connected ? 'text-online' : 'text-messa-red'
          )}>
            {connected ? 'Connected' : 'Reconnecting...'}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          const badge = label === 'Chat' ? unread.chat : null

          return (
            <button
              key={path}
              onClick={() => {
                navigate(path)
                setMobileOpen(false)
              }}
              className={cn(
                'sidebar-item w-full',
                active && 'active',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <div className="relative">
                <Icon size={18} className="flex-shrink-0" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 badge text-[10px] min-w-[16px] h-4 flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {!collapsed && (
                <span className="flex-1 text-left">{label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className={cn(
        'border-t border-border p-3',
        collapsed ? 'flex flex-col items-center gap-2' : ''
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors">
            <Avatar name={user?.name} size="sm" online />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-md border font-medium',
                getRoleBadgeColor(user?.role)
              )}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-icon flex-shrink-0"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <>
            <Avatar name={user?.name} size="sm" online />
            <button onClick={handleLogout} className="btn-icon" title="Logout">
              <LogOut size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-screen flex bg-dark overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden md:flex flex-col bg-card border-r border-border flex-shrink-0 relative"
      >
        <SidebarContent />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-card border border-border
                     rounded-full flex items-center justify-center hover:bg-muted transition-colors z-10"
        >
          {collapsed
            ? <ChevronRight size={12} className="text-text-secondary" />
            : <ChevronLeft size={12} className="text-text-secondary" />
          }
        </button>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-icon"
          >
            <Menu size={20} />
          </button>
          <img src={logo} alt="MESSA" className="w-7 h-7 object-contain" />
          <span className="font-bold text-white">MESSA TEAMS</span>
        </div>

        {/* Page Content */}
        <main className="flex-1 min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}