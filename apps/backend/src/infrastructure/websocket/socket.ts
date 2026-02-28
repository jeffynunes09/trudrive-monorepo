import { Server, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { Server as HttpServer } from 'http'
import { registerUserHandlers } from './handlers/user.handler'
import { registerRideHandlers } from './handlers/ride.handler'
import { registerDriverHandlers } from './handlers/driver.handler'

let io: Server

export async function initWebSocket(httpServer: HttpServer): Promise<Server> {
  const pubClient = createClient({ url: process.env.REDIS_URL })
  const subClient = pubClient.duplicate()

  await Promise.all([pubClient.connect(), subClient.connect()])

  io = new Server(httpServer, {
    cors: { origin: '*' },
    adapter: createAdapter(pubClient, subClient),
  })

  io.on('connection', (socket: Socket) => {
    console.log(`[WS] Connected: ${socket.id}`)

    registerUserHandlers(socket)
    registerRideHandlers(socket)
    registerDriverHandlers(socket)

    socket.on('disconnect', () => {
      console.log(`[WS] Disconnected: ${socket.id}`)
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('WebSocket not initialized')
  return io
}

// Driver connection manager
const driverSockets = new Map<string, Socket>()

export const DriverSocketManager = {
  add: (driverId: string, socket: Socket) => driverSockets.set(driverId, socket),
  remove: (driverId: string) => driverSockets.delete(driverId),
  get: (driverId: string) => driverSockets.get(driverId),
  isConnected: (driverId: string) => driverSockets.has(driverId),
}
