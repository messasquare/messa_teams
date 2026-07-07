// frontend/src/components/chat/EmojiPickerButton.jsx
import { useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'

export default function EmojiPickerButton({ onEmoji }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
        <div className="absolute bottom-12 left-0 z-50">
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
          />
        </div>
      )}
    </div>
  )
}