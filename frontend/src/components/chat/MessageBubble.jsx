// frontend/src/components/chat/MessageBubble.jsx
import { useState } from 'react'
import { Check, CheckCheck, Download, Play, Pause, MapPin, FileText, Mic } from 'lucide-react'
import { cn, formatTime, formatFileSize } from '../../lib/utils'
import Avatar from '../Avatar'

function AudioPlayer({ url }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useState(null)

  const [audio] = useState(() => {
    const a = new Audio(url)
    a.onended = () => setPlaying(false)
    a.ontimeupdate = () => setProgress(a.currentTime)
    a.onloadedmetadata = () => setDuration(a.duration)
    return a
  })

  const toggle = () => {
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }

  const fmt = s => {
    const t = Math.floor(s || 0)
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button
        onClick={toggle}
        className="w-8 h-8 bg-messa-red rounded-full flex items-center justify-center flex-shrink-0"
      >
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </button>
      <div className="flex-1">
        <div className="flex items-end gap-[2px] h-6 mb-1">
          {Array(20).fill(0).map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-full flex-1 transition-colors',
                progress && duration && (i / 20) < (progress / duration)
                  ? 'bg-messa-red'
                  : 'bg-muted-2'
              )}
              style={{ height: Math.random() * 16 + 4 }}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={duration || 1}
          value={progress}
          onChange={e => { audio.currentTime = e.target.value; setProgress(Number(e.target.value)) }}
          className="w-full"
        />
      </div>
      <span className="text-xs font-mono text-text-muted">{fmt(progress || duration)}</span>
    </div>
  )
}

export default function MessageBubble({ msg, isOwn, showAvatar, senderName }) {
  const [imgError, setImgError] = useState(false)
  const isLocation = msg.location && (msg.location.lat || msg.location.url)
  const attachments = msg.attachments || []

  const renderAttachment = (att) => {
    const type = att.type || msg.type

    if (type === 'image' && !imgError) {
      return (
        <a href={att.url} target="_blank" rel="noreferrer" className="block">
          <img
            src={att.url}
            alt={att.name || 'Image'}
            onError={() => setImgError(true)}
            className="rounded-xl max-w-[260px] max-h-[200px] object-cover cursor-pointer
                       hover:opacity-90 transition-opacity"
          />
        </a>
      )
    }

    if (type === 'video') {
      return (
        <video
          src={att.url}
          controls
          className="rounded-xl max-w-[260px] max-h-[200px]"
        />
      )
    }

    if (type === 'voice' || type === 'audio') {
      return <AudioPlayer url={att.url} />
    }

    // Generic file
    return (
      <a
        href={att.url}
        download={att.name}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 bg-black/20 rounded-xl p-3 hover:bg-black/30 transition-colors min-w-[200px]"
      >
        <div className="w-10 h-10 bg-messa-red/20 rounded-xl flex items-center justify-center">
          <FileText size={18} className="text-messa-red" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{att.name || 'File'}</p>
          {att.bytes && (
            <p className="text-xs text-text-muted">{formatFileSize(att.bytes)}</p>
          )}
        </div>
        <Download size={16} className="text-text-muted flex-shrink-0" />
      </a>
    )
  }

  return (
    <div className={cn(
      'flex items-end gap-2 group animate-fade-in',
      isOwn ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && <Avatar name={senderName} size="sm" />}
        </div>
      )}

      <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start', 'max-w-[75%]')}>
        {/* Sender name in group */}
        {!isOwn && showAvatar && senderName && (
          <span className="text-xs text-text-muted px-2">{senderName}</span>
        )}

        <div className={cn(isOwn ? 'message-bubble-out' : 'message-bubble-in')}>
          {/* Reply context */}
          {msg.reply_to && (
            <div className="bg-black/20 rounded-lg px-3 py-2 mb-2 border-l-2 border-messa-red">
              <p className="text-xs text-messa-red font-medium">{msg.reply_to.sender_name}</p>
              <p className="text-xs text-text-muted truncate">{msg.reply_to.text || 'Attachment'}</p>
            </div>
          )}

          {/* Location */}
          {isLocation && (
            <a
              href={msg.location.url || `https://maps.google.com/?q=${msg.location.lat},${msg.location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-black/20 rounded-xl p-3 hover:bg-black/30 transition-colors"
            >
              <div className="w-8 h-8 bg-messa-red/20 rounded-lg flex items-center justify-center">
                <MapPin size={16} className="text-messa-red" />
              </div>
              <div>
                <p className="text-sm font-medium">Live Location</p>
                {msg.location.lat && (
                  <p className="text-xs text-text-muted">
                    {Number(msg.location.lat).toFixed(4)}, {Number(msg.location.lng).toFixed(4)}
                  </p>
                )}
              </div>
            </a>
          )}

          {/* Attachments */}
          {attachments.map((att, i) => (
            <div key={i} className="mb-1">
              {renderAttachment(att)}
            </div>
          ))}

          {/* Text */}
          {msg.text && !isLocation && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
          )}

          {/* Meta: time + read status */}
          <div className={cn(
            'flex items-center gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className="text-[10px] text-text-muted">{formatTime(msg.created_at)}</span>
            {isOwn && (
              <CheckCheck size={12} className="text-messa-red" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}