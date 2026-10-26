import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import useAuthStore from '@/store/authStore'

let socket: Socket | null = null

export function useSocket() {
  const { user, isAuthenticated } = useAuthStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !user || initialized.current) return
    initialized.current = true

    const socketUrl = import.meta.env.VITE_API_URL || '/'
    socket = io(socketUrl, { withCredentials: true })

    socket.on('connect', () => {
      socket?.emit('join_user', user.id)
    })

    return () => {
      socket?.disconnect()
      socket = null
      initialized.current = false
    }
  }, [isAuthenticated, user])

  return socket
}

export function getSocket() {
  return socket
}
