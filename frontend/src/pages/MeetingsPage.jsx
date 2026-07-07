// frontend/src/pages/MeetingsPage.jsx
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Video, Plus, X, Calendar, Clock, Users, ExternalLink,
  Loader, Link, Copy, Maximize2, Minimize2, Search
} from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/auth'
import { cn, formatDate, formatTime, getRoleLabel } from '../lib/utils'
import Avatar from '../components/Avatar'
import { format } from 'date-fns'

function JitsiMeet({ url, onClose }) {
  const iframeRef = useRef(null)
  const [fullscreen, setFullscreen] = useState(false)

  const roomName = url?.split('/').pop()

  return (
    <div className={cn(
      'fixed z-50 bg-dark border border-border shadow-modal',
      fullscreen
        ? 'inset-0'
        : 'bottom-4 right-4 w-[640px] h-[480px] rounded-2xl overflow-hidden'
    )}>
      {/* Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between
                      px-4 py-2 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-messa-red rounded-full animate-pulse" />
          <span className="text-white text-sm font-medium">Live Meeting</span>
          <span className="text-text-muted text-xs">· {roomName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="btn-icon"
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button onClick={onClose} className="btn-icon">
            <X size={15} />
          </button>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src={url}
        allow="camera; microphone; display-capture; autoplay"
        className="w-full h-full border-0"
        title="Jitsi Meeting"
      />
    </div>
  )
}

function NewMeetingModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration: 60,
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title required'); return }
    setLoading(true)
    try {
      const res = await api.post('/api/meetings', form)
      onCreated(res.data)
      toast.success('Meeting scheduled!')
      onClose()
    } catch {
      toast.error('Failed to create meeting')
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
            <h2 className="text-xl font-bold text-white">Schedule Meeting</h2>
            <p className="text-sm text-text-muted">Powered by Jitsi Meet</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block">Meeting Title *</label>
            <input
              className="input-base"
              placeholder="Team standup, Sprint review..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block">Description</label>
            <textarea
              className="input-base resize-none"
              rows={2}
              placeholder="Meeting agenda..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block">Date & Time</label>
              <input
                type="datetime-local"
                className="input-base"
                value={form.scheduled_at}
                onChange={e => set('scheduled_at', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block">Duration (min)</label>
              <select
                className="input-base"
                value={form.duration}
                onChange={e => set('duration', Number(e.target.value))}
              >
                {[15, 30, 45, 60, 90, 120].map(d => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-xl p-3">
            <p className="text-xs text-text-muted">
              🎥 A Jitsi Meet room will be automatically created. You can join directly in the app or open in a new tab.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader size={16} className="animate-spin" /> : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function MeetingCard({ meeting, onJoin }) {
  const { user } = useAuthStore()
  const canCreate = ['founder', 'co_founder', 'core_team'].includes(user?.role)
  const isPast = meeting.scheduled_at && new Date(meeting.scheduled_at) < new Date()

  const copyLink = () => {
    navigator.clipboard.writeText(meeting.jitsi_url)
    toast.success('Meeting link copied!')
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 hover:border-messa-red/30 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            isPast ? 'bg-muted' : 'bg-messa-red/20'
          )}>
            <Video size={18} className={isPast ? 'text-text-muted' : 'text-messa-red'} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{meeting.title}</h3>
            {meeting.description && (
              <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{meeting.description}</p>
            )}
          </div>
        </div>

        {isPast && (
          <span className="text-xs text-text-muted bg-muted px-2 py-1 rounded-lg flex-shrink-0">
            Ended
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
        {meeting.scheduled_at && (
          <>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {format(new Date(meeting.scheduled_at), 'dd MMM yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {format(new Date(meeting.scheduled_at), 'HH:mm')}
            </span>
          </>
        )}
        {meeting.duration && (
          <span>{meeting.duration} min</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onJoin(meeting.jitsi_url)}
          className={cn(
            'btn-primary flex-1 py-2 text-sm',
            isPast && 'opacity-70'
          )}
        >
          <Video size={14} />
          {isPast ? 'Replay Room' : 'Join Meeting'}
        </button>

        <button onClick={copyLink} className="btn-icon border border-border" title="Copy link">
          <Copy size={15} />
        </button>

        <a
          href={meeting.jitsi_url}
          target="_blank"
          rel="noreferrer"
          className="btn-icon border border-border"
          title="Open in new tab"
        >
          <ExternalLink size={15} />
        </a>
      </div>

      {meeting.room_name && (
        <p className="text-[10px] text-text-muted mt-2 font-mono truncate">
          {meeting.room_name}
        </p>
      )}
    </motion.div>
  )
}

export default function MeetingsPage() {
  const { user } = useAuthStore()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [activeJitsi, setActiveJitsi] = useState(null)
  const [search, setSearch] = useState('')

  const canCreate = ['founder', 'co_founder', 'core_team'].includes(user?.role)

  useEffect(() => {
    loadMeetings()
  }, [])

  const loadMeetings = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/meetings')
      setMeetings(res.data || [])
    } catch {
      toast.error('Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }

  const upcoming = meetings.filter(m =>
    !m.scheduled_at || new Date(m.scheduled_at) >= new Date()
  )
  const past = meetings.filter(m =>
    m.scheduled_at && new Date(m.scheduled_at) < new Date()
  )

  const filtered = (list) => list.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase())
  )

  const MeetingSkeleton = () => (
    <div className="card p-4 space-y-3">
      <div className="flex gap-3">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="skeleton h-9 rounded-xl" />
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-dark overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Meetings</h1>
          <p className="text-xs text-text-muted">{meetings.length} total · Jitsi Meet</p>
        </div>

        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9 text-sm"
              placeholder="Search meetings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {canCreate && (
          <button onClick={() => setShowNew(true)} className="btn-primary flex-shrink-0">
            <Plus size={16} />
            Schedule
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(4).fill(0).map((_, i) => <MeetingSkeleton key={i} />)}
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center">
              <Video size={36} className="text-text-muted" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white mb-1">No meetings yet</h3>
              <p className="text-sm text-text-muted">
                {canCreate ? 'Schedule your first meeting' : 'Meetings will appear here'}
              </p>
            </div>
            {canCreate && (
              <button onClick={() => setShowNew(true)} className="btn-primary">
                <Plus size={16} /> Schedule Meeting
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming */}
            {filtered(upcoming).length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-messa-red rounded-full animate-pulse" />
                  Upcoming ({filtered(upcoming).length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered(upcoming).map(m => (
                    <MeetingCard key={m._id} meeting={m} onJoin={setActiveJitsi} />
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {filtered(past).length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <Clock size={14} />
                  Past Meetings ({filtered(past).length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                  {filtered(past).map(m => (
                    <MeetingCard key={m._id} meeting={m} onJoin={setActiveJitsi} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Jitsi Embedded */}
      <AnimatePresence>
        {activeJitsi && (
          <JitsiMeet url={activeJitsi} onClose={() => setActiveJitsi(null)} />
        )}
      </AnimatePresence>

      {/* New Meeting Modal */}
      <AnimatePresence>
        {showNew && (
          <NewMeetingModal
            onClose={() => setShowNew(false)}
            onCreated={(m) => setMeetings(prev => [m, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  )
}