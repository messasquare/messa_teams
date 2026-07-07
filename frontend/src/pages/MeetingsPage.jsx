// frontend/src/pages/MeetingsPage.jsx
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { toast } from 'sonner'
import {
  Video, Plus, X, Calendar, Clock, ExternalLink, Loader,
  Copy, Maximize2, Minimize2, Search, PhoneOff,
} from 'lucide-react'
import { meetingsAPI } from '../lib/api'
import useAuthStore from '../store/auth'
import { cn } from '../lib/utils'
import { format, isPast, isFuture, isToday } from 'date-fns'

// ─── Embedded Jitsi ───
function JitsiEmbedded({ url, title, onClose }) {
  const [fullscreen, setFullscreen] = useState(false)
  const roomName = url?.split('/').pop() || 'meeting'

  return (
    <div
      className={cn(
        'fixed z-[60] bg-black border border-border shadow-modal transition-all',
        fullscreen ? 'inset-0' : 'bottom-4 right-4 w-[720px] h-[540px] rounded-2xl overflow-hidden max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]'
      )}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-2 h-2 bg-messa-red rounded-full animate-pulse" />
          <span className="text-white text-sm font-semibold truncate max-w-[300px]">{title || 'Live Meeting'}</span>
        </div>
        <div className="flex items-center gap-1 pointer-events-auto">
          <a href={url} target="_blank" rel="noreferrer" className="btn-icon-sm bg-black/50 backdrop-blur-md text-white hover:bg-black/70" title="Open in new tab">
            <ExternalLink size={14} />
          </a>
          <button onClick={() => setFullscreen(!fullscreen)} className="btn-icon-sm bg-black/50 backdrop-blur-md text-white hover:bg-black/70">
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={onClose} className="btn-icon-sm bg-messa-red text-white hover:bg-messa-red-dark">
            <PhoneOff size={14} />
          </button>
        </div>
      </div>

      <iframe
        src={url}
        allow="camera; microphone; display-capture; autoplay; clipboard-write"
        className="w-full h-full border-0"
        title={title || 'Jitsi Meeting'}
      />
    </div>
  )
}

