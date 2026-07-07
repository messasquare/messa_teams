// frontend/src/store/auth.js
import { create } from 'zustand'
import { authAPI } from '../lib/api'
import { initSocket, disconnectSocket } from '../lib/socket'
import { clearCache } from '../lib/api'

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('messa_token'),
  loading: true,
  socketConnected: false,

  setUser: (user) => set({ user }),
  setSocketConnected: (connected) => set({ socketConnected: connected }),

  init: async () => {
    const token = localStorage.getItem('messa_token')
    if (!token) {
      set({ loading: false })
      return
    }
    try {
      const res = await authAPI.me()
      set({ user: res.data, loading: false })
      initSocket(token)
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => Notification.requestPermission(), 2000)
      }
    } catch {
      localStorage.removeItem('messa_token')
      set({ user: null, token: null, loading: false })
    }
  },

  login: async (email, password) => {
    const res = await authAPI.login(email, password)
    const { token, user } = res.data
    localStorage.setItem('messa_token', token)
    set({ token, user })
    initSocket(token)
    return res.data
  },

  register: async (data) => {
    const res = await authAPI.register(data)
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
    clearCache()
    set({ user: null, token: null })
  },
}))

export default useAuthStore