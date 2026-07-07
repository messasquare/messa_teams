// frontend/src/components/chat/TypingIndicator.jsx
import { memo } from 'react'
import Avatar from '../Avatar'

function TypingIndicator({ typers }) {
  if (!typers?.length) return null

  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div className="w-8 flex-shrink-0">
        <Avatar name={typers[0]?.name} size="sm" />
      </div>
      <div className="msg-bubble-in px-3 py-2.5">
        <div className="flex items-center gap-1">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  )
}

export default memo(TypingIndicator)