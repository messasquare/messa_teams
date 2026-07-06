import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { toast } from 'sonner'
export default function TasksPage(){
  const {user} = useAuth()
  const [tasks,setTasks] = useState([])
  const [users,setUsers] = useState([])
  const [form,setForm] = useState({title:'',description:'',assignee_ids:[],priority:'medium'})
  const canCreate = ['founder','cofounder','core'].includes(user.role)
  const load = ()=> api.get('/tasks').then(r=>setTasks(r.data))
  useEffect(()=>{ load(); api.get('/admin/users').then(r=>setUsers(r.data)).catch(()=>{}) },[])
  const create = async e => {
    e.preventDefault(); if(!form.title) return
    await api.post('/tasks', form); toast.success('Task created'); setForm({title:'',description:'',assignee_ids:[],priority:'medium'}); load()
  }
  const updateStatus = async (id,status)=> { await api.post(`/tasks/${id}/status`,{status}); load() }
  const cols = {todo:'To Do', in_progress:'In Progress', review:'Review', done:'Done'}
  return <div className="p-6 h-screen overflow-auto">
    <h1 className="text-xl font-bold mb-4">Task Tracer</h1>
    {canCreate && <form onSubmit={create} className="bg-messa-card border border-zinc-800 rounded-xl p-4 mb-6 grid md:grid-cols-4 gap-3">
      <input placeholder="Task title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="bg-messa-muted rounded px-3 py-2 md:col-span-2"/>
      <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="bg-messa-muted rounded px-3 py-2"><option>low</option><option>medium</option><option>high</option></select>
      <button className="bg-messa-red rounded px-3 py-2">Create</button>
      <input placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="bg-messa-muted rounded px-3 py-2 md:col-span-3"/>
      <select multiple value={form.assignee_ids} onChange={e=>setForm({...form,assignee_ids:[...e.target.selectedOptions].map(o=>o.value)})} className="bg-messa-muted rounded px-3 py-2 md:col-span-1 h-20 text-sm">
        {users.map(u=><option key={u._id} value={u._id}>{u.name} · {u.role}</option>)}
      </select>
    </form>}
    <div className="grid md:grid-cols-4 gap-4">
      {Object.entries(cols).map(([status,label])=><div key={status} className="bg-messa-card border border-zinc-800 rounded-xl p-3 min-h-[300px]">
        <div className="font-semibold mb-2">{label}</div>
        <div className="space-y-2">
        {tasks.filter(t=>t.status===status).map(t=><div key={t._id} className="bg-messa-muted rounded-lg p-3 text-sm">
          <div className="font-medium">{t.title}</div>
          <div className="text-zinc-400 text-xs">{t.description}</div>
          <select value={t.status} onChange={e=>updateStatus(t._id, e.target.value)} className="mt-2 bg-black/30 rounded px-2 py-1 text-xs w-full">
            {Object.entries(cols).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>)}
        </div>
      </div>)}
    </div>
  </div>
}
