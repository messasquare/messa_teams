import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { toast } from 'sonner'
export default function AnnouncementsPage(){
  const {user} = useAuth()
  const [items,setItems] = useState([])
  const [title,setTitle] = useState('')
  const [body,setBody] = useState('')
  const canPost = ['founder','cofounder','core'].includes(user.role)
  const load = ()=> api.get('/announcements').then(r=>setItems(r.data))
  useEffect(()=>{load()},[])
  const post = async e => { e.preventDefault(); await api.post('/announcements',{title,body}); toast.success('Posted'); setTitle(''); setBody(''); load() }
  return <div className="p-6 max-w-3xl">
    <h1 className="text-xl font-bold mb-4">Announcements</h1>
    {canPost && <form onSubmit={post} className="bg-messa-card border border-zinc-800 rounded-xl p-4 mb-4 space-y-2">
      <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-messa-muted rounded px-3 py-2"/>
      <textarea placeholder="Announcement body…" value={body} onChange={e=>setBody(e.target.value)} className="w-full bg-messa-muted rounded px-3 py-2 h-24"/>
      <button className="bg-messa-red rounded px-4 py-2">Publish</button>
    </form>}
    <div className="space-y-3">
      {items.map(a=><div key={a._id} className="bg-messa-card border border-zinc-800 rounded-xl p-4">
        <div className="font-semibold">{a.title}</div>
        <div className="text-sm text-zinc-300 whitespace-pre-wrap">{a.body}</div>
        <div className="text-xs text-zinc-500 mt-2">{a.author_name} · {new Date(a.created_at).toLocaleString()}</div>
      </div>)}
    </div>
  </div>
}
