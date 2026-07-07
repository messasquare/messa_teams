// frontend/src/components/chat/VoiceRecorder.jsx
import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Send, Trash2, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'

export default function VoiceRecorder({ onSend, onCancel }) {
  const [state, setState] = useState('idle') // idle | recording | recorded | playing
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [bars, setBars] = useState(Array(30).fill(4))

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
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      src.connect(analyser)
      analyserRef.current = analyser

      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      })
      mediaRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = e => e.data.size > 0 && chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setState('recorded')
      }

      mr.start(100)
      setState('recording')

      let secs = 0
      timerRef.current = setInterval(() => {
        secs++
        setDuration(secs)
        if (secs >= 120) stopRecording()
      }, 1000)

      // Visualize
      const draw = () => {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const newBars = Array(30).fill(0).map((_, i) => {
          const v = data[Math.floor(i * data.length / 30)] || 0
          return Math.max(4, (v / 255) * 48)
        })
        setBars(newBars)
        animRef.current = requestAnimationFrame(draw)
      }
      draw()
    } catch (err) {
      toast.error('Microphone access denied')
      onCancel()
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
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
      audioRef.current.play()
      setState('playing')
    }
  }

  const handleSend = async () => {
    if (!audioBlob) return
    onSend(audioBlob, duration)
  }

  const handleDiscard = () => {
    cleanup()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    onCancel()
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex items-center gap-3 bg-muted rounded-2xl px-4 py-3 border border-border">
      {/* Discard */}
      <button onClick={handleDiscard} className="text-text-muted hover:text-messa-red transition-colors">
        <Trash2 size={18} />
      </button>

      {/* Waveform / Controls */}
      <div className="flex-1 flex items-center gap-3">
        {state === 'recording' ? (
          <>
            <div className="w-2 h-2 bg-messa-red rounded-full animate-recording-pulse flex-shrink-0" />
            <div className="flex items-end gap-[2px] h-12 flex-1">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="bg-messa-red rounded-full flex-1 transition-all duration-75"
                  style={{ height: h }}
                />
              ))}
            </div>
            <span className="text-messa-red text-sm font-mono font-bold">{fmt(duration)}</span>
          </>
        ) : (
          <>
            <button
              onClick={togglePlay}
              className="w-8 h-8 bg-messa-red rounded-full flex items-center justify-center flex-shrink-0"
            >
              {state === 'playing' ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className="flex-1">
              <div className="flex items-end gap-[2px] h-8">
                {Array(30).fill(0).map((_, i) => (
                  <div
                    key={i}
                    className="bg-muted-2 rounded-full flex-1"
                    style={{ height: Math.random() * 24 + 4 }}
                  />
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={duration || 1}
                value={currentTime}
                onChange={e => {
                  if (audioRef.current) audioRef.current.currentTime = e.target.value
                  setCurrentTime(Number(e.target.value))
                }}
                className="w-full mt-1"
              />
            </div>
            <span className="text-text-secondary text-xs font-mono">{fmt(duration)}</span>
          </>
        )}
      </div>

      {/* Record Stop / Send */}
      {state === 'recording' ? (
        <button
          onClick={stopRecording}
          className="w-10 h-10 bg-messa-red rounded-full flex items-center justify-center"
        >
          <Square size={16} />
        </button>
      ) : (
        <button
          onClick={handleSend}
          className="w-10 h-10 bg-messa-red rounded-full flex items-center justify-center"
        >
          <Send size={16} />
        </button>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={e => setCurrentTime(Math.floor(e.target.currentTime))}
          onEnded={() => setState('recorded')}
          className="hidden"
        />
      )}
    </div>
  )
}