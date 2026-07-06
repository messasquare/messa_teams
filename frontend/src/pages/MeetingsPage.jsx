import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { toast } from 'sonner'
export default function MeetingsPage(){
  const {user} = useAuth()
  const [meetings,setMeetings] = useState([])
  const [title,setTitle] = useState('')
  const [startsAt,setStartsAt] = useState('')
  const canCreate = ['founder','cofounder','core'].includes(user.role)
  const load = ()=> api.get('/meetings').then(r=>setMeetings(r.data))
  useEffect(()=>{load()},[])
  const create = async e => {
    e.preventDefault()
    await api.post('/meetings',{title, starts_at: startsAt})
    toast.success('Meeting scheduled'); setTitle(''); setStartsAt(''); load()
  }
  const join = (m)=>{
    const w = window.open(m.jitsi_url, '_blank', 'width=1100,height=750')
    if(!w) window.location.href = m.jitsi_url
  }
  return <div className="p-6">
    <h1 className="text-xl font-bold mb-4">Meetings — Jitsi</h1>
    {canCreate && <form onSubmit={create} className="bg-messa-card border border-zinc-800 rounded-xl p-4 mb-4 flex flex-wrap gap-3">
      <input placeholder="Meeting title" value={title} onChange={e=>setTitle(e.target.value)} className="bg-messa-muted rounded px-3 py-2 flex-1 min-w-[200px]" required/>
      <input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="bg-messa-muted rounded px-3 py-2"/>
      <button className="bg-messa-red rounded px-4 py-2">Schedule</button>
    </form>}
    <div className="grid md:grid-cols-2 gap-3">
      {meetings.map(m=><div key={m._id} className="bg-messa-card border border-zinc-800 rounded-xl p-4">
        <div className="font-semibold">{m.title}</div>
        <div className="text-sm text-zinc-400">{m.starts_at || 'Ad-hoc'}</div>
        <button onClick={()=>join(m)} className="mt-3 bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded text-sm">Join on Jitsi</button>
        <div className="text-xs text-zinc-500 mt-1">{m.jitsi_url}</div>
      </div>)}
    </div>
  </div>
}
