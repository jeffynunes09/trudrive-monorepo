import { Socket } from 'socket.io'
import { RideService } from '../../../modules/ride/ride.service'
import { SocketEvents } from 'shared-events'
import { getIO, DriverSocketManager } from '../socket'

const rideService = new RideService()

export function registerRideHandlers(socket: Socket): void {
  socket.on(SocketEvents.RIDE_CREATE, async (payload) => {
    console.log('[WS] ride:create recebido — payload:', JSON.stringify(payload))
    try {
      const validadeRequestRide = await rideService.findByRiderId(payload.riderId)
      console.log(`[WS] corridas existentes para rider ${payload.riderId}:`, validadeRequestRide.length, validadeRequestRide.map(r => ({ id: r._id, status: r.status })))
      if (validadeRequestRide.length > 0) {
        console.warn('[WS] ride:create bloqueado — rider já tem corrida registrada (bug: não filtra por status ativo)')
        socket.emit('RIDE_ERROR', { error: 'Rider already has an active ride' })
        return
      }

      const { ride, driverIds } = await rideService.requestRide(payload)
      console.log(`[WS] corrida criada: ${ride._id} | driverIds próximos: [${driverIds.join(', ')}]`)

      // Rider entra na sua sala de notificações
      if (payload.riderId) {
        socket.join(`user:${payload.riderId}`)
      }

      const io = getIO()

      // Notifica motoristas disponíveis:
      // — sem corrida ativa: sempre notifica
      // — com corrida ativa: só notifica se segunda corrida foi liberada (< 3km do destino)
      // — exclui motoristas que já recusaram esta corrida
      const notifiedDrivers: string[] = []
      for (const driverId of driverIds) {
        if (ride.rejectedByDriverIds?.includes(driverId)) continue

        const driverSocket = DriverSocketManager.get(driverId)
        const hasActiveRide = !!driverSocket?.data.activeRideId
        const canTakeSecond = !!driverSocket?.data.secondRideAvailableNotified

        if (hasActiveRide && !canTakeSecond) continue

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
        notifiedDrivers.push(driverId)
      }

      // Confirma criação para o rider com rideId + dados de rota
      socket.emit(SocketEvents.RIDE_CREATED, {
        rideId: ride.id,
        distance: ride.distance ?? null,
        duration: ride.duration ?? null,
        fare: ride.fare ?? null,
        geometry: ride.geometry ?? null,
      })

      console.log(`[WS] Ride ${ride.id} — drivers notificados: [${notifiedDrivers.join(', ')}]`)
      return { data: ride }

    } catch (err: any) {
      console.error('[WS] ride:create erro:', err.message, err.stack)
      socket.emit('RIDE_ERROR', { error: err.message || 'Failed to create ride' })
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
