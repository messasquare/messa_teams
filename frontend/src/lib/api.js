// frontend/src/lib/api.js
import axios from 'axios'
import { toast } from 'sonner'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('messa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const message = err.response?.data?.error || err.message || 'Something went wrong'

    if (status === 401) {
      localStorage.removeItem('messa_token')
      window.location.href = '/auth'
    } else if (status === 403) {
      toast.error('You don\'t have permission to do this')
    } else if (status === 429) {
      toast.error('Too many requests. Please slow down.')
    } else if (status >= 500) {
      toast.error('Server error. Please try again.')
    }

    return Promise.reject(err)
  }
)

export default api