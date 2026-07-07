// frontend/src/components/chat/MessageBubble.jsx
import { memo, useState, useRef, useEffect } from 'react'
import { CheckCheck, Download, Play, Pause, MapPin, FileText } from 'lucide-react'
import { cn, formatTime, formatFileSize, linkify } from '../../lib/utils'
import Avatar from '../Avatar'

// ─── Audio Player (memoized) ───
const AudioPlayer = memo(function AudioPlayer({ url }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio

    const onLoad = () => setDuration(audio.duration || 0)
    const onTime = () => setProgress(audio.currentTime)
    const onEnd = () => {
      setPlaying(false)
      setProgress(0)
    }

    audio.addEventListener('loadedmetadata', onLoad)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onLoad)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
    }
  }, [url])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
    setPlaying(!playing)
  }

  const seek = (e) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    audio.currentTime = Number(e.target.value)
    setProgress(Number(e.target.value))
  }

  const fmt = (s) => {
    const t = Math.floor(s || 0)
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }

  const percent = duration ? (progress / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 min-w-[220px] py-1">
      <button
        onClick={toggle}
        className="w-9 h-9 bg-messa-red hover:bg-messa-red-dark rounded-full flex items-center justify-center flex-shrink-0 transition-colors active:scale-95"
      >
        {playing ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="relative h-1 bg-black/30 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-messa-red transition-all duration-100"
            style={{ width: `${percent}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 1}
          value={progress}
          onChange={seek}
          step={0.1}
          className="w-full mt-1 h-1 opacity-0 cursor-pointer -mt-1 relative"
        />
      </div>
      <span className="text-[10px] font-mono text-white/60 flex-shrink-0">
        {fmt(playing ? progress : duration || progress)}
      </span>
    </div>
  )
})

// ─── Image with lightbox ───
const ImageAttachment = memo(function ImageAttachment({ url, name }) {
  const [lightbox, setLightbox] = useState(false)
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="bg-black/30 rounded-lg p-3 flex items-center gap-2">
        <FileText size={16} className="text-text-muted" />
        <span className="text-xs text-text-muted">Image failed to load</span>
      </div>
    )
  }

  return (
    <>
      <img
        src={url}
        alt={name || 'Image'}
        onError={() => setError(true)}
        onClick={() => setLightbox(true)}
        loading="lazy"
        className="rounded-lg max-w-[280px] max-h-[240px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
      />
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(false)}
        >
          <img src={url} alt={name} className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20"
            onClick={() => setLightbox(false)}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
})

// ─── File attachment ───
const FileAttachment = memo(function FileAttachment({ att }) {
  return (
    <a
      href={att.url}
      download={att.name}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 bg-black/25 hover:bg-black/40 rounded-lg p-2.5 transition-colors min-w-[220px]"
    >
      <div className="w-10 h-10 bg-messa-red/20 border border-messa-red/30 rounded-lg flex items-center justify-center flex-shrink-0">
        <FileText size={18} className="text-messa-red" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{att.name || 'File'}</p>
        {att.bytes && <p className="text-[10px] text-white/60">{formatFileSize(att.bytes)}</p>}
      </div>
      <Download size={14} className="text-white/60 flex-shrink-0" />
    </a>
  )
})

// ─── MAIN COMPONENT ───
function MessageBubble({ msg, isOwn, showAvatar, senderName }) {
  const isLocation = msg.location && (msg.location.lat || msg.location.url)
  const attachments = msg.attachments || []

  const renderAttachment = (att, idx) => {
    const type = (att.type || '').toLowerCase()

    if (type.includes('image') || type === 'image') {
      return <ImageAttachment key={idx} url={att.url} name={att.name} />
    }
    if (type.includes('video') || type === 'video') {
      return (
        <video
          key={idx}
          src={att.url}
          controls
          preload="metadata"
          className="rounded-lg max-w-[280px] max-h-[240px]"
        />
      )
    }
    if (type === 'voice' || type === 'audio' || type.includes('audio')) {
      return <AudioPlayer key={idx} url={att.url} />
    }
    return <FileAttachment key={idx} att={att} />
  }

  return (
    <div className={cn('flex items-end gap-2 animate-fade-in', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar column */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && <Avatar name={senderName} size="sm" />}
        </div>
      )}

      <div className={cn('flex flex-col gap-0.5 min-w-0', isOwn ? 'items-end' : 'items-start', 'max-w-[70%]')}>
        {/* Sender name */}
        {!isOwn && showAvatar && senderName && (
          <span className="text-[11px] text-text-muted px-2 font-medium">{senderName}</span>
        )}

        <div className={isOwn ? 'msg-bubble-out' : 'msg-bubble-in'}>
          {/* Reply preview */}
          {msg.reply_to && (
            <div className="bg-black/25 rounded-md px-2 py-1.5 mb-2 border-l-2 border-messa-red">
              <p className="text-[10px] text-messa-red font-semibold">{msg.reply_to.sender_name}</p>
              <p className="text-[11px] text-white/70 truncate">{msg.reply_to.text || 'Attachment'}</p>
            </div>
          )}

          {/* Location */}
          {isLocation && (
            <a
              href={msg.location.url || `https://maps.google.com/?q=${msg.location.lat},${msg.location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 bg-black/25 hover:bg-black/40 rounded-lg p-2.5 transition-colors mb-1"
            >
              <div className="w-9 h-9 bg-messa-red/20 rounded-lg flex items-center justify-center">
                <MapPin size={16} className="text-messa-red" />
              </div>
              <div>
                <p className="text-xs font-medium">📍 Live Location</p>
                {msg.location.lat && (
                  <p className="text-[10px] text-white/60 font-mono">
                    {Number(msg.location.lat).toFixed(4)}, {Number(msg.location.lng).toFixed(4)}
                  </p>
                )}
              </div>
            </a>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className={cn('space-y-1', msg.text && 'mb-2')}>
              {attachments.map(renderAttachment)}
            </div>
          )}

          {/* Text */}
          {msg.text && !isLocation && (
            <p
              className="text-[14px] leading-[1.4] whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: linkify(msg.text) }}
            />
          )}

          {/* Time + status */}
          <div className={cn('flex items-center gap-1 mt-0.5 -mb-0.5', isOwn ? 'justify-end' : 'justify-start')}>
            <span className="text-[10px] text-white/50">{formatTime(msg.created_at)}</span>
            {isOwn && <CheckCheck size={12} className="text-messa-red" />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(MessageBubble, (prev, next) => {
  return (
    prev.msg._id === next.msg._id &&
    prev.isOwn === next.isOwn &&
    prev.showAvatar === next.showAvatar
  )
})