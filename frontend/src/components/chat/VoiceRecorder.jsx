// frontend/src/components/chat/VoiceRecorder.jsx
import { useState, useRef, useEffect } from 'react'
import { Square, Send, Trash2, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'

export default function VoiceRecorder({ onSend, onCancel }) {
  const [state, setState] = useState('idle') // idle | recording | recorded | playing
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [bars, setBars] = useState(Array(24).fill(4))
  const [playbackTime, setPlaybackTime] = useState(0)

  const mediaRef = useRef(null)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  const analyserRef = useRef(null)
  const animRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    startRecording()
    return () => cleanup()
  }, [])

  const cleanup = () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioRef.current?.pause()
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      src.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : 'audio/mp4'

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setState('recorded')
      }

      mr.start(200)
      setState('recording')

      let secs = 0
      timerRef.current = setInterval(() => {
        secs++
        setDuration(secs)
        if (secs >= 180) stopRecording() // Max 3 min
      }, 1000)

      const draw = () => {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const newBars = Array(24)
          .fill(0)
          .map((_, i) => {
            const v = data[Math.floor((i * data.length) / 24)] || 0
            return Math.max(4, (v / 255) * 40)
          })
        setBars(newBars)
        animRef.current = requestAnimationFrame(draw)
      }
      draw()
    } catch (err) {
      toast.error('Microphone access denied. Please allow microphone permissions.')
      onCancel()
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop()
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (state === 'playing') {
      audioRef.current.pause()
      setState('recorded')
    } else {
      audioRef.current.play().catch(() => {})
      setState('playing')
    }
  }

  const handleSend = () => {
    if (!audioBlob) return
    onSend(audioBlob, duration)
  }

  const handleDiscard = () => {
    cleanup()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    onCancel()
  }

  const fmt = (s) => {
    const t = Math.floor(s || 0)
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3 bg-muted rounded-2xl px-3 py-2 border border-border animate-slide-up">
      <button
        onClick={handleDiscard}
        className="w-9 h-9 rounded-full hover:bg-messa-red/20 flex items-center justify-center text-text-muted hover:text-messa-red transition-all"
      >
        <Trash2 size={16} />
      </button>

      <div className="flex-1 flex items-center gap-2">
        {state === 'recording' ? (
          <>
            <div className="w-2 h-2 bg-messa-red rounded-full" style={{ animation: 'recordingPulse 1.5s infinite' }} />
            <div className="flex items-end gap-[3px] h-10 flex-1 justify-center">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="bg-messa-red rounded-full flex-1 max-w-[3px] transition-all duration-75"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <span className="text-messa-red text-sm font-mono font-bold">{fmt(duration)}</span>
          </>
        ) : (
          <>
            <button
              onClick={togglePlay}
              className="w-9 h-9 bg-messa-red rounded-full flex items-center justify-center flex-shrink-0"
            >
              {state === 'playing' ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
            </button>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex items-end gap-[3px] h-8 flex-1 justify-center">
                {Array(24)
                  .fill(0)
                  .map((_, i) => {
                    const active = duration && playbackTime / duration > i / 24
                    return (
                      <div
                        key={i}
                        className={`rounded-full flex-1 max-w-[3px] transition-colors ${active ? 'bg-messa-red' : 'bg-border-light'}`}
                        style={{ height: `${8 + Math.sin(i * 0.5) * 12}px` }}
                      />
                    )
                  })}
              </div>
              <span className="text-xs font-mono text-text-secondary">{fmt(duration)}</span>
            </div>
          </>
        )}
      </div>

      {state === 'recording' ? (
        <button
          onClick={stopRecording}
          className="w-10 h-10 bg-messa-red hover:bg-messa-red-dark rounded-full flex items-center justify-center transition-colors active:scale-95"
        >
          <Square size={14} fill="white" />
        </button>
      ) : (
        <button
          onClick={handleSend}
          className="w-10 h-10 bg-messa-red hover:bg-messa-red-dark rounded-full flex items-center justify-center transition-colors active:scale-95"
        >
          <Send size={16} className="text-white" />
        </button>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={(e) => setPlaybackTime(e.target.currentTime)}
          onEnded={() => {
            setState('recorded')
            setPlaybackTime(0)
          }}
          className="hidden"
        />
      )}
    </div>
  )
}