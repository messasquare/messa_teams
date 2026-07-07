// frontend/src/pages/AdminPage.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Shield, Users, Check, X, Search, Plus, Edit2, Loader,
  Hash, ToggleLeft, ToggleRight, AlertCircle, UserCheck,
  Activity, Settings
} from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/auth'
import Avatar from '../components/Avatar'
import { cn, getRoleBadgeColor, getRoleLabel, formatRelative } from '../lib/utils'

const TABS = [
  { id: 'pending', label: 'Pending Approval', icon: AlertCircle },
  { id: 'users', label: 'All Users', icon: Users },
  { id: 'groups', label: 'Groups', icon: Hash },
]

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </div>
  )
}

function UserPermissionsModal({ user: targetUser, groups, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false)
  const [perms, setPerms] = useState({
    allowed_group_ids: targetUser.permissions?.allowed_group_ids || [],
    can_dm_founders: targetUser.permissions?.can_dm_founders || false,
  })

  const toggleGroup = (id) => {
    setPerms(p => ({
      ...p,
      allowed_group_ids: p.allowed_group_ids.includes(id)
        ? p.allowed_group_ids.filter(g => g !== id)
        : [...p.allowed_group_ids, id]
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.post('/api/admin/update_permissions', {
        user_id: targetUser._id,
        permissions: perms,
      })
      onUpdated(targetUser._id, perms)
      toast.success('Permissions updated')
      onClose()
    } catch {
      toast.error('Failed to update permissions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="modal-content p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Permissions</h2>
            <p className="text-sm text-text-muted">{targetUser.name}</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <div className="space-y-5">
          {/* DM Founders */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Can DM Founders/Co-Founders</p>
              <p className="text-xs text-text-muted mt-0.5">Allow direct messaging to leadership</p>
            </div>
            <button
              onClick={() => setPerms(p => ({ ...p, can_dm_founders: !p.can_dm_founders }))}
              className="flex-shrink-0"
            >
              {perms.can_dm_founders
                ? <ToggleRight size={32} className="text-messa-red" />
                : <ToggleLeft size={32} className="text-text-muted" />
              }
            </button>
          </div>

          {/* Allowed Groups */}
          <div>
            <p className="text-sm font-medium text-white mb-3">
              Allowed Groups ({perms.allowed_group_ids.length}/{groups.length})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {groups.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">No groups created yet</p>
              ) : groups.map(g => (
                <button
                  key={g._id}
                  type="button"
                  onClick={() => toggleGroup(g._id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left',
                    perms.allowed_group_ids.includes(g._id)
                      ? 'bg-messa-red/15 border border-messa-red/30'
                      : 'bg-muted hover:bg-muted-2'
                  )}
                >
                  <Hash size={14} className={
                    perms.allowed_group_ids.includes(g._id) ? 'text-messa-red' : 'text-text-muted'
                  } />
                  <span className={cn(
                    'flex-1 text-sm font-medium',
                    perms.allowed_group_ids.includes(g._id) ? 'text-white' : 'text-text-secondary'
                  )}>
                    {g.name}
                  </span>
                  {perms.allowed_group_ids.includes(g._id) && (
                    <Check size={14} className="text-messa-red" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader size={16} className="animate-spin" /> : 'Save Permissions'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function NewGroupModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Group name required'); return }
    setLoading(true)
    try {
      const res = await api.post('/api/groups', form)
      onCreated(res.data)
      toast.success('Group created!')
      onClose()
    } catch {
      toast.error('Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="modal-content p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create Group</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block">Group Name *</label>
            <input
              className="input-base"
              placeholder="e.g. Design Team, Marketing..."
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block">Description</label>
            <textarea
              className="input-base resize-none"
              rows={2}
              placeholder="What is this group for?"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader size={16} className="animate-spin" /> : 'Create Group'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState([])
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [permUser, setPermUser] = useState(null)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [approving, setApproving] = useState(null)

  const isAdmin = ['founder', 'co_founder'].includes(user?.role)

  useEffect(() => {
    if (!isAdmin) return
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pendRes, usrRes, grpRes] = await Promise.all([
        api.get('/api/admin/pending_users'),
        api.get('/api/admin/users'),
        api.get('/api/groups'),
      ])
      setPending(pendRes.data || [])
      setUsers((usrRes.data || []).filter(u => u.approved))
      setGroups(grpRes.data || [])
    } catch {
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const approveUser = async (userId, role) => {
    setApproving(userId)
    try {
      await api.post('/api/admin/approve_user', { user_id: userId, role })
      const approved = pending.find(p => p._id === userId)
      if (approved) {
        setUsers(prev => [...prev, { ...approved, approved: true, role }])
      }
      setPending(prev => prev.filter(p => p._id !== userId))
      toast.success('User approved!')
    } catch {
      toast.error('Failed to approve user')
    } finally {
      setApproving(null)
    }
  }

  const rejectUser = async (userId) => {
    try {
      // Mark as rejected (approve with role=rejected or just remove)
      await api.post('/api/admin/approve_user', { user_id: userId, role: 'volunteer', approved: false })
      setPending(prev => prev.filter(p => p._id !== userId))
      toast.success('User rejected')
    } catch {
      // just remove from UI
      setPending(prev => prev.filter(p => p._id !== userId))
    }
  }

  const ROLES = ['founder', 'co_founder', 'core_team', 'volunteer']

  const filteredUsers = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Shield size={48} className="text-text-muted" />
        <h2 className="text-xl font-bold text-white">Admin Access Only</h2>
        <p className="text-text-muted text-sm">Only Founders and Co-Founders can access this area.</p>
      </div>
    )
  }

  const UserSkeleton = () => (
    <div className="flex items-center gap-3 p-4 border-b border-border">
      <div className="skeleton w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-32 rounded" />
        <div className="skeleton h-2 w-48 rounded" />
      </div>
      <div className="skeleton h-7 w-20 rounded-lg" />
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-dark overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-messa-red/20 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-messa-red" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-text-muted">Manage team and permissions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Team Members" value={users.length} icon={Users} color="bg-blue-600" />
          <StatCard label="Pending" value={pending.length} icon={AlertCircle} color={pending.length > 0 ? "bg-messa-red" : "bg-muted"} />
          <StatCard label="Groups" value={groups.length} icon={Hash} color="bg-purple-600" />
          <StatCard label="Your Role" value={getRoleLabel(user?.role)} icon={Shield} color="bg-green-600" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card px-6 flex-shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn('tab flex items-center gap-2', tab === id && 'active')}
          >
            <Icon size={14} />
            {label}
            {id === 'pending' && pending.length > 0 && (
              <span className="badge ml-1">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Pending Tab */}
        {tab === 'pending' && (
          <div className="p-6">
            {loading ? (
              <div className="card overflow-hidden">
                {Array(3).fill(0).map((_, i) => <UserSkeleton key={i} />)}
              </div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center">
                  <Check size={28} className="text-green-400" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-white">All caught up!</h3>
                  <p className="text-sm text-text-muted mt-1">No pending approval requests</p>
                </div>
              </div>
            ) : (
              <div className="card overflow-hidden max-w-3xl">
                {pending.map((u, idx) => (
                  <div
                    key={u._id}
                    className={cn(
                      'flex items-center gap-4 p-4',
                      idx !== pending.length - 1 && 'border-b border-border'
                    )}
                  >
                    <Avatar name={u.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{u.name}</p>
                      <p className="text-xs text-text-muted">{u.email}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Requested: <span className="capitalize">{u.role?.replace('_', ' ')}</span>
                        {u.created_at && ` · ${formatRelative(u.created_at)}`}
                      </p>
                    </div>

                    {/* Role select + approve */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        className="input-base text-xs w-32"
                        defaultValue={u.role || 'volunteer'}
                        id={`role-${u._id}`}
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{getRoleLabel(r)}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          const sel = document.getElementById(`role-${u._id}`)
                          approveUser(u._id, sel?.value || u.role || 'volunteer')
                        }}
                        disabled={approving === u._id}
                        className="w-9 h-9 bg-green-600 hover:bg-green-700 rounded-xl flex items-center justify-center
                                   transition-colors disabled:opacity-50"
                        title="Approve"
                      >
                        {approving === u._id
                          ? <Loader size={14} className="animate-spin" />
                          : <Check size={14} />
                        }
                      </button>

                      <button
                        onClick={() => rejectUser(u._id)}
                        className="w-9 h-9 bg-messa-red/20 hover:bg-messa-red/40 border border-messa-red/30
                                   rounded-xl flex items-center justify-center transition-colors"
                        title="Reject"
                      >
                        <X size={14} className="text-messa-red" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4 max-w-3xl">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-base pl-9 text-sm"
                  placeholder="Search users..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="card overflow-hidden max-w-3xl">
              {loading ? (
                Array(5).fill(0).map((_, i) => <UserSkeleton key={i} />)
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-text-muted">No users found</div>
              ) : filteredUsers.map((u, idx) => (
                <div
                  key={u._id}
                  className={cn(
                    'flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors',
                    idx !== filteredUsers.length - 1 && 'border-b border-border'
                  )}
                >
                  <Avatar name={u.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-white">{u.name}</p>
                      {u._id === user._id && (
                        <span className="text-[10px] text-messa-red bg-messa-red/10 px-1.5 py-0.5 rounded">You</span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{u.email}</p>
                  </div>

                  <span className={cn(
                    'text-xs px-2.5 py-1 rounded-lg border font-medium',
                    getRoleBadgeColor(u.role)
                  )}>
                    {getRoleLabel(u.role)}
                  </span>

                  {u.role === 'volunteer' && (
                    <button
                      onClick={() => setPermUser(u)}
                      className="btn-ghost text-xs gap-1"
                      title="Edit permissions"
                    >
                      <Settings size={13} />
                      Perms
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {tab === 'groups' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 max-w-3xl">
              <p className="text-sm text-text-muted">{groups.length} groups</p>
              <button onClick={() => setShowNewGroup(true)} className="btn-primary">
                <Plus size={15} />
                New Group
              </button>
            </div>

            {loading ? (
              <div className="card overflow-hidden max-w-3xl">
                {Array(3).fill(0).map((_, i) => <UserSkeleton key={i} />)}
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
                  <Hash size={28} className="text-text-muted" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-white">No groups yet</h3>
                  <p className="text-sm text-text-muted">Create your first group channel</p>
                </div>
                <button onClick={() => setShowNewGroup(true)} className="btn-primary">
                  <Plus size={15} /> Create Group
                </button>
              </div>
            ) : (
              <div className="card overflow-hidden max-w-3xl">
                {groups.map((g, idx) => (
                  <div
                    key={g._id}
                    className={cn(
                      'flex items-center gap-4 p-4',
                      idx !== groups.length - 1 && 'border-b border-border'
                    )}
                  >
                    <div className="w-10 h-10 bg-messa-red/10 border border-messa-red/20 rounded-xl
                                    flex items-center justify-center flex-shrink-0">
                      <Hash size={16} className="text-messa-red" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{g.name}</p>
                      {g.description && (
                        <p className="text-xs text-text-muted truncate">{g.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">
                      {formatRelative(g.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {permUser && (
          <UserPermissionsModal
            user={permUser}
            groups={groups}
            onClose={() => setPermUser(null)}
            onUpdated={(uid, perms) => {
              setUsers(prev => prev.map(u =>
                u._id === uid ? { ...u, permissions: perms } : u
              ))
            }}
          />
        )}
        {showNewGroup && (
          <NewGroupModal
            onClose={() => setShowNewGroup(false)}
            onCreated={(g) => setGroups(prev => [g, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  )
}