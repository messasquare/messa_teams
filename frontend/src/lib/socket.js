// frontend/src/lib/socket.js
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

let socket = null
let listeners = {}

export function getSocket() {
  return socket
}

export function initSocket(token) {
  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    transports: ['polling'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Error:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    listeners = {}
  }
}

export function joinConversation(conversationId) {
  socket?.emit('join', { conversation_id: conversationId })
}

export function leaveConversation(conversationId) {
  socket?.emit('leave', { conversation_id: conversationId })
}

export function sendTyping(conversationId, userId) {
  socket?.emit('typing', { conversation_id: conversationId, user_id: userId })
}

export function onNewMessage(cb) {
  socket?.on('message:new', cb)
  return () => socket?.off('message:new', cb)
}

export function onTyping(cb) {
  socket?.on('typing', cb)
  return () => socket?.off('typing', cb)
}