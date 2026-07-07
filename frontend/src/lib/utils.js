// frontend/src/lib/utils.js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return format(d, 'HH:mm')
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'dd MMM yyyy')
}

export function formatMessageDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`
  return format(d, 'dd/MM/yyyy HH:mm')
}

export function formatRelative(dateStr) {
  if (!dateStr) return ''
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('')
}

export function getAvatarColor(name = '') {
  const colors = [
    'from-red-600 to-red-800',
    'from-blue-600 to-blue-800',
    'from-green-600 to-green-800',
    'from-purple-600 to-purple-800',
    'from-yellow-600 to-yellow-800',
    'from-pink-600 to-pink-800',
    'from-indigo-600 to-indigo-800',
    'from-teal-600 to-teal-800',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function getRoleBadgeColor(role) {
  const map = {
    founder: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    co_founder: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    core_team: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    volunteer: 'bg-green-500/20 text-green-400 border-green-500/30',
  }
  return map[role] || 'bg-muted text-text-secondary border-border'
}

export function getRoleLabel(role) {
  const map = {
    founder: 'Founder',
    co_founder: 'Co-Founder',
    core_team: 'Core Team',
    volunteer: 'Volunteer',
  }
  return map[role] || role
}

export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToConstantValue(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {}
}

export function requestDesktopNotification(title, body, icon) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon })
  }
}