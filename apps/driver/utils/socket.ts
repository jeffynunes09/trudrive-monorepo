import { io, Socket } from 'socket.io-client'
import { Platform } from 'react-native'

const SOCKET_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')

console.log('[driver/socket] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL)
console.log('[driver/socket] SOCKET_URL resolvido:', SOCKET_URL)

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false, transports: ['websocket'] })
  }
  return socket
}
