// frontend/src/pages/AuthPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, ChevronDown, ArrowRight, Loader } from 'lucide-react'
import useAuthStore from '../store/auth'
import logo from '../assets/logo.png'
import { cn } from '../lib/utils'

const ROLES = [
  { value: 'founder', label: 'Founder', desc: 'Full admin access' },
  { value: 'co_founder', label: 'Co-Founder', desc: 'Full admin access' },
  { value: 'core_team', label: 'Core Team', desc: 'Create tasks & meetings' },
  { value: 'volunteer', label: 'Volunteer', desc: 'Chat & update tasks' },
]

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'volunteer'
  })
  const { login, register } = useAuthStore()
  const navigate = useNavigate()

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const selectedRole = ROLES.find(r => r.value === form.role)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        toast.success('Welcome back! 👋')
        navigate('/chat')
      } else {
        if (!form.name.trim()) { toast.error('Name is required'); return }
        const res = await register(form)
        if (res.pending) {
          toast.success('Registration submitted! Waiting for admin approval.', {
            duration: 6000,
          })
          setMode('login')
        } else {
          toast.success('Welcome to MESSA TEAMS! 🎉')
          navigate('/chat')
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Left Panel – Branding */}
      <div className="hidden lg:flex flex-col justify-between w-96 bg-card border-r border-border p-8">
        <div className="flex items-center gap-3">
          <img src={logo} alt="MESSA" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-bold text-white">MESSA TEAMS</h1>
            <p className="text-xs text-text-muted">by MESSA SQUARE</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Your team,<br />
              <span className="text-messa-red">connected.</span>
            </h2>
            <p className="text-text-secondary mt-3 text-sm leading-relaxed">
              Real-time chat, task management, and video meetings — all in one place for MESSA SQUARE.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: '💬', label: 'Real-time Group Chat', desc: 'WhatsApp-style messaging' },
              { icon: '✅', label: 'Task Kanban Board', desc: 'Track work with drag & drop' },
              { icon: '🎥', label: 'Video Meetings', desc: 'Powered by Jitsi Meet' },
              { icon: '📢', label: 'Announcements', desc: 'Team-wide broadcasts' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-text-muted text-xs">© 2025 MESSA SQUARE. All rights reserved.</p>
      </div>

      {/* Right Panel – Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src={logo} alt="MESSA" className="w-10 h-10 object-contain" />
            <h1 className="font-bold text-white text-xl">MESSA TEAMS</h1>
          </div>

          {/* Tabs */}
          <div className="flex bg-muted rounded-2xl p-1 mb-8">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  mode === m
                    ? 'bg-messa-red text-white shadow-md'
                    : 'text-text-secondary hover:text-white'
                )}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {mode === 'login' ? 'Welcome back' : 'Join the team'}
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  {mode === 'login'
                    ? 'Sign in to your MESSA TEAMS account'
                    : 'Request access to MESSA TEAMS'
                  }
                </p>
              </div>

              {mode === 'register' && (
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    className="input-base pl-9"
                    placeholder="Full Name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-base pl-9"
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-base pl-9 pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {mode === 'register' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleOpen(!roleOpen)}
                    className="input-base flex items-center justify-between"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-white text-sm">{selectedRole?.label}</span>
                      <span className="text-text-muted text-xs">{selectedRole?.desc}</span>
                    </div>
                    <ChevronDown size={16} className={cn(
                      'text-text-muted transition-transform',
                      roleOpen && 'rotate-180'
                    )} />
                  </button>

                  <AnimatePresence>
                    {roleOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full mt-1 left-0 right-0 bg-card border border-border
                                   rounded-xl overflow-hidden z-20 shadow-modal"
                      >
                        {ROLES.map(role => (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => { set('role', role.value); setRoleOpen(false) }}
                            className={cn(
                              'w-full flex flex-col items-start px-4 py-3 hover:bg-muted transition-colors text-left',
                              form.role === role.value && 'bg-messa-red/10'
                            )}
                          >
                            <span className="text-sm font-medium text-white">{role.label}</span>
                            <span className="text-xs text-text-muted">{role.desc}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <button type="submit" className="btn-primary w-full py-3 mt-2" disabled={loading}>
                {loading ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Request Access'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {mode === 'register' && (
                <p className="text-xs text-text-muted text-center mt-2">
                  Your account requires admin approval before you can sign in.
                  First Founder is auto-approved.
                </p>
              )}
            </motion.form>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}