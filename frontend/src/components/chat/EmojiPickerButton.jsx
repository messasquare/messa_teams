// frontend/src/components/chat/EmojiPickerButton.jsx
import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { Smile } from 'lucide-react'

const EmojiPicker = lazy(() => import('emoji-picker-react'))

export default function EmojiPickerButton({ onEmoji }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn-icon"
        title="Emoji"
      >
        <Smile size={18} />
      </button>
      {open && (
        <div className="absolute bottom-12 left-0 z-50 animate-scale-in">
          <Suspense fallback={<div className="w-[300px] h-[350px] bg-card rounded-xl border border-border animate-pulse" />}>
            <EmojiPicker
              theme="dark"
              onEmojiClick={(e) => {
                onEmoji(e.emoji)
                setOpen(false)
              }}
              width={300}
              height={350}
              searchDisabled={false}
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
              lazyLoadEmojis
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}