import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../store/auth'
import logo from '../assets/logo.png'
const linkCls = ({isActive}) => `px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-messa-red text-white' : 'text-zinc-300 hover:bg-zinc-800'}`
export default function Layout(){
  const {user, logout} = useAuth()
  const roleLabel = {founder:'Founder', cofounder:'Co-Founder', core:'Core-Team', volunteer:'Volunteer'}[user?.role] || user?.role
  return <div className="min-h-screen bg-messa-dark flex">
    <aside className="w-64 bg-[#111] border-r border-zinc-800 p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <img src={logo} className="h-9 w-9 object-contain rounded" />
        <div className="font-bold tracking-wide">MESSA TEAMS</div>
      </div>
      <nav className="space-y-1 text-sm">
        <NavLink to="/chat" className={linkCls}>Chat</NavLink>
        <NavLink to="/tasks" className={linkCls}>Tasks</NavLink>
        <NavLink to="/meetings" className={linkCls}>Meetings</NavLink>
        <NavLink to="/announcements" className={linkCls}>Announcements</NavLink>
        {(user?.role==='founder'||user?.role==='cofounder') && <NavLink to="/admin" className={linkCls}>Admin</NavLink>}
      </nav>
      <div className="mt-auto pt-4 border-t border-zinc-800 text-xs text-zinc-400">
        <div className="font-semibold text-zinc-200">{user?.name}</div>
        <div>{roleLabel}</div>
        <button onClick={logout} className="mt-2 text-messa-red hover:underline">Logout</button>
      </div>
    </aside>
    <main className="flex-1 bg-[#0f0f0f]"><Outlet/></main>
  </div>
}
