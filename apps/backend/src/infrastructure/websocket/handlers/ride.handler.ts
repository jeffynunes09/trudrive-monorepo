import { Socket } from 'socket.io'
import { CreateRideDto, RideService } from '../../../modules/ride/ride.service'
import { SocketEvents } from 'shared-events'
import { getIO, DriverSocketManager } from '../socket'
import { rideExpiryQueue } from '../../queue/queue'
import { UserService } from '../../../modules/user/user.service'


const rideService = new RideService()
const userService = new UserService()

export function registerRideHandlers(socket: Socket): void {
  socket.on(SocketEvents.RIDE_CREATE, async (payload:CreateRideDto) => {
    console.log('[WS] ride:create recebido — payload:', JSON.stringify(payload))
    try {
      const activeRides = await rideService.findAll({ riderId: payload.riderId, status: 'searching_driver' })
      const driverAssignedRides = await rideService.findAll({ riderId: payload.riderId, status: 'driver_assigned' })
      const inProgressRides = await rideService.findAll({ riderId: payload.riderId, status: 'in_progress' })
      const hasActive = activeRides.length > 0 || driverAssignedRides.length > 0 || inProgressRides.length > 0
      if (hasActive) {
        console.warn('[WS] ride:create bloqueado — rider já tem corrida ativa')
        socket.emit('RIDE_ERROR', { error: 'Você já possui uma corrida em andamento' })
        return
      }

      const { ride, driverIds } = await rideService.requestRide(payload)
      console.log(`[WS] corrida criada: ${ride._id} | driverIds próximos: [${driverIds.join(', ')}]`)

      await rideExpiryQueue.add('expire', { rideId: ride.id }, { delay: 60_000 })

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

  socket.on(SocketEvents.CANCEL_RIDE, async ({ rideId, cancelledBy }: { rideId: string; cancelledBy: 'rider' | 'driver' }) => {
    console.log(`[WS] CANCEL_RIDE — rideId: ${rideId}, por: ${cancelledBy}`)
    try {
      const ride = await rideService.findById(rideId)
      if (!ride) {
        console.warn(`[WS] CANCEL_RIDE — corrida ${rideId} não encontrada`)
        return
      }

      const cancellableStatuses = ['searching_driver', 'driver_assigned']
      if (!cancellableStatuses.includes(ride.status)) {
        console.warn(`[WS] CANCEL_RIDE — status '${ride.status}' não pode ser cancelado`)
        return
      }

      await rideService.update(rideId, {
        status: 'cancelled',
        cancelledBy,
        cancelledAt: new Date(),
      })

      const io = getIO()

      // Notifica o rider
      io.to(`user:${ride.riderId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, {
        rideId,
        status: 'cancelled',
      })

      // Se já tinha motorista, notifica ele também
      if (ride.driverId) {
        io.to(`driver:${ride.driverId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, {
          rideId,
          status: 'cancelled',
        })

        // Limpa corrida ativa do driver
        const driverSocket = DriverSocketManager.get(ride.driverId)
        if (driverSocket) {
          driverSocket.data.activeRideId = undefined
          driverSocket.data.activeRideRiderId = undefined
        }
      }

      console.log(`[WS] Corrida ${rideId} cancelada por ${cancelledBy}`)
    } catch (err: any) {
      console.error('[WS] CANCEL_RIDE erro:', err.message)
    }
  })

  socket.on(SocketEvents.USER_ONLINE, async ({ userId, role }: { userId: string; role: 'rider' | 'driver' }) => {
    socket.data.userId = userId
    socket.join(`${role}:${userId}`)
    console.log(`[WS] ${role} ${userId} joined room`)
  })

  socket.on(SocketEvents.GET_RIDE_STATE, async () => {
    const userId = socket.data.userId as string | undefined
    const role = socket.data.role as string | undefined
    if (!userId || !role) return
    const activeRide = await rideService.findActiveRideForUser(userId, role)
    if (activeRide) {
      const room = role === 'driver' ? `driver:${userId}` : `user:${userId}`
      socket.join(room)
    }
    let ridePayload: any = activeRide ? activeRide.toObject() : null
    if (activeRide && role === 'rider' && activeRide.driverId) {
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
    if (activeRide && role === 'driver' && activeRide.riderId) {
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
  })
}
