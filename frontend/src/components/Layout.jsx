// frontend/src/components/Layout.jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  MessageSquare, CheckSquare, Video, Megaphone, Shield,
  LogOut, ChevronLeft, ChevronRight, Menu, X,
  Wifi, WifiOff, Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '../store/auth'
import Avatar from './Avatar'
import { cn, getRoleBadgeColor, getRoleLabel, storage, playNotificationSound, requestDesktopNotification } from '../lib/utils'
import { getSocket, onNewMessage, onConnect, onDisconnect, isConnected } from '../lib/socket'
import logo from '../assets/logo.png'

const collapseStorage = storage('messa_sidebar_collapsed', false)

const BASE_NAV = [
  { path: '/chat', icon: MessageSquare, label: 'Messages' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/meetings', icon: Video, label: 'Meetings' },
  { path: '/announcements', icon: Megaphone, label: 'Announcements' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(collapseStorage.get())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadChat, setUnreadChat] = useState(0)
  const [connected, setConnected] = useState(isConnected())

  const isAdmin = ['founder', 'co_founder'].includes(user?.role)

  const navItems = useMemo(
    () => (isAdmin ? [...BASE_NAV, { path: '/admin', icon: Shield, label: 'Admin' }] : BASE_NAV),
    [isAdmin]
  )

  // Persist collapse
  useEffect(() => {
    collapseStorage.set(collapsed)
  }, [collapsed])

  // Socket status
  useEffect(() => {
    const offConnect = onConnect(() => setConnected(true))
    const offDisconnect = onDisconnect(() => setConnected(false))
    return () => {
      offConnect()
      offDisconnect()
    }
  }, [])

  // Global unread messages
  useEffect(() => {
    const off = onNewMessage((msg) => {
      const isOnChatPage = location.pathname === '/chat'
      if (!isOnChatPage && msg.sender_id !== user?._id) {
        setUnreadChat((n) => n + 1)
        playNotificationSound('message')
        requestDesktopNotification(
          msg.sender_name || 'New Message',
          msg.text?.slice(0, 100) || 'Sent an attachment'
        )
      }
    })
    return off
  }, [location.pathname, user?._id])

  // Reset unread on chat page
  useEffect(() => {
    if (location.pathname === '/chat') {
      setUnreadChat(0)
    }
  }, [location.pathname])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/auth')
    toast.success('Signed out successfully')
  }, [logout, navigate])

  const handleNav = useCallback(
    (path) => {
      navigate(path)
      setMobileOpen(false)
    },
    [navigate]
  )

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-border', collapsed && 'justify-center px-2')}>
        <img src={logo} alt="MESSA" className="w-9 h-9 object-contain flex-shrink-0" />
        {!collapsed && (
          <div className="min-w-0 animate-fade-in">
            <h1 className="font-black text-white text-sm tracking-tight leading-tight">
              MESSA <span className="text-messa-red">TEAMS</span>
            </h1>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">by MESSA SQUARE</p>
          </div>
        )}
      </div>

      {/* Connection */}
      <div className={cn('flex items-center gap-2 px-4 py-2', collapsed && 'justify-center px-2')}>
        <div className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-online animate-pulse' : 'bg-messa-red animate-pulse')} />
        {!collapsed && (
          <span className={cn('text-[11px] font-medium', connected ? 'text-online' : 'text-messa-red')}>
            {connected ? 'Online' : 'Reconnecting...'}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          const badge = label === 'Messages' ? unreadChat : null

          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className={cn('sidebar-item', active && 'active', collapsed && 'justify-center px-2')}
              title={collapsed ? label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {badge > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1.5 -right-1.5 bg-messa-red text-white text-[9px] font-bold',
                      'min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 leading-none border-2 border-card'
                    )}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {!collapsed && <span className="flex-1 text-left">{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-border p-2">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted transition-colors">
            <Avatar name={user?.name} size="sm" online />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider', getRoleBadgeColor(user?.role))}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
            <button onClick={handleLogout} className="btn-icon-sm" title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <Avatar name={user?.name} size="sm" online />
            <button onClick={handleLogout} className="btn-icon-sm" title="Sign out">
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-screen flex bg-dark overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-card border-r border-border flex-shrink-0 relative transition-[width] duration-200 ease-out',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarInner />

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center
                     hover:bg-muted hover:border-messa-red/40 transition-all z-10 shadow-md"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={12} className="text-text-secondary" /> : <ChevronLeft size={12} className="text-text-secondary" />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 md:hidden animate-slide-in-left">
            <SidebarInner />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)} className="btn-icon">
            <Menu size={20} />
          </button>
          <img src={logo} alt="MESSA" className="w-7 h-7 object-contain" />
          <span className="font-bold text-white text-sm">
            MESSA <span className="text-messa-red">TEAMS</span>
          </span>
          <div className="ml-auto">
            <div className={cn('w-2 h-2 rounded-full', connected ? 'bg-online' : 'bg-messa-red animate-pulse')} />
          </div>
        </div>

        <main className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}