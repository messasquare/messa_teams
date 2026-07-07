// frontend/src/pages/ChatPage.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Send, Paperclip, MapPin, Mic, Search, Hash, User,
  ChevronLeft, Phone, Video, MoreVertical, Loader,
  MessageSquare, Users, Plus,
} from 'lucide-react'
import useAuthStore from '../store/auth'
import { chatAPI, groupsAPI, adminAPI, uploadAPI } from '../lib/api'
import { cn, formatSmartDate, buildConversationId, playNotificationSound } from '../lib/utils'
import Avatar from '../components/Avatar'
import MessageBubble from '../components/chat/MessageBubble'
import TypingIndicator from '../components/chat/TypingIndicator'
import VoiceRecorder from '../components/chat/VoiceRecorder'
import EmojiPickerButton from '../components/chat/EmojiPickerButton'
import {
  joinConversation, leaveConversation, onNewMessage,
  onTyping, sendTyping,
} from '../lib/socket'

// ─── Skeleton ───
function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="skeleton w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-32 rounded" />
        <div className="skeleton h-2 w-48 rounded" />
      </div>
    </div>
  )
}

function MsgSkeleton({ isOwn }) {
  return (
    <div className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />}
      <div
        className={cn(
          'skeleton rounded-2xl h-10',
          isOwn ? 'w-48 rounded-br-sm' : 'w-64 rounded-bl-sm'
        )}
      />
    </div>
  )
}

