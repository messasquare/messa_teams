// frontend/src/pages/ChatPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Send, Paperclip, MapPin, Mic, X, Search, Plus,
  Hash, User, ChevronLeft, Phone, Video, MoreVertical,
  Loader, MessageSquare, Users
} from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/auth'
import { cn, formatTime, formatDate, getInitials } from '../lib/utils'
import Avatar from '../components/Avatar'
import MessageBubble from '../components/chat/MessageBubble'
import TypingIndicator from '../components/chat/TypingIndicator'
import VoiceRecorder from '../components/chat/VoiceRecorder'
import EmojiPickerButton from '../components/chat/EmojiPickerButton'
import { joinConversation, leaveConversation, onNewMessage, onTyping, sendTyping, getSocket } from '../lib/socket'

// ── Conversation List Skeleton ──
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

// ── Skeleton Messages ──
function MsgSkeleton({ isOwn }) {
  return (
    <div className={cn('flex gap-3', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />}
      <div className={cn(
        'skeleton rounded-2xl',
        isOwn ? 'rounded-br-sm' : 'rounded-bl-sm',
        'h-10',
        isOwn ? 'w-48' : 'w-64'
      )} />
    </div>
  )
}

// ── Empty State ──
function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
        <Icon size={28} className="text-text-muted" />
      </div>
      <div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-text-muted max-w-xs">{desc}</p>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { user } = useAuthStore()
  const [groups, setGroups] = useState([])
  const [dmUsers, setDmUsers] = useState([])
  const [selected, setSelected] = useState(null) // { type: 'group'|'dm', id, name, data }
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [typers, setTypers] = useState([])
  const [showVoice, setShowVoice] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('groups') // groups | dms
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimer = useRef(null)
  const prevConvRef = useRef(null)

  const conversationId = selected
    ? selected.type === 'group'
      ? `group:${selected.id}`
      : (() => {
          const ids = [user._id, selected.id].sort()
          return `dm:${ids[0]}:${ids[1]}`
        })()
    : null

  // Load conversation list
  useEffect(() => {
    loadList()
  }, [])

  const loadList = async () => {
    setListLoading(true)
    try {
      const [grpRes, usrRes] = await Promise.all([
        api.get('/api/groups'),
        api.get('/api/admin/users'),
      ])
      setGroups(grpRes.data || [])
      const others = (usrRes.data || []).filter(u => u._id !== user._id && u.approved)
      setDmUsers(others)
    } catch {
      toast.error('Failed to load conversations')
    } finally {
      setListLoading(false)
    }
  }

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId) return

    // Leave previous
    if (prevConvRef.current && prevConvRef.current !== conversationId) {
      leaveConversation(prevConvRef.current)
    }

    prevConvRef.current = conversationId
    joinConversation(conversationId)
    loadMessages()

    return () => {
      // Don't leave on cleanup so we keep receiving messages
    }
  }, [conversationId])

  // Socket listeners
  useEffect(() => {
    const offMsg = onNewMessage((msg) => {
      if (msg.conversation_id === conversationId) {
        setMessages(prev => {
          // Dedup
          if (prev.some(m => m._id === msg._id)) return prev
          return [...prev, msg]
        })
        scrollToBottom()
      }
    })

    const offTyping = onTyping((data) => {
      if (data.conversation_id === conversationId && data.user_id !== user._id) {
        setTypers(prev => {
          if (prev.some(t => t.user_id === data.user_id)) return prev
          const name = data.user_name || 'Someone'
          const next = [...prev, { user_id: data.user_id, name }]
          setTimeout(() => {
            setTypers(p => p.filter(t => t.user_id !== data.user_id))
          }, 3000)
          return next
        })
      }
    })

    return () => { offMsg(); offTyping() }
  }, [conversationId, user._id])

  const loadMessages = async () => {
    setLoading(true)
    setMessages([])
    try {
      const res = await api.get('/api/chat/messages', {
        params: { conversation_id: conversationId }
      })
      setMessages(res.data || [])
      setTimeout(scrollToBottom, 50)
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleTextChange = (e) => {
    setText(e.target.value)
    // Typing indicator
    clearTimeout(typingTimer.current)
    sendTyping(conversationId, user._id)
    typingTimer.current = setTimeout(() => {}, 2000)
  }

  const sendMessage = async (payload = {}) => {
    if (!conversationId) return
    const body = {
      conversation_id: conversationId,
      ...payload,
    }
    if (!body.text && !body.attachments?.length && !body.location) return

    setSending(true)
    try {
      const res = await api.post('/api/chat/send', body)
      // The socket will broadcast – but add optimistically too
      setMessages(prev => {
        if (prev.some(m => m._id === res.data._id)) return prev
        return [...prev, res.data]
      })
      setText('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleSendText = (e) => {
    e?.preventDefault()
    if (!text.trim()) return
    sendMessage({ text: text.trim() })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Max 50MB.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setUploadProgress(0)
    try {
      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => {
          setUploadProgress(Math.round(p.loaded / p.total * 100))
        },
      })
      setUploadProgress(null)

      await sendMessage({
        text: '',
        attachments: [{
          url: res.data.url,
          type: res.data.type,
          name: res.data.name || file.name,
          bytes: res.data.bytes || file.size,
        }],
        type: res.data.type,
      })
    } catch {
      setUploadProgress(null)
      toast.error('Upload failed')
    }
  }

  const handleVoiceSend = async (blob, duration) => {
    setShowVoice(false)
    const formData = new FormData()
    formData.append('file', blob, 'voice_note.webm')
    setUploadProgress(0)
    try {
      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: p => setUploadProgress(Math.round(p.loaded / p.total * 100)),
      })
      setUploadProgress(null)
      await sendMessage({
        text: '',
        type: 'voice',
        attachments: [{
          url: res.data.url,
          type: 'voice',
          name: 'Voice note',
          bytes: blob.size,
        }]
      })
      toast.success('Voice note sent')
    } catch {
      setUploadProgress(null)
      toast.error('Failed to send voice note')
    }
  }

  const handleLocation = () => {
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
            url: `https://maps.google.com/?q=${lat},${lng}`
          }
        })
      },
      () => {
        toast.dismiss(toastId)
        toast.error('Location access denied')
      }
    )
  }

  const selectConversation = (conv) => {
    setSelected(conv)
    setMobileShowChat(true)
  }

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = formatDate(msg.created_at)
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  // Filter conversations
  const filteredGroups = groups.filter(g =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredDMs = dmUsers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  )

  // Check if can DM this user
  const canDM = (targetUser) => {
    if (!targetUser) return false
    const role = user.role
    const targetRole = targetUser.role
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

  // ConvItem Component
  const ConvItem = ({ item, type }) => {
    const isActive = selected?.id === item._id && selected?.type === type
    const name = type === 'group' ? item.name : item.name
    const sub = type === 'group'
      ? `#${item.name?.toLowerCase().replace(/\s+/g, '-')}`
      : item.role?.replace('_', ' ')

    const allowed = type === 'group'
      ? (user.role !== 'volunteer' || user.permissions?.allowed_group_ids?.includes(item._id))
      : canDM(item)

    if (!allowed) return null

    return (
      <button
        onClick={() => selectConversation({ type, id: item._id, name, data: item })}
        className={cn(
          'flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/50 transition-all',
          isActive && 'bg-messa-red/10 border-r-2 border-messa-red'
        )}
      >
        <div className="relative">
          <Avatar name={name} size="md" />
          {type === 'dm' && item.online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-online rounded-full border-2 border-dark" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-sm font-semibold text-white truncate">{name}</span>
            <span className="text-[10px] text-text-muted flex-shrink-0 ml-2">
              {type === 'group' && <Hash size={10} className="inline mr-0.5" />}
            </span>
          </div>
          <p className="text-xs text-text-muted truncate">{sub}</p>
        </div>
      </button>
    )
  }

  return (
    <div className="h-full flex bg-dark overflow-hidden">
      {/* ── Left Panel: Conversation List ── */}
      <div className={cn(
        'w-full md:w-80 lg:w-96 flex flex-col border-r border-border bg-card flex-shrink-0',
        mobileShowChat && 'hidden md:flex'
      )}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-white mb-3">Messages</h2>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9 text-sm"
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4">
          {[
            { id: 'groups', label: 'Groups', icon: Users },
            { id: 'dms', label: 'Direct', icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'tab flex items-center gap-2 flex-1 justify-center',
                tab === id && 'active'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            Array(5).fill(0).map((_, i) => <ConvSkeleton key={i} />)
          ) : tab === 'groups' ? (
            filteredGroups.length === 0 ? (
              <EmptyState
                icon={Hash}
                title="No groups yet"
                desc="Groups are created by Founders & Co-Founders"
              />
            ) : (
              filteredGroups.map(g => <ConvItem key={g._id} item={g} type="group" />)
            )
          ) : (
            filteredDMs.length === 0 ? (
              <EmptyState
                icon={User}
                title="No team members"
                desc="Approved team members will appear here"
              />
            ) : (
              filteredDMs.map(u => <ConvItem key={u._id} item={u} type="dm" />)
            )
          )}
        </div>
      </div>

      {/* ── Right Panel: Chat Window ── */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0',
        !mobileShowChat && 'hidden md:flex'
      )}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              desc="Choose a group or direct message from the left panel"
            />
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <button
                onClick={() => setMobileShowChat(false)}
                className="md:hidden btn-icon"
              >
                <ChevronLeft size={20} />
              </button>

              <Avatar name={selected.name} size="md" />

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white">{selected.name}</h3>
                <p className="text-xs text-text-muted">
                  {selected.type === 'group'
                    ? `#${selected.name?.toLowerCase().replace(/\s+/g, '-')}`
                    : selected.data?.role?.replace('_', ' ')
                  }
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button className="btn-icon" title="Voice Call (coming soon)">
                  <Phone size={18} />
                </button>
                <button className="btn-icon" title="Video Call (coming soon)">
                  <Video size={18} />
                </button>
                <button className="btn-icon">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Upload Progress */}
            <AnimatePresence>
              {uploadProgress !== null && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 4 }}
                  exit={{ height: 0 }}
                  className="w-full bg-muted overflow-hidden"
                >
                  <div
                    className="h-full bg-messa-red transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loading ? (
                <div className="space-y-4">
                  {[false, true, false, true, false].map((isOwn, i) => (
                    <MsgSkeleton key={i} isOwn={isOwn} />
                  ))}
                </div>
              ) : Object.keys(groupedMessages).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="text-4xl">👋</div>
                  <p className="text-text-muted text-sm">No messages yet. Say hello!</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-text-muted px-3 py-1 bg-muted rounded-full">
                        {date}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="space-y-1.5">
                      {msgs.map((msg, idx) => {
                        const isOwn = msg.sender_id === user._id
                        const prevMsg = msgs[idx - 1]
                        const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id
                        return (
                          <MessageBubble
                            key={msg._id}
                            msg={msg}
                            isOwn={isOwn}
                            showAvatar={showAvatar}
                            senderName={msg.sender_name}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))
              )}

              {/* Typing indicator */}
              <TypingIndicator typers={typers} />
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-border bg-card">
              <AnimatePresence mode="wait">
                {showVoice ? (
                  <motion.div
                    key="voice"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <VoiceRecorder
                      onSend={handleVoiceSend}
                      onCancel={() => setShowVoice(false)}
                    />
                  </motion.div>
                ) : (
                  <motion.form
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSendText}
                    className="flex items-end gap-2"
                  >
                    {/* Attachment */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="*/*"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-icon flex-shrink-0 mb-0.5"
                      title="Attach file"
                    >
                      <Paperclip size={18} />
                    </button>

                    {/* Location */}
                    <button
                      type="button"
                      onClick={handleLocation}
                      className="btn-icon flex-shrink-0 mb-0.5"
                      title="Share location"
                    >
                      <MapPin size={18} />
                    </button>

                    {/* Emoji */}
                    <div className="mb-0.5">
                      <EmojiPickerButton onEmoji={e => setText(t => t + e)} />
                    </div>

                    {/* Text input */}
                    <div className="flex-1 relative">
                      <textarea
                        className="input-base resize-none pr-12 min-h-[44px] max-h-32 py-2.5 leading-relaxed"
                        placeholder="Type a message..."
                        value={text}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        style={{
                          height: 'auto',
                          minHeight: '44px',
                        }}
                        onInput={e => {
                          e.target.style.height = 'auto'
                          e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                        }}
                      />
                    </div>

                    {/* Send / Mic */}
                    {text.trim() ? (
                      <button
                        type="submit"
                        disabled={sending}
                        className="w-11 h-11 bg-messa-red rounded-xl flex items-center justify-center
                                   hover:bg-messa-red-dark transition-colors active:scale-95 flex-shrink-0"
                      >
                        {sending
                          ? <Loader size={18} className="animate-spin" />
                          : <Send size={18} />
                        }
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowVoice(true)}
                        className="w-11 h-11 bg-muted border border-border rounded-xl flex items-center justify-center
                                   hover:bg-messa-red/20 hover:border-messa-red/40 transition-all flex-shrink-0"
                        title="Record voice note"
                      >
                        <Mic size={18} className="text-text-secondary" />
                      </button>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  )
}