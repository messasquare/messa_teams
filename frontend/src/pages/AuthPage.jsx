// frontend/src/pages/AuthPage.jsx
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader,
  Shield, Users, Zap, MessageSquare, CheckCircle2,
} from 'lucide-react'
import useAuthStore from '../store/auth'
import { cn } from '../lib/utils'
import logo from '../assets/logo.png'

const ROLES = [
  { value: 'volunteer', label: 'Volunteer', desc: 'Team member', icon: '👤' },
  { value: 'core_team', label: 'Core Team', desc: 'Create tasks & meetings', icon: '⚡' },
  { value: 'co_founder', label: 'Co-Founder', desc: 'Full admin access', icon: '🎯' },
  { value: 'founder', label: 'Founder', desc: 'Full admin access', icon: '👑' },
]

const FEATURES = [
  { icon: MessageSquare, title: 'Real-time Chat', desc: 'WhatsApp-style messaging with voice notes' },
  { icon: CheckCircle2, title: 'Task Management', desc: 'Kanban board with drag & drop' },
  { icon: Users, title: 'Team Meetings', desc: 'HD video calls powered by Jitsi' },
  { icon: Shield, title: 'Role-Based Access', desc: 'Fine-grained permissions' },
]

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'volunteer',
  })

  const { login, register } = useAuthStore()
  const navigate = useNavigate()

  const set = useCallback((k, v) => setForm((p) => ({ ...p, [k]: v })), [])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (loading) return

      // Validation
      if (!form.email.trim() || !form.password) {
        toast.error('Email and password are required')
        return
      }
      if (form.password.length < 6) {
        toast.error('Password must be at least 6 characters')
        return
      }
      if (mode === 'register' && !form.name.trim()) {
        toast.error('Full name is required')
        return
      }

      setLoading(true)
      try {
        if (mode === 'login') {
          await login(form.email.trim(), form.password)
          toast.success('Welcome back! 👋')
          navigate('/chat')
        } else {
          const res = await register({
            ...form,
            name: form.name.trim(),
            email: form.email.trim(),
          })
          if (res.pending) {
            toast.success('Account created! Waiting for admin approval.', { duration: 5000 })
            setMode('login')
            setForm((p) => ({ ...p, password: '' }))
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
    },
    [form, mode, loading, login, register, navigate]
  )

  return (
    <div className="min-h-screen bg-dark flex overflow-hidden">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[440px] bg-card border-r border-border p-10 relative overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-messa-red/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-messa-red/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="MESSA" className="w-11 h-11 object-contain" />
            <div>
              <h1 className="font-black text-white tracking-tight text-lg">
                MESSA <span className="text-messa-red">TEAMS</span>
              </h1>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">by MESSA SQUARE</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-10">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight tracking-tight mb-4">
              Your team,<br />
              <span className="bg-gradient-to-r from-messa-red to-messa-red-light bg-clip-text text-transparent">
                unified.
              </span>
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Real-time chat, task management, and video meetings — one platform for everything MESSA SQUARE.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-messa-red/10 border border-messa-red/20 flex items-center justify-center flex-shrink-0 group-hover:bg-messa-red/20 transition-colors">
                  <f.icon size={18} className="text-messa-red" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-text-muted text-xs">
          © 2025 MESSA SQUARE. Built with love.
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src={logo} alt="MESSA" className="w-11 h-11 object-contain" />
            <h1 className="font-black text-white text-xl tracking-tight">
              MESSA <span className="text-messa-red">TEAMS</span>
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex bg-muted rounded-2xl p-1 mb-8">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  mode === m ? 'bg-messa-red text-white shadow-glow-red' : 'text-text-secondary hover:text-white'
                )}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {mode === 'login' ? 'Welcome back' : 'Get started'}
              </h2>
              <p className="text-text-secondary text-sm mt-1">
                {mode === 'login' ? 'Sign in to your workspace' : 'Request access to MESSA TEAMS'}
              </p>
            </div>

            {mode === 'register' && (
              <div className="animate-fade-in">
                <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    className="input-base pl-10"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    required
                    autoComplete="name"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-base pl-10"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus={mode === 'login'}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-base pl-10 pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="animate-fade-in">
                <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => set('role', r.value)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-left transition-all',
                        form.role === r.value
                          ? 'border-messa-red bg-messa-red/10'
                          : 'border-border bg-muted hover:border-border-light'
                      )}
                    >
                      <div className="text-xl mb-1">{r.icon}</div>
                      <div className="text-xs font-semibold text-white">{r.label}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3 mt-2" disabled={loading}>
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {mode === 'register' && (
              <div className="bg-muted border border-border rounded-xl p-3 mt-3">
                <p className="text-xs text-text-secondary leading-relaxed">
                  <span className="text-messa-red font-semibold">Note:</span> New accounts require admin approval.
                  The first Founder account is auto-approved.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}