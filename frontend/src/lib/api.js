import axios from 'axios'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const api = axios.create({ baseURL: API_URL + '/api' })
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('messa_token')
  if (t) cfg.headers.Authorization = 'Bearer ' + t
  return cfg
})
export const uploadFile = async (file) => {
  const fd = new FormData(); fd.append('file', file)
  const { data } = await api.post('/upload', fd, { headers: {'Content-Type':'multipart/form-data'}})
  return data
}
export const API_BASE = API_URL
