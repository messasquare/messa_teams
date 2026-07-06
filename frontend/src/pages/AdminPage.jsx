import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import { toast } from 'sonner'
export default function AdminPage(){
  const {user} = useAuth()
  const isAdmin = ['founder','cofounder'].includes(user.role)
  const [pending,setPending] = useState([])
  const [users,setUsers] = useState([])
  const [groups,setGroups] = useState([])
  const [gname,setGname] = useState('')
  const [gdesc,setGdesc] = useState('')
  const [gmembers,setGmembers] = useState([])
  const load = async ()=>{
    if(isAdmin){ const p = await api.get('/admin/pending_users'); setPending(p.data) }
    const u = await api.get('/admin/users'); setUsers(u.data)
    const gr = await api.get('/groups'); setGroups(gr.data)
  }
  useEffect(()=>{load()},[])
  const approve = async (id, role)=>{ await api.post('/admin/approve_user',{user_id:id, role}); toast.success('Approved'); load() }
  const savePerms = async (u)=>{
    await api.post('/admin/update_permissions',{user_id:u._id, permissions:u.permissions||{}})
    toast.success('Permissions saved'); load()
  }
  const createGroup = async e => {
    e.preventDefault()
    await api.post('/groups',{name:gname, description:gdesc, member_ids:gmembers})
    toast.success('Group created'); setGname(''); setGdesc(''); setGmembers([]); load()
  }
  if(!isAdmin) return <div className="p-6">Admin area is Founder/Co-Founder only.</div>
  return <div className="p-6 space-y-8 max-w-5xl">
    <h1 className="text-xl font-bold">Founder Dashboard</h1>
    <section className="bg-messa-card border border-zinc-800 rounded-xl p-4">
      <h2 className="font-semibold mb-2">Pending Approvals ({pending.length})</h2>
      {pending.map(p=><div key={p._id} className="flex items-center gap-2 text-sm py-1">
        <span className="flex-1">{p.name} · {p.email} · {p.role}</span>
        <select defaultValue={p.role} id={`role-${p._id}`} className="bg-messa-muted rounded px-2 py-1">
          <option value="volunteer">Volunteer</option><option value="core">Core-Team</option><option value="cofounder">Co-Founder</option><option value="founder">Founder</option>
        </select>
        <button onClick={()=>approve(p._id, document.getElementById(`role-${p._id}`).value)} className="bg-emerald-600 px-3 py-1 rounded">Approve</button>
      </div>)}
      {pending.length===0 && <div className="text-zinc-400 text-sm">No pending users.</div>}
    </section>

    <section className="bg-messa-card border border-zinc-800 rounded-xl p-4">
      <h2 className="font-semibold mb-2">Create Group</h2>
      <form onSubmit={createGroup} className="flex flex-wrap gap-2">
        <input placeholder="Group name" value={gname} onChange={e=>setGname(e.target.value)} className="bg-messa-muted rounded px-3 py-2 flex-1" required/>
        <input placeholder="Description" value={gdesc} onChange={e=>setGdesc(e.target.value)} className="bg-messa-muted rounded px-3 py-2 flex-1"/>
        <select multiple value={gmembers} onChange={e=>setGmembers([...e.target.selectedOptions].map(o=>o.value))} className="bg-messa-muted rounded px-3 py-2 min-w-[220px] h-24 text-sm">
          {users.map(u=><option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
        <button className="bg-messa-red rounded px-4 py-2">Create</button>
      </form>
      <div className="text-xs text-zinc-400 mt-2">Only Founder/Co-Founder can create groups. Assign members here, then set per-user group access below.</div>
      <div className="mt-3 text-sm">Existing: {groups.map(g=>g.name).join(', ') || 'none'}</div>
    </section>

    <section className="bg-messa-card border border-zinc-800 rounded-xl p-4">
      <h2 className="font-semibold mb-2">Team & Permissions</h2>
      <div className="space-y-3 text-sm max-h-[520px] overflow-auto pr-2">
        {users.map(u=>{
          const perms = u.permissions || {allowed_group_ids:[], can_dm_founders:false}
          return <div key={u._id} className="bg-messa-muted rounded-lg p-3">
            <div className="font-medium">{u.name} <span className="text-zinc-400">· {u.role} · {u.email}</span></div>
            <div className="flex flex-wrap gap-3 items-center mt-2">
              <label className="text-xs">Allowed groups:</label>
              <select multiple value={perms.allowed_group_ids||[]} onChange={e=>{ perms.allowed_group_ids=[...e.target.selectedOptions].map(o=>o.value); setUsers([...users])}} className="bg-black/30 rounded px-2 py-1 text-xs min-w-[240px] h-20">
                {groups.map(g=><option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
              <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={!!perms.can_dm_founders} onChange={e=>{perms.can_dm_founders=e.target.checked; setUsers([...users])}}/> Can DM Founders</label>
              <button onClick={()=>savePerms({...u, permissions:perms})} className="bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded text-xs">Save</button>
            </div>
          </div>
        })}
      </div>
    </section>
  </div>
}
