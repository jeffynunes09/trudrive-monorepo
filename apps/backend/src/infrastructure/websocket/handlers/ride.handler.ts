import { Socket } from 'socket.io'
import { CreateRideDto, RideService } from '../../../modules/ride/ride.service'
import { SocketEvents } from 'shared-events'
import { getIO, DriverSocketManager } from '../socket'
import { rideExpiryQueue } from '../../queue/queue'
import { UserService } from '../../../modules/user/user.service'
import { sendPushNotification } from '../../../modules/notification/notification.service'
import { User } from '../../../modules/user/user.schema'
import { Ride } from '../../../modules/ride/ride.schema'
import { logger } from '../../logger'


const rideService = new RideService()
const userService = new UserService()

function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  )
}

export function registerRideHandlers(socket: Socket): void {
  socket.on(SocketEvents.RIDE_CREATE, async (payload: CreateRideDto) => {
    logger.info('ride:create recebido', { riderId: payload.riderId })
    try {
      // A3: Valida coordenadas antes de processar
      if (!payload.riderId) {
        socket.emit('RIDE_ERROR', { error: 'riderId é obrigatório' })
        return
      }
      if (!isValidCoordinate(payload.origin?.lat, payload.origin?.lng) ||
          !isValidCoordinate(payload.destination?.lat, payload.destination?.lng)) {
        socket.emit('RIDE_ERROR', { error: 'Coordenadas de origem ou destino inválidas' })
        return
      }
      if (!payload.origin?.address || !payload.destination?.address) {
        socket.emit('RIDE_ERROR', { error: 'Endereços de origem e destino são obrigatórios' })
        return
      }

      const activeRides = await rideService.findAll({ riderId: payload.riderId, status: 'searching_driver' })
      const driverAssignedRides = await rideService.findAll({ riderId: payload.riderId, status: 'driver_assigned' })
      const inProgressRides = await rideService.findAll({ riderId: payload.riderId, status: 'in_progress' })
      const hasActive = activeRides.length > 0 || driverAssignedRides.length > 0 || inProgressRides.length > 0
      if (hasActive) {
        logger.warn('ride:create bloqueado — rider já tem corrida ativa', { riderId: payload.riderId })
        socket.emit('RIDE_ERROR', { error: 'Você já possui uma corrida em andamento' })
        return
      }

      const { ride, driverIds } = await rideService.requestRide(payload)
      logger.info('Corrida criada', { rideId: ride.id, nearbyDrivers: driverIds.length })

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

      // Push para motoristas que podem estar com o app em background
      if (notifiedDrivers.length > 0) {
        const driverUsers = await Promise.all(notifiedDrivers.map(id => userService.findById(id)))
        const tokens = driverUsers.flatMap(u => u?.pushToken ? [u.pushToken] : [])
        await sendPushNotification({
          pushTokens: tokens,
          title: 'Nova corrida disponível',
          body: `R$ ${ride.fare?.toFixed(2) ?? '—'} · ${ride.distance?.toFixed(1) ?? '—'} km`,
          data: { rideId: ride.id, type: 'ride_request' },
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

      logger.info('Drivers notificados', { rideId: ride.id, count: notifiedDrivers.length })
      return { data: ride }

    } catch (err: any) {
      logger.error('ride:create erro', { error: err.message })
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
    logger.info('CANCEL_RIDE recebido', { rideId, cancelledBy })
    try {
      const ride = await rideService.findById(rideId)
      if (!ride) {
        logger.warn('CANCEL_RIDE — corrida não encontrada', { rideId })
        return
      }

      const CANCELLATION_FEE = 5.0
      const cancellableStatuses = ['searching_driver', 'driver_assigned', 'in_progress']
      if (!cancellableStatuses.includes(ride.status)) {
        logger.warn('CANCEL_RIDE — status inválido', { rideId, status: ride.status })
        return
      }

      // M4: taxa de cancelamento quando corrida já está em andamento
      const cancellationFee = ride.status === 'in_progress' ? CANCELLATION_FEE : undefined

      await rideService.update(rideId, {
        status: 'cancelled',
        cancelledBy,
        cancelledAt: new Date(),
        ...(cancellationFee !== undefined && { cancellationFee }),
      })

      const io = getIO()

      // Notifica o rider (inclui taxa se aplicável)
      io.to(`user:${ride.riderId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, {
        rideId,
        status: 'cancelled',
        ...(cancellationFee !== undefined && { cancellationFee }),
      })

      // Se já tinha motorista, notifica ele também e limpa estado no socket
      if (ride.driverId) {
        const driverSocket = DriverSocketManager.get(ride.driverId)
        if (driverSocket) {
          // Corrida cancelada é a corrida ativa do driver
          if (driverSocket.data.activeRideId === rideId) {
            driverSocket.data.activeRideId = undefined
            driverSocket.data.activeRideRiderId = undefined
            io.to(`driver:${ride.driverId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, {
              rideId,
              status: 'cancelled',
            })
          }
          // Corrida cancelada é a corrida enfileirada do driver
          if (driverSocket.data.queuedRideId === rideId) {
            driverSocket.data.queuedRideId = undefined
            driverSocket.data.queuedRideRiderId = undefined
            driverSocket.emit(SocketEvents.RIDE_STATUS_UPDATE, { rideId, status: 'cancelled' })
          }
        } else {
          // Driver desconectado — notifica pela sala mesmo assim
          io.to(`driver:${ride.driverId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, {
            rideId,
            status: 'cancelled',
          })
        }
      }

      // Push para a parte afetada pelo cancelamento
      if (cancelledBy === 'rider' && ride.driverId) {
        const driverUser = await userService.findById(ride.driverId)
        if (driverUser?.pushToken) {
          await sendPushNotification({
            pushTokens: [driverUser.pushToken],
            title: 'Corrida cancelada',
            body: 'O passageiro cancelou a corrida',
            data: { rideId, type: 'cancelled' },
          })
        }
      } else if (cancelledBy === 'driver') {
        const riderUser = await userService.findById(ride.riderId)
        if (riderUser?.pushToken) {
          await sendPushNotification({
            pushTokens: [riderUser.pushToken],
            title: 'Corrida cancelada',
            body: 'O motorista cancelou a corrida',
            data: { rideId, type: 'cancelled' },
          })
        }
      }

      logger.info('Corrida cancelada', { rideId, cancelledBy, cancellationFee })
    } catch (err: any) {
      logger.error('CANCEL_RIDE erro', { rideId, error: err.message })
    }
  })

  // L2: Rider avalia o motorista após corrida concluída
  socket.on('RATE_DRIVER', async ({ rideId, rating }: { rideId: string; rating: number }) => {
    try {
      const userId = socket.data.userId as string | undefined
      if (!userId) return
      if (!rating || rating < 1 || rating > 5) {
        socket.emit('RATE_DRIVER_ERROR', { error: 'Avaliação deve ser entre 1 e 5' })
        return
      }

      const ride = await Ride.findOneAndUpdate(
        { _id: rideId, riderId: userId, status: 'completed', driverRating: { $exists: false } },
        { driverRating: rating },
        { new: true },
      )
      if (!ride) {
        socket.emit('RATE_DRIVER_ERROR', { error: 'Corrida não encontrada ou já avaliada' })
        return
      }

      // Recalcula média de avaliação do motorista
      const stats = await Ride.aggregate([
        { $match: { driverId: ride.driverId, driverRating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$driverRating' }, count: { $sum: 1 } } },
      ])
      if (stats.length > 0 && ride.driverId) {
        await User.findByIdAndUpdate(ride.driverId, {
          averageRating: Math.round(stats[0].avg * 10) / 10,
        })
      }

      socket.emit('RATE_DRIVER_SUCCESS', { rideId, rating })
      logger.info('Motorista avaliado', { rideId, driverId: ride.driverId, rating })
    } catch (err: any) {
      logger.error('RATE_DRIVER erro', { rideId, error: err.message })
    }
  })

  // L3: Chat entre rider e driver na corrida ativa
  socket.on(SocketEvents.CHAT_MESSAGE, async ({ rideId, message }: { rideId: string; message: string }) => {
    try {
      const userId = socket.data.userId as string | undefined
      const role = socket.data.role as string | undefined
      if (!userId || !message?.trim()) return

      const ride = await rideService.findById(rideId)
      if (!ride) return

      const io = getIO()
      const payload = { rideId, message: message.trim(), senderRole: role, from: userId, at: new Date().toISOString() }

      if (role === 'rider' && ride.driverId) {
        io.to(`driver:${ride.driverId}`).emit(SocketEvents.CHAT_MESSAGE, payload)
      } else if (role === 'driver' && ride.riderId) {
        io.to(`user:${ride.riderId}`).emit(SocketEvents.CHAT_MESSAGE, payload)
      }
    } catch (err: any) {
      logger.error('CHAT_MESSAGE erro', { rideId, error: err.message })
    }
  })

  socket.on(SocketEvents.USER_ONLINE, async ({ userId, role }: { userId: string; role: 'rider' | 'driver' }) => {
    socket.data.userId = userId
    socket.join(`${role}:${userId}`)
    logger.debug('User joined room', { userId, role })
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