// ─── New Meeting Modal ───
function NewMeetingModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration: 60,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Meeting title required')
      return
    }
    setLoading(true)
    try {
      const res = await meetingsAPI.create({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
      })
      onCreated(res.data)
      toast.success('Meeting created!')
      onClose()
    } catch {
      toast.error('Failed to create meeting')
    } finally {
      setLoading(false)
    }
  }

  const startNow = () => {
    const now = new Date()
    const iso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setForm((p) => ({ ...p, scheduled_at: iso }))
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">New Meeting</h2>
            <p className="text-xs text-text-muted mt-0.5">Powered by Jitsi Meet</p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Meeting Title *</label>
            <input
              className="input-base"
              placeholder="Team standup, Sprint planning..."
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
              autoFocus
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Agenda</label>
            <textarea
              className="input-base"
              rows={2}
              placeholder="What will be discussed..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              maxLength={300}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Date & Time</label>
              <input
                type="datetime-local"
                className="input-base"
                value={form.scheduled_at}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
              />
              <button type="button" onClick={startNow} className="text-xs text-messa-red hover:underline mt-1">
                Start now →
              </button>
            </div>
            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Duration</label>
              <select className="input-base" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))}>
                {[15, 30, 45, 60, 90, 120].map((d) => (
                  <option key={d} value={d}>
                    {d} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-xl p-3 flex items-start gap-2">
            <Video size={14} className="text-messa-red mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">A unique Jitsi Meet room will be created. Anyone with the link can join.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <div className="spinner" /> : 'Create Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Meeting Card ───
const MeetingCard = memo(function MeetingCard({ meeting, onJoin }) {
  const isPastMeeting = meeting.scheduled_at && isPast(new Date(meeting.scheduled_at))
  const isTodayMeeting = meeting.scheduled_at && isToday(new Date(meeting.scheduled_at))
  const isLive = isTodayMeeting && !isPastMeeting

  const copyLink = () => {
    navigator.clipboard.writeText(meeting.jitsi_url)
    toast.success('Link copied!')
  }

  return (
    <div className="card card-hover p-4 transition-all group">
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
            isPastMeeting ? 'bg-muted' : isLive ? 'bg-messa-red/20 shadow-glow-red' : 'bg-messa-red/10'
          )}
        >
          <Video size={19} className={isPastMeeting ? 'text-text-muted' : 'text-messa-red'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="font-semibold text-white truncate">{meeting.title}</h3>
            {isLive && (
              <span className="text-[9px] font-bold bg-messa-red/20 text-messa-red border border-messa-red/30 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                Live
              </span>
            )}
          </div>
          {meeting.description && <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{meeting.description}</p>}
        </div>
        {isPastMeeting && <span className="text-[10px] text-text-muted bg-muted px-2 py-1 rounded flex-shrink-0 font-medium">Past</span>}
      </div>

      <div className="flex items-center gap-3 text-xs text-text-secondary mb-3 flex-wrap">
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
        {meeting.duration && <span className="text-text-muted">· {meeting.duration}min</span>}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => onJoin(meeting)} className={cn('btn-primary flex-1 py-2 text-sm', isPastMeeting && 'opacity-80')}>
          <Video size={14} />
          {isPastMeeting ? 'Rejoin Room' : isLive ? 'Join Now' : 'Join'}
        </button>
        <button onClick={copyLink} className="btn-icon border border-border hover:border-messa-red/40" title="Copy link">
          <Copy size={14} />
        </button>
        <a href={meeting.jitsi_url} target="_blank" rel="noreferrer" className="btn-icon border border-border hover:border-messa-red/40" title="Open in new tab">
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
})

// ─── MAIN PAGE ───
export default function MeetingsPage() {
  const { user } = useAuthStore()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [activeJitsi, setActiveJitsi] = useState(null)
  const [search, setSearch] = useState('')

  const canCreate = ['founder', 'co_founder', 'core_team'].includes(user?.role)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await meetingsAPI.list()
        if (mounted) setMeetings(res.data || [])
      } catch {
        if (mounted) toast.error('Failed to load meetings')
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
    () => meetings.filter((m) => !search || m.title?.toLowerCase().includes(search.toLowerCase())),
    [meetings, search]
  )

  const { upcoming, past } = useMemo(() => {
    const upcoming = []
    const past = []
    filtered.forEach((m) => {
      if (!m.scheduled_at || isFuture(new Date(m.scheduled_at)) || isToday(new Date(m.scheduled_at))) {
        upcoming.push(m)
      } else {
        past.push(m)
      }
    })
    return { upcoming, past }
  }, [filtered])

  const handleJoin = useCallback((meeting) => {
    setActiveJitsi(meeting)
  }, [])

  const MeetingSkeleton = () => (
    <div className="card p-4 space-y-3">
      <div className="flex gap-3">
        <div className="skeleton w-11 h-11 rounded-xl" />
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
      <div className="flex items-center gap-4 px-4 md:px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Meetings</h1>
          <p className="text-xs text-text-muted">
            {meetings.length} total · {upcoming.length} upcoming
          </p>
        </div>

        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9 text-sm"
              placeholder="Search meetings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {canCreate && (
          <button onClick={() => setShowNew(true)} className="btn-primary flex-shrink-0">
            <Plus size={16} />
            New Meeting
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <MeetingSkeleton key={i} />
              ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center">
              <Video size={36} className="text-text-muted" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white mb-1">No meetings yet</h3>
              <p className="text-sm text-text-muted">{canCreate ? 'Create your first meeting' : 'Meetings will appear here'}</p>
            </div>
            {canCreate && (
              <button onClick={() => setShowNew(true)} className="btn-primary">
                <Plus size={16} /> Create Meeting
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 max-w-7xl mx-auto">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <span className="w-2 h-2 bg-messa-red rounded-full animate-pulse" />
                  Upcoming ({upcoming.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcoming.map((m) => (
                    <MeetingCard key={m._id} meeting={m} onJoin={handleJoin} />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Clock size={13} />
                  Past ({past.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
                  {past.map((m) => (
                    <MeetingCard key={m._id} meeting={m} onJoin={handleJoin} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {activeJitsi && <JitsiEmbedded url={activeJitsi.jitsi_url} title={activeJitsi.title} onClose={() => setActiveJitsi(null)} />}

      {showNew && <NewMeetingModal onClose={() => setShowNew(false)} onCreated={(m) => setMeetings((prev) => [m, ...prev])} />}
    </div>
  )
}