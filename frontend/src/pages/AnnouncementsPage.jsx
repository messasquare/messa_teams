// frontend/src/pages/AnnouncementsPage.jsx
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { toast } from 'sonner'
import { Megaphone, Plus, X, Loader, Search } from 'lucide-react'
import { announcementsAPI } from '../lib/api'
import useAuthStore from '../store/auth'
import Avatar from '../components/Avatar'
import { cn, formatRelative, getRoleBadgeColor, getRoleLabel, linkify } from '../lib/utils'

// ─── Announcement Card ───
const AnnouncementCard = memo(function AnnouncementCard({ ann }) {
  return (
    <div className="card card-hover p-5 transition-all">
      <div className="flex items-start gap-3">
        <Avatar name={ann.author_name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-white">{ann.author_name}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider', getRoleBadgeColor(ann.author_role))}>
              {getRoleLabel(ann.author_role)}
            </span>
            <span className="text-xs text-text-muted ml-auto">{formatRelative(ann.created_at)}</span>
          </div>

          {ann.title && <h3 className="text-base font-semibold text-white mb-2">{ann.title}</h3>}

          <p
            className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: linkify(ann.content || ann.text || '') }}
          />

          {ann.attachments?.map((att, i) => (
            <a key={i} href={att.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 text-sm text-messa-red hover:text-messa-red-light hover:underline">
              📎 {att.name || 'Attachment'}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
})

// ─── New Announcement Modal ───
function NewAnnouncementModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.content.trim()) {
      toast.error('Content is required')
      return
    }
    setLoading(true)
    try {
      const res = await announcementsAPI.create({
        title: form.title.trim(),
        content: form.content.trim(),
      })
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
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">New Announcement</h2>
            <p className="text-xs text-text-muted mt-0.5">Broadcast to the entire team</p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Title</label>
            <input
              className="input-base"
              placeholder="Announcement title (optional)"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              autoFocus
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Message *</label>
            <textarea
              className="input-base"
              rows={6}
              placeholder="What do you want to announce?"
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              required
              maxLength={2000}
            />
            <p className="text-[10px] text-text-muted mt-1">{form.content.length}/2000 characters</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <div className="spinner" /> : (
                <>
                  <Megaphone size={15} /> Post
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ───
export default function AnnouncementsPage() {
  const { user } = useAuthStore()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')

  const canCreate = ['founder', 'co_founder', 'core_team'].includes(user?.role)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await announcementsAPI.list()
        if (mounted) setAnnouncements(res.data || [])
      } catch {
        if (mounted) toast.error('Failed to load announcements')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(
    () =>
      announcements.filter(
        (a) =>
          !search ||
          a.title?.toLowerCase().includes(search.toLowerCase()) ||
          a.content?.toLowerCase().includes(search.toLowerCase())
      ),
    [announcements, search]
  )

  const AnnSkeleton = () => (
    <div className="card p-5">
      <div className="flex gap-3">
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
      <div className="flex items-center gap-4 px-4 md:px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Announcements</h1>
          <p className="text-xs text-text-muted">{announcements.length} total posts</p>
        </div>

        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9 text-sm"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <AnnSkeleton key={i} />
              ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center">
              <Megaphone size={36} className="text-text-muted" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white mb-1">{search ? 'No results' : 'No announcements'}</h3>
              <p className="text-sm text-text-muted">
                {search ? 'Try a different search' : canCreate ? 'Post your first announcement' : 'Announcements will appear here'}
              </p>
            </div>
            {canCreate && !search && (
              <button onClick={() => setShowNew(true)} className="btn-primary">
                <Plus size={16} /> Post Announcement
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {filtered.map((ann) => (
              <AnnouncementCard key={ann._id} ann={ann} />
            ))}
          </div>
        )}
      </div>

      {showNew && <NewAnnouncementModal onClose={() => setShowNew(false)} onCreated={(a) => setAnnouncements((prev) => [a, ...prev])} />}
    </div>
  )
}