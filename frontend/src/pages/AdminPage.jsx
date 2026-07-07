// frontend/src/pages/AdminPage.jsx
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { toast } from 'sonner'
import {
  Shield, Users, Check, X, Search, Plus, Loader,
  Hash, ToggleLeft, ToggleRight, AlertCircle, Settings, Activity,
} from 'lucide-react'
import { adminAPI, groupsAPI } from '../lib/api'
import useAuthStore from '../store/auth'
import Avatar from '../components/Avatar'
import { cn, getRoleBadgeColor, getRoleLabel, formatRelative } from '../lib/utils'

const TABS = [
  { id: 'pending', label: 'Pending', icon: AlertCircle },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'groups', label: 'Groups', icon: Hash },
]

const ROLES = ['volunteer', 'core_team', 'co_founder', 'founder']

// ─── Stat Card ───
function StatCard({ label, value, icon: Icon, color, hint }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold text-white truncate">{value}</p>
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
        {hint && <p className="text-[10px] text-text-secondary mt-0.5">{hint}</p>}
      </div>
    </div>
  )
}

// ─── Permissions Modal ───
function PermissionsModal({ user: target, groups, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false)
  const [perms, setPerms] = useState({
    allowed_group_ids: target.permissions?.allowed_group_ids || [],
    can_dm_founders: target.permissions?.can_dm_founders || false,
  })

  const toggleGroup = (id) => {
    setPerms((p) => ({
      ...p,
      allowed_group_ids: p.allowed_group_ids.includes(id) ? p.allowed_group_ids.filter((g) => g !== id) : [...p.allowed_group_ids, id],
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await adminAPI.updatePermissions(target._id, perms)
      onUpdated(target._id, perms)
      toast.success('Permissions updated')
      onClose()
    } catch {
      toast.error('Failed to update permissions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={target.name} size="md" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{target.name}</h2>
              <p className="text-xs text-text-muted">Manage permissions</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* DM Founders */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">DM Founders</p>
              <p className="text-xs text-text-muted mt-0.5">Allow direct messages to leadership</p>
            </div>
            <button onClick={() => setPerms((p) => ({ ...p, can_dm_founders: !p.can_dm_founders }))} className="flex-shrink-0">
              {perms.can_dm_founders ? <ToggleRight size={36} className="text-messa-red" /> : <ToggleLeft size={36} className="text-text-muted" />}
            </button>
          </div>

          {/* Groups */}
          <div>
            <p className="text-sm font-semibold text-white mb-3">
              Groups Access ({perms.allowed_group_ids.length}/{groups.length})
            </p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {groups.length === 0 ? (
                <div className="text-center py-6 text-text-muted text-sm">
                  <Hash size={24} className="mx-auto mb-2 opacity-50" />
                  No groups created yet
                </div>
              ) : (
                groups.map((g) => {
                  const selected = perms.allowed_group_ids.includes(g._id)
                  return (
                    <button
                      key={g._id}
                      type="button"
                      onClick={() => toggleGroup(g._id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left border',
                        selected ? 'bg-messa-red/15 border-messa-red/30' : 'bg-muted hover:bg-muted-2 border-transparent'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', selected ? 'bg-messa-red/20' : 'bg-muted-2')}>
                        <Hash size={14} className={selected ? 'text-messa-red' : 'text-text-muted'} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-white">{g.name}</span>
                      {selected && <Check size={16} className="text-messa-red" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
              {loading ? <div className="spinner" /> : 'Save Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── New Group Modal ───
function NewGroupModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Group name required')
      return
    }
    setLoading(true)
    try {
      const res = await groupsAPI.create({
        name: form.name.trim(),
        description: form.description.trim(),
      })
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
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">New Group</h2>
            <p className="text-xs text-text-muted mt-0.5">Create a group channel</p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Group Name *</label>
            <input
              className="input-base"
              placeholder="Design Team, Marketing, Engineering..."
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              autoFocus
              maxLength={50}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Description</label>
            <textarea
              className="input-base"
              rows={2}
              placeholder="What is this group for?"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              maxLength={200}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <div className="spinner" /> : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── User Row (memoized) ───
const UserRow = memo(function UserRow({ u, currentUser, onEditPerms }) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
      <Avatar name={u.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-white truncate">{u.name}</p>
          {u._id === currentUser._id && (
            <span className="text-[9px] text-messa-red bg-messa-red/10 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">You</span>
          )}
        </div>
        <p className="text-xs text-text-muted truncate">{u.email}</p>
      </div>

      <span className={cn('text-[10px] px-2 py-1 rounded-lg border font-semibold uppercase tracking-wider whitespace-nowrap', getRoleBadgeColor(u.role))}>
        {getRoleLabel(u.role)}
      </span>

      {u.role === 'volunteer' && (
        <button onClick={() => onEditPerms(u)} className="btn-ghost text-xs gap-1.5" title="Edit permissions">
          <Settings size={13} />
          <span className="hidden sm:inline">Perms</span>
        </button>
      )}
    </div>
  )
})

// ─── Pending Row ───
const PendingRow = memo(function PendingRow({ u, onApprove, onReject, approving }) {
  const [role, setRole] = useState(u.role || 'volunteer')

  return (
    <div className="flex items-center gap-3 p-4">
      <Avatar name={u.name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{u.name}</p>
        <p className="text-xs text-text-muted truncate">{u.email}</p>
        <p className="text-[10px] text-text-muted mt-0.5">
          Requested: <span className="capitalize font-medium">{u.role?.replace('_', ' ')}</span>
          {u.created_at && ` · ${formatRelative(u.created_at)}`}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <select className="input-base text-xs w-32 py-1.5" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {getRoleLabel(r)}
            </option>
          ))}
        </select>

        <button
          onClick={() => onApprove(u._id, role)}
          disabled={approving === u._id}
          className="w-9 h-9 bg-green-600 hover:bg-green-700 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
          title="Approve"
        >
          {approving === u._id ? <div className="spinner" /> : <Check size={15} className="text-white" />}
        </button>

        <button
          onClick={() => onReject(u._id)}
          className="w-9 h-9 bg-messa-red/20 hover:bg-messa-red/40 border border-messa-red/30 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          title="Reject"
        >
          <X size={15} className="text-messa-red" />
        </button>
      </div>
    </div>
  )
})

// ─── MAIN PAGE ───
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
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const [pRes, uRes, gRes] = await Promise.all([adminAPI.pendingUsers(), adminAPI.users(), groupsAPI.list()])
        if (!mounted) return
        setPending(pRes.data || [])
        setUsers((uRes.data || []).filter((u) => u.approved !== false))
        setGroups(gRes.data || [])
      } catch {
        if (mounted) toast.error('Failed to load admin data')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [isAdmin])

  const approveUser = useCallback(
    async (userId, role) => {
      setApproving(userId)
      try {
        await adminAPI.approveUser(userId, role)
        const approved = pending.find((p) => p._id === userId)
        if (approved) {
          setUsers((prev) => [...prev, { ...approved, approved: true, role }])
        }
        setPending((prev) => prev.filter((p) => p._id !== userId))
        toast.success('User approved!')
      } catch {
        toast.error('Failed to approve user')
      } finally {
        setApproving(null)
      }
    },
    [pending]
  )

  const rejectUser = useCallback((userId) => {
    setPending((prev) => prev.filter((p) => p._id !== userId))
    toast.info('User rejected')
  }, [])

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
  )

  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-dark">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
          <Shield size={32} className="text-text-muted" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-1">Admin Access Only</h2>
          <p className="text-sm text-text-muted">Only Founders and Co-Founders can access this area</p>
        </div>
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
      <div className="px-4 md:px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-messa-red/20 border border-messa-red/30 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-messa-red" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-text-muted">Manage your team and access</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Members" value={users.length} icon={Users} color="bg-blue-600" />
          <StatCard label="Pending" value={pending.length} icon={AlertCircle} color={pending.length > 0 ? 'bg-messa-red' : 'bg-muted-2'} />
          <StatCard label="Groups" value={groups.length} icon={Hash} color="bg-purple-600" />
          <StatCard label="Your Role" value={getRoleLabel(user?.role)} icon={Shield} color="bg-green-600" />
        </div>
      </div>

      <div className="flex border-b border-border bg-card px-4 md:px-6 flex-shrink-0 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={cn('tab flex items-center gap-2', tab === id && 'active')}>
            <Icon size={14} />
            {label}
            {id === 'pending' && pending.length > 0 && <span className="badge ml-1">{pending.length}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'pending' && (
          <div className="p-4 md:p-6">
            {loading ? (
              <div className="card overflow-hidden max-w-3xl">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <UserSkeleton key={i} />
                  ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-center">
                  <Check size={28} className="text-green-400" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-white">All caught up!</h3>
                  <p className="text-sm text-text-muted mt-1">No pending approval requests</p>
                </div>
              </div>
            ) : (
              <div className="card overflow-hidden max-w-3xl divide-y divide-border">
                {pending.map((u) => (
                  <PendingRow key={u._id} u={u} onApprove={approveUser} onReject={rejectUser} approving={approving} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="p-4 md:p-6">
            <div className="max-w-3xl mb-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-base pl-9 text-sm"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="card overflow-hidden max-w-3xl divide-y divide-border">
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => <UserSkeleton key={i} />)
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-sm">No users found</div>
              ) : (
                filteredUsers.map((u) => <UserRow key={u._id} u={u} currentUser={user} onEditPerms={setPermUser} />)
              )}
            </div>
          </div>
        )}

        {tab === 'groups' && (
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 max-w-3xl">
              <p className="text-sm text-text-muted">{groups.length} groups</p>
              <button onClick={() => setShowNewGroup(true)} className="btn-primary">
                <Plus size={15} />
                New Group
              </button>
            </div>

            {loading ? (
              <div className="card overflow-hidden max-w-3xl divide-y divide-border">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <UserSkeleton key={i} />
                  ))}
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
              <div className="card overflow-hidden max-w-3xl divide-y divide-border">
                {groups.map((g) => (
                  <div key={g._id} className="flex items-center gap-4 p-4">
                    <div className="w-11 h-11 bg-messa-red/10 border border-messa-red/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Hash size={17} className="text-messa-red" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{g.name}</p>
                      {g.description && <p className="text-xs text-text-muted truncate">{g.description}</p>}
                    </div>
                    <p className="text-xs text-text-muted whitespace-nowrap">{formatRelative(g.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {permUser && (
        <PermissionsModal
          user={permUser}
          groups={groups}
          onClose={() => setPermUser(null)}
          onUpdated={(uid, perms) => {
            setUsers((prev) => prev.map((u) => (u._id === uid ? { ...u, permissions: perms } : u)))
          }}
        />
      )}
      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={(g) => setGroups((prev) => [g, ...prev])} />}
    </div>
  )
}