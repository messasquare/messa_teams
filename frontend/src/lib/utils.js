// frontend/src/lib/utils.js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isYesterday, formatDistanceToNow, isThisWeek, isThisYear } from 'date-fns'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// ─── Time formatting ───
export function formatTime(dateStr) {
  if (!dateStr) return ''
  return format(new Date(dateStr), 'HH:mm')
}

export function formatSmartDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  if (isThisWeek(d)) return format(d, 'EEEE')
  if (isThisYear(d)) return format(d, 'dd MMM')
  return format(d, 'dd MMM yyyy')
}

export function formatChatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return `Yesterday`
  if (isThisWeek(d)) return format(d, 'EEE')
  return format(d, 'dd/MM/yy')
}

export function formatRelative(dateStr) {
  if (!dateStr) return ''
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return ''
  }
}

export function formatFullDate(dateStr) {
  if (!dateStr) return ''
  return format(new Date(dateStr), 'dd MMM yyyy, HH:mm')
}

// ─── Avatar utils ───
export function getInitials(name = '') {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((w) => w[0]?.toUpperCase() || '').join('') || '?'
}

const AVATAR_GRADIENTS = [
  'from-red-500 to-pink-600',
  'from-blue-500 to-cyan-600',
  'from-green-500 to-emerald-600',
  'from-purple-500 to-indigo-600',
  'from-yellow-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-purple-600',
  'from-teal-500 to-green-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-blue-600',
]

export function getAvatarGradient(name = '') {
  if (!name) return AVATAR_GRADIENTS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

// ─── File utils ───
export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function getFileIcon(type = '', name = '') {
  const ext = name.split('.').pop()?.toLowerCase()
  if (type?.startsWith('image')) return '🖼️'
  if (type?.startsWith('video')) return '🎬'
  if (type?.startsWith('audio') || type === 'voice') return '🎵'
  if (['pdf'].includes(ext)) return '📄'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['xls', 'xlsx'].includes(ext)) return '📊'
  if (['ppt', 'pptx'].includes(ext)) return '📽️'
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️'
  return '📎'
}

// ─── Role utils ───
export function getRoleBadgeColor(role) {
  const map = {
    founder: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    co_founder: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    core_team: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    volunteer: 'bg-green-500/15 text-green-400 border-green-500/30',
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

// ─── Notification helpers ───
let audioCtx = null
export function playNotificationSound(type = 'message') {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)

    if (type === 'message') {
      osc.frequency.setValueAtTime(880, audioCtx.currentTime)
      osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.08)
    } else if (type === 'call') {
      osc.frequency.setValueAtTime(440, audioCtx.currentTime)
      osc.frequency.setValueAtTime(550, audioCtx.currentTime + 0.15)
      osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.3)
    }

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.3)
  } catch {}
}

export function requestDesktopNotification(title, body, icon) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        silent: true,
      })
      setTimeout(() => n.close(), 5000)
      return n
    } catch {}
  }
}

// ─── Debounce ───
export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ─── Throttle ───
export function throttle(fn, limit = 300) {
  let inThrottle
  return (...args) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// ─── Text helpers ───
export function truncate(str, n = 50) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function linkify(text) {
  if (!text) return text
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noreferrer" class="text-messa-red hover:underline">$1</a>')
}

// ─── Conversation helpers ───
export function buildConversationId(userId, otherId) {
  const ids = [String(userId), String(otherId)].sort()
  return `dm:${ids[0]}:${ids[1]}`
}

export function parseConversationId(convId) {
  if (!convId) return null
  if (convId.startsWith('group:')) {
    return { type: 'group', id: convId.slice(6) }
  }
  if (convId.startsWith('dm:')) {
    const parts = convId.slice(3).split(':')
    return { type: 'dm', ids: parts }
  }
  return null
}

// ─── Storage helpers ───
export function storage(key, defaultValue = null) {
  return {
    get: () => {
      try {
        const v = localStorage.getItem(key)
        return v ? JSON.parse(v) : defaultValue
      } catch {
        return defaultValue
      }
    },
    set: (value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {}
    },
    remove: () => {
      try {
        localStorage.removeItem(key)
      } catch {}
    },
  }
}

// ─── Sleep ───
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}