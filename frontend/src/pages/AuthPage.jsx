import { useState } from 'react'
import { useAuth } from '../store/auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import logo from '../assets/logo.png'
export default function AuthPage(){
  const [mode,setMode] = useState('login')
  const [form,setForm] = useState({name:'',email:'',password:'',role:'volunteer'})
  const {login, register} = useAuth()
  const nav = useNavigate()
  const submit = async e => {
    e.preventDefault()
    try {
      if (mode==='login'){ await login(form.email, form.password); nav('/chat')}
      else {
        const res = await register(form)
        if (res.pending) { toast.info('Account submitted. Wait for Founder approval.'); setMode('login') }
        else nav('/chat')
      }
    } catch(err){ toast.error(err.response?.data?.error || 'Failed') }
  }
  return <div className="min-h-screen flex items-center justify-center bg-messa-dark">
    <div className="w-full max-w-sm bg-messa-card border border-zinc-800 rounded-2xl p-7 shadow-xl">
      <div className="flex items-center gap-3 mb-5"><img src={logo} className="h-10"/><div><div className="font-extrabold text-xl tracking-wide">MESSA TEAMS</div><div className="text-xs text-zinc-400">MESSA SQUARE</div></div></div>
      <div className="flex gap-4 text-sm mb-4 border-b border-zinc-800">
        <button onClick={()=>setMode('login')} className={mode==='login'?'text-white border-b-2 border-messa-red pb-2':'text-zinc-400 pb-2'}>Login</button>
        <button onClick={()=>setMode('register')} className={mode==='register'?'text-white border-b-2 border-messa-red pb-2':'text-zinc-400 pb-2'}>Register</button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode==='register' && <>
          <input placeholder="Full name" className="w-full bg-messa-muted rounded-lg px-3 py-2 outline-none" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
          <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="w-full bg-messa-muted rounded-lg px-3 py-2">
            <option value="volunteer">Volunteer</option>
            <option value="core">Core-Team</option>
            <option value="cofounder">Co-Founder</option>
            <option value="founder">Founder</option>
          </select>
        </>}
        <input type="email" placeholder="Email" className="w-full bg-messa-muted rounded-lg px-3 py-2 outline-none" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
        <input type="password" placeholder="Password (min 6)" className="w-full bg-messa-muted rounded-lg px-3 py-2 outline-none" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
        <button className="w-full bg-messa-red hover:bg-red-700 rounded-lg py-2.5 font-semibold">{mode==='login'?'Sign in':'Create account'}</button>
      </form>
      {mode==='register' && <p className="text-xs text-zinc-400 mt-3">New accounts require Founder approval before login.</p>}
    </div>
  </div>
}
