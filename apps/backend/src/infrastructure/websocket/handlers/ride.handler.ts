import { Socket } from 'socket.io'
import { RideService } from '../../../modules/ride/ride.service'
import { SocketEvents } from 'shared-events'
import { getIO } from '../socket'

const rideService = new RideService()

export function registerRideHandlers(socket: Socket): void {
  socket.on(SocketEvents.RIDE_CREATE, async (payload) => {
    try {
       const validadeRequestRide = await rideService.findByRiderId(payload.riderId)
       if (validadeRequestRide.length > 0) {
         return { error: 'Rider already has an active ride' }
       }
      const { ride, driverIds } = await rideService.requestRide(payload)

      // Rider entra na sua sala de notificações
      if (payload.riderId) {
        socket.join(`user:${payload.riderId}`)
      }

      // Notifica motoristas próximos com dados da rota
      const io = getIO()
      for (const driverId of driverIds) {
        io.to(`driver:${driverId}`).emit(SocketEvents.RIDE_REQUEST, {
          rideId: ride.id,
          riderId: ride.riderId,
          origin: ride.origin,
          destination: ride.destination,
          geometry: ride.geometry ?? null,
          distance: ride.distance,
          duration: ride.duration,
          fare: ride.fare,
        })
      }

      // Confirma criação para o rider com rideId + dados de rota
      socket.emit(SocketEvents.RIDE_CREATED, {
        rideId: ride.id,
        distance: ride.distance ?? null,
        duration: ride.duration ?? null,
        fare: ride.fare ?? null,
        geometry: ride.geometry ?? null,
      })

      console.log(`[WS] Ride ${ride.id} — drivers found: [${driverIds.join(', ')}]`)
      return { data: ride }

    } catch (err: any) {
      return { error: err.message || 'Failed to create ride' }
    }
  })

  socket.on(SocketEvents.RIDE_FIND_ALL, async (payload) => {
    try {
      const rides = await rideService.findAll(payload ?? {})
      return { data: rides }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  socket.on(SocketEvents.RIDE_FIND_BY_ID, async ({ id }) => {
    try {
      const ride = await rideService.findById(id)
      if (!ride) return { error: 'Ride not found' }
      return { data: ride }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  socket.on(SocketEvents.RIDE_UPDATE, async ({ id, ...data }) => {
    try {
      const ride = await rideService.update(id, data)
      if (!ride) return { error: 'Ride not found' }
      return { data: ride }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  socket.on(SocketEvents.RIDE_DELETE, async ({ id }) => {
    try {
      const ride = await rideService.delete(id)
      if (!ride) return { error: 'Ride not found' }
      return { data: { deleted: true } }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  socket.on(SocketEvents.USER_ONLINE, async ({ userId, role }: { userId: string; role: 'rider' | 'driver' }) => {
    socket.data.userId = userId
    socket.join(`${role}:${userId}`)
    console.log(`[WS] ${role} ${userId} joined room`)
  })
}
