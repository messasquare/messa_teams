// frontend/src/store/auth.js
import { create } from 'zustand'
import api from '../lib/api'
import { initSocket, disconnectSocket } from '../lib/socket'

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('messa_token'),
  loading: true,
  onlineUsers: new Set(),

  setUser: (user) => set({ user }),

  init: async () => {
    const token = localStorage.getItem('messa_token')
    if (!token) {
      set({ loading: false })
      return
    }
    try {
      const res = await api.get('/api/auth/me')
      set({ user: res.data, loading: false })
      initSocket(token)
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    } catch {
      localStorage.removeItem('messa_token')
      set({ user: null, token: null, loading: false })
    }
  },

  login: async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { token, user } = res.data
    localStorage.setItem('messa_token', token)
    set({ token, user })
    initSocket(token)
    return res.data
  },

  register: async (data) => {
    const res = await api.post('/api/auth/register', data)
    if (res.data.token) {
      localStorage.setItem('messa_token', res.data.token)
      set({ token: res.data.token, user: res.data.user })
      initSocket(res.data.token)
    }
    return res.data
  },

  logout: () => {
    localStorage.removeItem('messa_token')
    disconnectSocket()
    set({ user: null, token: null })
  },

  updateOnlineUsers: (users) => set({ onlineUsers: new Set(users) }),
  addOnlineUser: (uid) => set(s => ({ onlineUsers: new Set([...s.onlineUsers, uid]) })),
  removeOnlineUser: (uid) => set(s => {
    const next = new Set(s.onlineUsers)
    next.delete(uid)
    return { onlineUsers: next }
  }),
}))

export default useAuthStore