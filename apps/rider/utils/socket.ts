import { io, Socket } from 'socket.io-client'
import { Platform } from 'react-native'

// iOS simulator: localhost | Android emulator: 10.0.2.2 | Device: LAN IP
const SOCKET_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://localhost:3000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false, transports: ['websocket'] })
  }
  return socket
}
