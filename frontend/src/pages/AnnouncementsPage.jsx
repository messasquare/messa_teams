// frontend/src/pages/AnnouncementsPage.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Megaphone, Plus, X, Loader, Pin, Search, Bell, BellOff
} from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/auth'
import Avatar from '../components/Avatar'
import { cn, formatRelative, getRoleBadgeColor, getRoleLabel } from '../lib/utils'

function AnnouncementCard({ ann }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 hover:border-messa-red/20 transition-all"
    >
      <div className="flex items-start gap-4">
        <Avatar name={ann.author_name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-white">{ann.author_name}</span>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-md border font-medium',
              getRoleBadgeColor(ann.author_role)
            )}>
              {getRoleLabel(ann.author_role)}
            </span>
            <span className="text-xs text-text-muted ml-auto">
              {formatRelative(ann.created_at)}
            </span>
          </div>

          {ann.title && (
            <h3 className="text-base font-semibold text-white mb-2">{ann.title}</h3>
          )}

          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {ann.content || ann.text}
          </p>

          {ann.attachments?.map((att, i) => (
            <a
              key={i}
              href={att.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm text-messa-red hover:text-messa-red-light"
            >
              📎 {att.name || 'Attachment'}
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function NewAnnouncementModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.content.trim()) { toast.error('Content required'); return }
    setLoading(true)
    try {
      const res = await api.post('/api/announcements', form)
      onCreated(res.data)
      toast.success('Announcement posted!')
      onClose()
    } catch {
      toast.error('Failed to post announcement')
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
          <h2 className="text-xl font-bold text-white">New Announcement</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block">Title (optional)</label>
            <input
              className="input-base"
              placeholder="Announcement title..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block">Message *</label>
            <textarea
              className="input-base resize-none"
              rows={5}
              placeholder="Write your announcement..."
              value={form.content}
              onChange={e => set('content', e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader size={16} className="animate-spin" /> : (
                <><Megaphone size={15} /> Post Announcement</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function AnnouncementsPage() {
  const { user } = useAuthStore()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')

  const canCreate = ['founder', 'co_founder', 'core_team'].includes(user?.role)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/announcements')
      setAnnouncements(res.data || [])
    } catch {
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const filtered = announcements.filter(a =>
    !search ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.content?.toLowerCase().includes(search.toLowerCase())
  )

  const AnnSkeleton = () => (
    <div className="card p-5">
      <div className="flex gap-4">
        <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-4/5 rounded" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-dark overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Announcements</h1>
          <p className="text-xs text-text-muted">Team-wide broadcasts</p>
        </div>

        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9 text-sm"
              placeholder="Search announcements..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {canCreate && (
          <button onClick={() => setShowNew(true)} className="btn-primary flex-shrink-0">
            <Plus size={16} />
            Post
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {Array(3).fill(0).map((_, i) => <AnnSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center">
              <Megaphone size={36} className="text-text-muted" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white mb-1">No announcements</h3>
              <p className="text-sm text-text-muted">
                {canCreate ? 'Post your first announcement' : 'Announcements will appear here'}
              </p>
            </div>
            {canCreate && (
              <button onClick={() => setShowNew(true)} className="btn-primary">
                <Plus size={16} /> Post Announcement
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {filtered.map(ann => (
              <AnnouncementCard key={ann._id} ann={ann} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNew && (
          <NewAnnouncementModal
            onClose={() => setShowNew(false)}
            onCreated={(ann) => setAnnouncements(prev => [ann, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  )
}