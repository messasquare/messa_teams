import { useEffect, useRef, useState } from 'react'
import { api, uploadFile, API_BASE } from '../lib/api'
import { useAuth } from '../store/auth'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import { Send, Paperclip, MapPin, Mic } from 'lucide-react'

let socket
export default function ChatPage(){
  const {user} = useAuth()
  const [groups,setGroups] = useState([])
  const [users,setUsers] = useState([])
  const [active,setActive] = useState(null)
  const [msgs,setMsgs] = useState([])
  const [text,setText] = useState('')
  const endRef = useRef()

  const loadGroups = ()=> api.get('/groups').then(r=>setGroups(r.data))
  const loadUsers = ()=> api.get('/admin/users').then(r=>setUsers(r.data)).catch(()=>{})
  
  useEffect(()=>{ loadGroups(); loadUsers() },[])

  useEffect(()=>{
    if(!active) return
    api.get('/chat/messages',{params:{conversation_id:active.id}}).then(r=>setMsgs(r.data))
    if(!socket) socket = io(API_BASE, {transports:['websocket']})
    socket.emit('join',{conversation_id:active.id})
    const handler = (m)=> { if(m.conversation_id===active.id) setMsgs(x=>[...x,m])}
    socket.on('message:new', handler)
    return ()=> { socket.off('message:new', handler); socket.emit('leave',{conversation_id:active.id})}
  },[active?.id])

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  const send = async () => {
    if(!text.trim() || !active) return
    await api.post('/chat/send',{conversation_id:active.id, text})
    setText('')
  }
  const sendFile = async e => {
    const f = e.target.files[0]; if(!f) return
    toast('Uploading…')
    const up = await uploadFile(f)
    await api.post('/chat/send',{conversation_id:active.id, text:'', attachments:[up], type: up.type?.includes('video')?'video': up.type?.includes('audio')?'voice':'file'})
    e.target.value=''
  }
  const sendLocation = () => {
    if(!navigator.geolocation) return toast.error('No geolocation')
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat=pos.coords.latitude, lng=pos.coords.longitude
      const url=`https://maps.google.com/?q=${lat},${lng}`
      api.post('/chat/send',{conversation_id:active.id, text:url, location:{lat,lng,url}, type:'location'})
    })
  }

  const dmList = users.filter(u=>u._id!==user._id)
  const canDM = (u)=> {
    if(user.role==='founder' || user.role==='cofounder') return true
    if(u.role==='founder' || u.role==='cofounder') return !!user.permissions?.can_dm_founders
    return true
  }

  return <div className="h-screen flex">
    <div className="w-72 border-r border-zinc-800 bg-[#111] flex flex-col">
      <div className="p-3 font-semibold text-zinc-300">Groups</div>
      <div className="px-3 space-y-1 overflow-y-auto scroll-thin">
        {groups.map(g=>{
          const id=`group:${g._id}`
          return <button key={id} onClick={()=>setActive({id, label:g.name})} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${active?.id===id?'bg-zinc-800': 'hover:bg-zinc-800'}`}>{g.name}</button>
        })}
        {groups.length===0 && <div className="text-xs text-zinc-500 px-3">No groups yet — Founder creates them in Admin.</div>}
      </div>
      <div className="p-3 mt-2 font-semibold text-zinc-300 border-t border-zinc-800">Direct</div>
      <div className="px-3 space-y-1 overflow-y-auto flex-1 scroll-thin">
        {dmList.filter(canDM).map(u=>{
          const id=`dm:${[user._id, u._id].sort().join(':')}`
          return <button key={u._id} onClick={()=>setActive({id, label:u.name})} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${active?.id===id?'bg-zinc-800':'hover:bg-zinc-800'}`}>{u.name}<span className="text-[10px] text-zinc-500 ml-2">{u.role}</span></button>
        })}
      </div>
    </div>
    <div className="flex-1 flex flex-col bg-[#0f0f0f]">
      {!active ? <div className="m-auto text-zinc-500">Select a conversation</div> :
      <>
      <div className="px-4 py-3 border-b border-zinc-800 font-semibold">{active.label}</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-thin">
        {msgs.map(m=> <div key={m._id} className={`max-w-lg ${m.sender_id===user._id?'ml-auto text-right':''}`}>
          <div className={`inline-block rounded-2xl px-3 py-2 text-sm ${m.sender_id===user._id?'bg-messa-red':'bg-zinc-800'}`}>
            {m.sender_id!==user._id && <div className="text-[11px] text-zinc-400">{m.sender_name}</div>}
            {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
            {m.attachments?.map((a,i)=>
              a.type?.includes('image') ? <img key={i} src={a.url} className="rounded-lg mt-1 max-h-64" /> :
              a.type?.includes('video') ? <video key={i} src={a.url} controls className="rounded-lg mt-1 max-h-64" /> :
              a.type?.includes('audio') ? <audio key={i} src={a.url} controls className="mt-1" /> :
              <a key={i} href={a.url} target="_blank" className="underline">{a.name||'File'}</a>
            )}
            {m.location && <a href={m.location.url} target="_blank" className="underline text-xs">📍 Open in Maps</a>}
          </div>
        </div>)}
        <div ref={endRef}/>
      </div>
      <div className="p-3 border-t border-zinc-800 flex items-center gap-2 bg-[#121212]">
        <label className="p-2 hover:bg-zinc-800 rounded cursor-pointer"><Paperclip size={18}/><input type="file" hidden onChange={sendFile}/></label>
        <button onClick={sendLocation} className="p-2 hover:bg-zinc-800 rounded"><MapPin size={18}/></button>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message…" className="flex-1 bg-messa-muted rounded-full px-4 py-2 outline-none"/>
        <button onClick={send} className="bg-messa-red px-4 py-2 rounded-full"><Send size={16}/></button>
      </div>
      </>}
    </div>
  </div>
}
