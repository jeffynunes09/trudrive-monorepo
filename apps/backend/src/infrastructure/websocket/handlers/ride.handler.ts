import { Socket } from 'socket.io'
import { RideService } from '../../../modules/ride/ride.service'
import { SocketEvents } from 'shared-events'
import { getIO } from '../socket'

const rideService = new RideService()

type Ack = (res: { data?: any; error?: string }) => void

export function registerRideHandlers(socket: Socket): void {
  socket.on(SocketEvents.RIDE_CREATE, async (payload, ack: Ack) => {
    try {
      const { ride, driverIds } = await rideService.requestRide(payload)

      // rider joins their notification room
      if (payload.riderId) {
        socket.join(`user:${payload.riderId}`)
      }

      // notify nearby drivers directly (no worker needed for MVP)
      const io = getIO()
      for (const driverId of driverIds) {
        io.to(`driver:${driverId}`).emit(SocketEvents.RIDE_REQUEST, {
          rideId: ride.id,
          riderId: ride.riderId,
          origin: ride.origin,
          destination: ride.destination,
        })
      }

      console.log(`[WS] Ride ${ride.id} sent to ${driverIds.length} drivers`)
      ack({ data: ride })
    } catch (err: any) {
      ack({ error: err.message })
    }
  })

  socket.on(SocketEvents.RIDE_FIND_ALL, async (payload, ack: Ack) => {
    try {
      const rides = await rideService.findAll(payload ?? {})
      ack({ data: rides })
    } catch (err: any) {
      ack({ error: err.message })
    }
  })

  socket.on(SocketEvents.RIDE_FIND_BY_ID, async ({ id }, ack: Ack) => {
    try {
      const ride = await rideService.findById(id)
      if (!ride) return ack({ error: 'Ride not found' })
      ack({ data: ride })
    } catch (err: any) {
      ack({ error: err.message })
    }
  })

  socket.on(SocketEvents.RIDE_UPDATE, async ({ id, ...data }, ack: Ack) => {
    try {
      const ride = await rideService.update(id, data)
      if (!ride) return ack({ error: 'Ride not found' })
      ack({ data: ride })
    } catch (err: any) {
      ack({ error: err.message })
    }
  })

  socket.on(SocketEvents.RIDE_DELETE, async ({ id }, ack: Ack) => {
    try {
      const ride = await rideService.delete(id)
      if (!ride) return ack({ error: 'Ride not found' })
      ack({ data: { deleted: true } })
    } catch (err: any) {
      ack({ error: err.message })
    }
  })
}
