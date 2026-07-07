// frontend/src/components/chat/TypingIndicator.jsx
import Avatar from '../Avatar'

export default function TypingIndicator({ typers }) {
  if (!typers?.length) return null
  const names = typers.slice(0, 2).map(t => t.name).join(', ')

  return (
    <div className="flex items-end gap-2">
      <div className="w-8 flex-shrink-0">
        <Avatar name={typers[0]?.name} size="sm" />
      </div>
      <div className="message-bubble-in px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
      <span className="text-xs text-text-muted">{names} typing...</span>
    </div>
  )
}