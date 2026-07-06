import { create } from 'zustand'
import { api } from '../lib/api'
export const useAuth = create((set) => ({
  user: null, token: localStorage.getItem('messa_token')||null, loading: true,
  init: async () => {
    const t = localStorage.getItem('messa_token')
    if (!t) { set({loading:false}); return }
    try { const {data}= await api.get('/auth/me'); set({user:data, token:t, loading:false}) }
    catch { localStorage.removeItem('messa_token'); set({user:null, token:null, loading:false})}
  },
  login: async (email,password) => {
    const {data} = await api.post('/auth/login',{email,password})
    localStorage.setItem('messa_token', data.token)
    set({user:data.user, token:data.token}); return data
  },
  register: async (payload) => {
    const {data} = await api.post('/auth/register', payload)
    if (data.token) { localStorage.setItem('messa_token', data.token); set({user:data.user, token:data.token})}
    return data
  },
  logout: ()=> { localStorage.removeItem('messa_token'); set({user:null, token:null})}
}))
