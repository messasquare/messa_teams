// frontend/src/lib/socket.js
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

let socket = null
let joinedRooms = new Set()

export function initSocket(token) {
  if (socket?.connected) return socket
  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(SOCKET_URL, {
    transports: ['polling'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
  })

  socket.on('connect', () => {
    console.log('[Socket] ✓ Connected', socket.id)
    // Rejoin all rooms after reconnect
    joinedRooms.forEach((room) => {
      socket.emit('join', { conversation_id: room })
    })
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] ✗ Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message)
  })

  return socket
}

export function getSocket() {
  return socket
}

export function isConnected() {
  return socket?.connected || false
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    joinedRooms.clear()
  }
}

export function joinConversation(conversationId) {
  if (!conversationId) return
  joinedRooms.add(conversationId)
  if (socket?.connected) {
    socket.emit('join', { conversation_id: conversationId })
  }
}

export function leaveConversation(conversationId) {
  if (!conversationId) return
  joinedRooms.delete(conversationId)
  if (socket?.connected) {
    socket.emit('leave', { conversation_id: conversationId })
  }
}

export function sendTyping(conversationId, userId, userName) {
  if (socket?.connected) {
    socket.emit('typing', {
      conversation_id: conversationId,
      user_id: userId,
      user_name: userName,
    })
  }
}

export function onNewMessage(cb) {
  if (!socket) return () => {}
  socket.on('message:new', cb)
  return () => socket?.off('message:new', cb)
}

export function onTyping(cb) {
  if (!socket) return () => {}
  socket.on('typing', cb)
  return () => socket?.off('typing', cb)
}

export function onConnect(cb) {
  if (!socket) return () => {}
  socket.on('connect', cb)
  return () => socket?.off('connect', cb)
}

export function onDisconnect(cb) {
  if (!socket) return () => {}
  socket.on('disconnect', cb)
  return () => socket?.off('disconnect', cb)
}