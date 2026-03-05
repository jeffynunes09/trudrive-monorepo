import { Server, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import jwt from 'jsonwebtoken'
import { Server as HttpServer } from 'http'
import { registerRideHandlers } from './handlers/ride.handler'
import { registerDriverHandlers } from './handlers/driver.handler'
import { registerUserHandlers } from './handlers/user.handler'
import { RideService } from '../../modules/ride/ride.service'
import { UserService } from '../../modules/user/user.service'
import { logger } from '../logger'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret_change_in_production'
const rideService = new RideService()
const userService = new UserService()

let io: Server

export async function initWebSocket(httpServer: HttpServer): Promise<Server> {
  const pubClient = new Redis(process.env.REDIS_URL!)
  const subClient = pubClient.duplicate()
  subClient.on('error', (err) => logger.error('Redis sub error', { error: err.message }))

  io = new Server(httpServer, {
    cors: { origin: '*' },
    adapter: createAdapter(pubClient, subClient),
  })

  io.on('connection', async (socket: Socket) => {
    logger.debug('WS connected', { socketId: socket.id })

    const token = socket.handshake.auth?.token as string | undefined
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
        socket.data.userId = payload.userId
        socket.data.role = payload.role

        const activeRide = await rideService.findActiveRideForUser(payload.userId, payload.role)
        if (activeRide) {
          const room = payload.role === 'driver' ? `driver:${payload.userId}` : `user:${payload.userId}`
          socket.join(room)
        }

        let ridePayload: any = activeRide ? activeRide.toObject() : null
        if (activeRide && payload.role === 'rider' && activeRide.driverId) {
          const driverUser = await userService.findById(activeRide.driverId)
          if (driverUser) {
            ridePayload.driverInfo = {
              name: driverUser.name,
              profileImage: driverUser.profileImage ?? null,
              vehicleModel: driverUser.vehicleModel ?? null,
              vehicleYear: driverUser.vehicleYear ?? null,
              vehicleColor: driverUser.vehicleColor ?? null,
              licensePlate: driverUser.licensePlate ?? null,
            }
          }
        }
        if (activeRide && payload.role === 'driver' && activeRide.riderId) {
          const riderUser = await userService.findById(activeRide.riderId)
          if (riderUser) {
            ridePayload.riderInfo = {
              name: riderUser.name,
              phone: riderUser.phone ?? null,
              profileImage: riderUser.profileImage ?? null,
            }
          }
        }
        socket.emit('RIDE_RESTORE', ridePayload)
      } catch {
        socket.emit('RIDE_RESTORE', null)
      }
    }

    registerRideHandlers(socket)
    registerDriverHandlers(socket)
    registerUserHandlers(socket)

    socket.on('disconnect', () => {
      logger.debug('WS disconnected', { socketId: socket.id })
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('WebSocket not initialized')
  return io
}

const driverSockets = new Map<string, Socket>()

export const DriverSocketManager = {
  add: (driverId: string, socket: Socket) => driverSockets.set(driverId, socket),
  remove: (driverId: string) => driverSockets.delete(driverId),
  get: (driverId: string) => driverSockets.get(driverId),
  isConnected: (driverId: string) => driverSockets.has(driverId),
}
