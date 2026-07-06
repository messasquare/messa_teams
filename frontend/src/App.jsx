import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'
import TasksPage from './pages/TasksPage'
import MeetingsPage from './pages/MeetingsPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import AdminPage from './pages/AdminPage'

function RequireAuth({children}) {
  const {user, loading, init} = useAuth()
  useEffect(()=>{init()},[])
  if (loading) return <div className="p-8">Loading MESSA TEAMS…</div>
  if (!user) return <Navigate to="/auth" replace />
  return children
}

export default function App(){
  return <Routes>
    <Route path="/auth" element={<AuthPage/>} />
    <Route path="/" element={<RequireAuth><Layout/></RequireAuth>}>
      <Route index element={<Navigate to="/chat" replace/>} />
      <Route path="chat" element={<ChatPage/>} />
      <Route path="tasks" element={<TasksPage/>} />
      <Route path="meetings" element={<MeetingsPage/>} />
      <Route path="announcements" element={<AnnouncementsPage/>} />
      <Route path="admin" element={<AdminPage/>} />
    </Route>
  </Routes>
}