// ─── Conversation Item (memoized) ───
function ConvItemComponent({ item, type, active, onSelect, user }) {
  const name = type === 'group' ? item.name : item.name
  const sub = type === 'group' ? item.description || 'Group channel' : item.role?.replace('_', ' ') || ''

  // Check if user can access
  const allowed = useMemo(() => {
    if (type === 'group') {
      if (['founder', 'co_founder', 'core_team'].includes(user.role)) return true
      return user.permissions?.allowed_group_ids?.includes(item._id)
    } else {
      const role = user.role
      const targetRole = item.role
      if (['founder', 'co_founder'].includes(role)) return true
      if (role === 'core_team') return true
      if (role === 'volunteer') {
        if (['founder', 'co_founder'].includes(targetRole)) {
          return user.permissions?.can_dm_founders
        }
        return ['core_team'].includes(targetRole)
      }
      return false
    }
  }, [item, type, user])

  if (!allowed) return null

  return (
    <button
      onClick={() => onSelect({ type, id: item._id, name, data: item })}
      className={cn(
        'flex items-center gap-3 px-4 py-3 w-full text-left transition-all',
        active ? 'bg-messa-red/10 border-l-2 border-messa-red' : 'hover:bg-muted/50 border-l-2 border-transparent'
      )}
    >
      <div className="relative flex-shrink-0">
        {type === 'group' ? (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-messa-red/20 to-messa-red/10 border border-messa-red/30 flex items-center justify-center">
            <Hash size={18} className="text-messa-red" />
          </div>
        ) : (
          <Avatar name={name} size="md" online={item.online} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-semibold text-white truncate">{name}</span>
        </div>
        <p className="text-xs text-text-muted truncate capitalize">{sub}</p>
      </div>
    </button>
  )
}

const ConvItem = ConvItemComponent

// ─── Empty State ───
function EmptyState({ icon: Icon, title, desc, cta }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
        <Icon size={28} className="text-text-muted" />
      </div>
      <div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-text-muted max-w-xs">{desc}</p>
      </div>
      {cta}
    </div>
  )
}

// ─── MAIN CHAT PAGE ───
export default function ChatPage() {
  const { user } = useAuthStore()
  const [groups, setGroups] = useState([])
  const [dmUsers, setDmUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [typers, setTypers] = useState([])
  const [showVoice, setShowVoice] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('groups')
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimerRef = useRef(null)
  const textareaRef = useRef(null)
  const prevConvRef = useRef(null)

  // Compute conversation ID
  const conversationId = useMemo(() => {
    if (!selected) return null
    return selected.type === 'group'
      ? `group:${selected.id}`
      : buildConversationId(user._id, selected.id)
  }, [selected, user._id])

  // ─── Load initial conversation list ───
  useEffect(() => {
    let mounted = true
    const load = async () => {
      setListLoading(true)
      try {
        const [grpRes, usrRes] = await Promise.all([
          groupsAPI.list(),
          adminAPI.users(),
        ])
        if (!mounted) return
        setGroups(grpRes.data || [])
        setDmUsers((usrRes.data || []).filter((u) => u._id !== user._id && u.approved !== false))
      } catch (err) {
        if (mounted) toast.error('Failed to load conversations')
      } finally {
        if (mounted) setListLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [user._id])

  // ─── Join/leave conversation & load messages ───
  useEffect(() => {
    if (!conversationId) return
    let mounted = true

    if (prevConvRef.current && prevConvRef.current !== conversationId) {
      leaveConversation(prevConvRef.current)
    }
    prevConvRef.current = conversationId
    joinConversation(conversationId)

    const loadMsgs = async () => {
      setLoading(true)
      setMessages([])
      try {
        const res = await chatAPI.getMessages(conversationId)
        if (!mounted) return
        setMessages(res.data || [])
        setTimeout(scrollToBottom, 50)
      } catch {
        if (mounted) toast.error('Failed to load messages')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadMsgs()

    return () => {
      mounted = false
    }
  }, [conversationId])

  // ─── Socket: new messages ───
  useEffect(() => {
    if (!conversationId) return
    const off = onNewMessage((msg) => {
      if (msg.conversation_id !== conversationId) return
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev
        return [...prev, msg]
      })
      if (msg.sender_id !== user._id) {
        playNotificationSound('message')
      }
      setTimeout(scrollToBottom, 50)
    })
    return off
  }, [conversationId, user._id])

  // ─── Socket: typing ───
  useEffect(() => {
    if (!conversationId) return
    const off = onTyping((data) => {
      if (data.conversation_id !== conversationId) return
      if (data.user_id === user._id) return
      const name = data.user_name || 'Someone'

      setTypers((prev) => {
        if (prev.some((t) => t.user_id === data.user_id)) return prev
        return [...prev, { user_id: data.user_id, name }]
      })

      setTimeout(() => {
        setTypers((prev) => prev.filter((t) => t.user_id !== data.user_id))
      }, 3000)
    })
    return off
  }, [conversationId, user._id])

  // ─── Auto-scroll ───
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  // ─── Text change with typing indicator ───
  const handleTextChange = useCallback(
    (e) => {
      const v = e.target.value
      setText(v)

      // Auto-resize
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px'
      }

      // Typing
      clearTimeout(typingTimerRef.current)
      if (conversationId && v.length > 0) {
        sendTyping(conversationId, user._id, user.name)
        typingTimerRef.current = setTimeout(() => {}, 2000)
      }
    },
    [conversationId, user]
  )

  // ─── Send message ───
  const sendMessage = useCallback(
    async (payload = {}) => {
      if (!conversationId) return
      const body = { conversation_id: conversationId, ...payload }
      if (!body.text?.trim() && !body.attachments?.length && !body.location) return

      setSending(true)
      try {
        const res = await chatAPI.send(body)
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.data._id)) return prev
          return [...prev, res.data]
        })
        setText('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        setTimeout(scrollToBottom, 50)
      } catch (err) {
        toast.error('Failed to send message')
      } finally {
        setSending(false)
      }
    },
    [conversationId, scrollToBottom]
  )

  const handleSendText = useCallback(
    (e) => {
      e?.preventDefault()
      if (!text.trim()) return
      sendMessage({ text: text.trim() })
    },
    [text, sendMessage]
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendText()
      }
    },
    [handleSendText]
  )

  // ─── File upload ───
  const handleFileUpload = useCallback(
    async (e) => {
      const file = e.target.files[0]
      if (!file) return
      e.target.value = ''

      if (file.size > 50 * 1024 * 1024) {
        toast.error('File too large. Max 50MB.')
        return
      }

      setUploadProgress(0)
      try {
        const res = await uploadAPI.upload(file, setUploadProgress)
        setUploadProgress(null)

        await sendMessage({
          text: '',
          attachments: [
            {
              url: res.data.url,
              type: res.data.type,
              name: res.data.name || file.name,
              bytes: res.data.bytes || file.size,
            },
          ],
          type: res.data.type,
        })
      } catch {
        setUploadProgress(null)
        toast.error('Upload failed')
      }
    },
    [sendMessage]
  )

  // ─── Voice send ───
  const handleVoiceSend = useCallback(
    async (blob, duration) => {
      setShowVoice(false)
      const file = new File([blob], 'voice_note.webm', { type: blob.type })
      setUploadProgress(0)
      try {
        const res = await uploadAPI.upload(file, setUploadProgress)
        setUploadProgress(null)
        await sendMessage({
          text: '',
          type: 'voice',
          attachments: [
            {
              url: res.data.url,
              type: 'voice',
              name: 'Voice note',
              bytes: blob.size,
            },
          ],
        })
        toast.success('Voice note sent')
      } catch {
        setUploadProgress(null)
        toast.error('Failed to send voice note')
      }
    },
    [sendMessage]
  )

  // ─── Location ───
  const handleLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }
    const toastId = toast.loading('Getting location...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(toastId)
        const { latitude: lat, longitude: lng } = pos.coords
        sendMessage({
          text: '',
          location: {
            lat,
            lng,
            url: `https://maps.google.com/?q=${lat},${lng}`,
          },
        })
        toast.success('Location shared')
      },
      () => {
        toast.dismiss(toastId)
        toast.error('Location access denied')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [sendMessage])

  // ─── Select conversation ───
  const selectConversation = useCallback((conv) => {
    setSelected(conv)
    setMobileShowChat(true)
    setTypers([])
  }, [])

  // ─── Grouped messages ───
  const groupedMessages = useMemo(() => {
    return messages.reduce((acc, msg) => {
      const date = formatSmartDate(msg.created_at)
      if (!acc[date]) acc[date] = []
      acc[date].push(msg)
      return acc
    }, {})
  }, [messages])

  // ─── Filtered lists ───
  const filteredGroups = useMemo(
    () => groups.filter((g) => g.name?.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  )
  const filteredDMs = useMemo(
    () => dmUsers.filter((u) => u.name?.toLowerCase().includes(search.toLowerCase())),
    [dmUsers, search]
  )

  return (
    <div className="h-full flex bg-dark overflow-hidden">
      {/* Left panel */}
      <div className={cn('w-full md:w-80 lg:w-96 flex flex-col border-r border-border bg-card flex-shrink-0', mobileShowChat && 'hidden md:flex')}>
        <div className="px-4 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-white mb-3">Messages</h2>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9 text-sm"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex border-b border-border px-4">
          {[
            { id: 'groups', label: 'Groups', icon: Users, count: filteredGroups.length },
            { id: 'dms', label: 'Direct', icon: User, count: filteredDMs.length },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn('tab flex items-center gap-2 flex-1 justify-center', tab === id && 'active')}
            >
              <Icon size={14} />
              {label}
              {count > 0 && <span className="text-[10px] text-text-muted">({count})</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            Array(5)
              .fill(0)
              .map((_, i) => <ConvSkeleton key={i} />)
          ) : tab === 'groups' ? (
            filteredGroups.length === 0 ? (
              <EmptyState icon={Hash} title="No groups" desc="Groups are created by admins" />
            ) : (
              filteredGroups.map((g) => (
                <ConvItem
                  key={g._id}
                  item={g}
                  type="group"
                  active={selected?.id === g._id && selected?.type === 'group'}
                  onSelect={selectConversation}
                  user={user}
                />
              ))
            )
          ) : filteredDMs.length === 0 ? (
            <EmptyState icon={User} title="No team members" desc="Members will appear here once approved" />
          ) : (
            filteredDMs.map((u) => (
              <ConvItem
                key={u._id}
                item={u}
                type="dm"
                active={selected?.id === u._id && selected?.type === 'dm'}
                onSelect={selectConversation}
                user={user}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className={cn('flex-1 flex flex-col min-w-0', !mobileShowChat && 'hidden md:flex')}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon={MessageSquare} title="Select a conversation" desc="Choose a group or direct message to start chatting" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <button onClick={() => setMobileShowChat(false)} className="md:hidden btn-icon">
                <ChevronLeft size={20} />
              </button>

              {selected.type === 'group' ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-messa-red/20 to-messa-red/10 border border-messa-red/30 flex items-center justify-center flex-shrink-0">
                  <Hash size={18} className="text-messa-red" />
                </div>
              ) : (
                <Avatar name={selected.name} size="md" />
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{selected.name}</h3>
                <p className="text-xs text-text-muted truncate">
                  {selected.type === 'group'
                    ? selected.data?.description || 'Group channel'
                    : selected.data?.role?.replace('_', ' ') || 'Direct message'}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button className="btn-icon" title="Voice call (coming soon)" disabled>
                  <Phone size={17} />
                </button>
                <button className="btn-icon" title="Video call (coming soon)" disabled>
                  <Video size={17} />
                </button>
                <button className="btn-icon">
                  <MoreVertical size={17} />
                </button>
              </div>
            </div>

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="w-full bg-muted overflow-hidden h-1">
                <div className="h-full bg-messa-red transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {loading ? (
                <div className="space-y-4">
                  {[false, true, false, true, false].map((isOwn, i) => (
                    <MsgSkeleton key={i} isOwn={isOwn} />
                  ))}
                </div>
              ) : Object.keys(groupedMessages).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="text-5xl">👋</div>
                  <p className="text-text-muted text-sm">No messages yet</p>
                  <p className="text-text-muted text-xs">Say hello to start the conversation</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[11px] text-text-muted px-3 py-1 bg-muted rounded-full font-medium uppercase tracking-wider">
                        {date}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="space-y-1">
                      {msgs.map((msg, idx) => {
                        const isOwn = msg.sender_id === user._id
                        const prevMsg = msgs[idx - 1]
                        const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id
                        return <MessageBubble key={msg._id} msg={msg} isOwn={isOwn} showAvatar={showAvatar} senderName={msg.sender_name} />
                      })}
                    </div>
                  </div>
                ))
              )}

              <TypingIndicator typers={typers} />
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border bg-card">
              {showVoice ? (
                <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoice(false)} />
              ) : (
                <form onSubmit={handleSendText} className="flex items-end gap-2">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="*/*" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-icon flex-shrink-0" title="Attach file">
                    <Paperclip size={18} />
                  </button>
                  <button type="button" onClick={handleLocation} className="btn-icon flex-shrink-0" title="Share location">
                    <MapPin size={18} />
                  </button>
                  <EmojiPickerButton onEmoji={(e) => setText((t) => t + e)} />

                  <textarea
                    ref={textareaRef}
                    className="input-base resize-none flex-1"
                    placeholder="Type a message..."
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    style={{ maxHeight: '128px' }}
                  />

                  {text.trim() ? (
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-11 h-11 bg-messa-red hover:bg-messa-red-dark rounded-xl flex items-center justify-center transition-colors active:scale-95 flex-shrink-0"
                    >
                      {sending ? <div className="spinner" /> : <Send size={18} className="text-white" />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowVoice(true)}
                      className="w-11 h-11 bg-muted hover:bg-messa-red/20 border border-border hover:border-messa-red/40 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                      title="Record voice note"
                    >
                      <Mic size={18} className="text-text-secondary" />
                    </button>
                  )}
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}