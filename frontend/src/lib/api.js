// frontend/src/lib/api.js
import axios from 'axios'
import { toast } from 'sonner'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('messa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor - error handling
let isRedirecting = false
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const message = err.response?.data?.error || err.response?.data?.message || err.message

    if (status === 401 && !isRedirecting) {
      isRedirecting = true
      localStorage.removeItem('messa_token')
      toast.error('Session expired. Please sign in again.')
      setTimeout(() => {
        window.location.href = '/auth'
        isRedirecting = false
      }, 500)
    } else if (status === 403) {
      toast.error(message || "You don't have permission for this action")
    } else if (status === 429) {
      toast.error('Slow down! Too many requests')
    } else if (status >= 500) {
      toast.error('Server error. Please try again in a moment.')
    } else if (err.code === 'ECONNABORTED') {
      toast.error('Request timeout. Check your connection.')
    } else if (!err.response) {
      toast.error('Network error. Are you online?')
    }

    return Promise.reject(err)
  }
)

// ─── Simple in-memory cache ───
const cache = new Map()
const CACHE_TTL = 30000 // 30s

export function cachedGet(url, params = {}, ttl = CACHE_TTL) {
  const key = url + JSON.stringify(params)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.time < ttl) {
    return Promise.resolve(cached.data)
  }
  return api.get(url, { params }).then((res) => {
    cache.set(key, { data: res, time: Date.now() })
    return res
  })
}

export function invalidateCache(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key)
  }
}

export function clearCache() {
  cache.clear()
}

// ─── Wrapped API methods ───
export const authAPI = {
  me: () => api.get('/api/auth/me'),
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (data) => api.post('/api/auth/register', data),
}

export const chatAPI = {
  getMessages: (conversationId) =>
    api.get('/api/chat/messages', { params: { conversation_id: conversationId } }),
  send: (data) => api.post('/api/chat/send', data),
}

export const groupsAPI = {
  list: () => cachedGet('/api/groups', {}, 60000),
  create: (data) => {
    invalidateCache('/api/groups')
    return api.post('/api/groups', data)
  },
}

export const tasksAPI = {
  list: () => api.get('/api/tasks'),
  create: (data) => api.post('/api/tasks', data),
  updateStatus: (id, status) => api.post(`/api/tasks/${id}/status`, { status }),
}

export const meetingsAPI = {
  list: () => api.get('/api/meetings'),
  create: (data) => api.post('/api/meetings', data),
}

export const announcementsAPI = {
  list: () => api.get('/api/announcements'),
  create: (data) => api.post('/api/announcements', data),
}

export const adminAPI = {
  pendingUsers: () => api.get('/api/admin/pending_users'),
  users: (q = '') => cachedGet('/api/admin/users', { q }, 60000),
  approveUser: (user_id, role) => {
    invalidateCache('/api/admin/users')
    return api.post('/api/admin/approve_user', { user_id, role })
  },
  updatePermissions: (user_id, permissions) => {
    invalidateCache('/api/admin/users')
    return api.post('/api/admin/update_permissions', { user_id, permissions })
  },
}

export const uploadAPI = {
  upload: (file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (p) => {
        if (onProgress) onProgress(Math.round((p.loaded / p.total) * 100))
      },
    })
  },
}

export default api