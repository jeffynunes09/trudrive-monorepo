import { Socket } from 'socket.io'
import { SocketEvents } from 'shared-events'
import { getIO, DriverSocketManager } from '../socket'
import { addDriverLocation, removeDriverLocation } from '../../redis/redis.client'
import { RideService } from '../../../modules/ride/ride.service'

const rideService = new RideService()

export function registerDriverHandlers(socket: Socket): void {
  socket.on(SocketEvents.DRIVER_ONLINE, async ({ driverId, lat, lng }: { driverId: string; lat: number; lng: number }) => {
    socket.data.driverId = driverId
    socket.join(`driver:${driverId}`)
    DriverSocketManager.add(driverId, socket)
    await addDriverLocation(driverId, lat, lng)
    console.log(`[WS] Driver ${driverId} online`)
  })

  socket.on(SocketEvents.DRIVER_OFFLINE, async ({ driverId }: { driverId: string }) => {
    socket.leave(`driver:${driverId}`)
    DriverSocketManager.remove(driverId)
    await removeDriverLocation(driverId)
    console.log(`[WS] Driver ${driverId} offline`)
  })

  socket.on(SocketEvents.DRIVER_LOCATION_UPDATE, async ({ driverId, lat, lng }: { driverId: string; lat: number; lng: number }) => {
    await addDriverLocation(driverId, lat, lng)
  })

  socket.on(SocketEvents.RIDE_REQUEST_RESPONSE, async ({ rideId, driverId, accepted }: { rideId: string; driverId: string; accepted: boolean }) => {
    if (!accepted) {
      console.log(`[WS] Driver ${driverId} rejected ride ${rideId}`)
      return
    }

    const ride = await rideService.findById(rideId)
    if (!ride || ride.status !== 'searching_driver') return

    const updated = await rideService.update(rideId, {
      driverId,
      status: 'driver_assigned',
    })

    if (!updated) return

    getIO()
      .to(`user:${updated.riderId}`)
      .emit(SocketEvents.RIDE_STATUS_UPDATE, {
        rideId,
        status: 'driver_assigned',
        driverId,
      })

    console.log(`[WS] Driver ${driverId} accepted ride ${rideId}`)
  })

  socket.on('disconnect', async () => {
    const driverId = socket.data.driverId as string | undefined
    if (!driverId) return
    DriverSocketManager.remove(driverId)
    await removeDriverLocation(driverId)
    console.log(`[WS] Driver ${driverId} disconnected`)
  })
}
