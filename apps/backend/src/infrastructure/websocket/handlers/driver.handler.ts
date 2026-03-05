import { Socket } from 'socket.io'
import { SocketEvents } from 'shared-events'
import { getIO, DriverSocketManager } from '../socket'
import {
  addDriverLocation,
  removeDriverLocation,
  getDriverLocation,
  setDriverState,
  getDriverState,
  clearDriverState,
  clearDriverStateField,
} from '../../redis/redis.client'
import { getRoute } from '../../routes/ors.client'
import { RideService } from '../../../modules/ride/ride.service'
import { UserService } from '../../../modules/user/user.service'
import { sendPushNotification } from '../../../modules/notification/notification.service'
import { logger } from '../../logger'

const rideService = new RideService()
const userService = new UserService()

// Calcula distância em km entre dois pontos via Haversine
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function registerDriverHandlers(socket: Socket): void {

  socket.on(SocketEvents.DRIVER_ONLINE, async ({ driverId, lat, lng }: { driverId: string; lat: number; lng: number }) => {
    try {
      socket.data.driverId = driverId
      socket.data.lastLat = lat
      socket.data.lastLng = lng
      socket.join(`driver:${driverId}`)
      DriverSocketManager.add(driverId, socket)
      await addDriverLocation(driverId, lat, lng)

      // M5: Restaura estado persistido do Redis (suporta múltiplas instâncias)
      const savedState = await getDriverState(driverId)
      if (savedState) {
        if (savedState.activeRideId) socket.data.activeRideId = savedState.activeRideId
        if (savedState.activeRideRiderId) socket.data.activeRideRiderId = savedState.activeRideRiderId
        if (savedState.queuedRideId) socket.data.queuedRideId = savedState.queuedRideId
        if (savedState.queuedRideRiderId) socket.data.queuedRideRiderId = savedState.queuedRideRiderId
      }

      // A5: Restaura flag secondRideNotified do banco de dados
      if (socket.data.activeRideId) {
        const activeRide = await rideService.findById(socket.data.activeRideId as string)
        if (activeRide?.secondRideNotified) {
          socket.data.secondRideAvailableNotified = true
        }
      }

      logger.info('Driver online', { driverId, lat, lng })
    } catch (err: any) {
      logger.error('DRIVER_ONLINE error', { driverId, error: err.message })
    }
  })

  socket.on(SocketEvents.DRIVER_OFFLINE, async ({ driverId }: { driverId: string }) => {
    socket.leave(`driver:${driverId}`)
    DriverSocketManager.remove(driverId)
    await removeDriverLocation(driverId)
    await clearDriverState(driverId)
    logger.info('Driver offline', { driverId })
  })

  socket.on(SocketEvents.DRIVER_LOCATION_UPDATE, async ({ driverId, lat, lng }: { driverId: string; lat: number; lng: number }) => {
    await addDriverLocation(driverId, lat, lng)
    socket.data.lastLat = lat
    socket.data.lastLng = lng

    // Retransmite posição para o passageiro da corrida ativa
    const riderId = socket.data.activeRideRiderId as string | undefined
    if (riderId) {
      getIO().to(`user:${riderId}`).emit(SocketEvents.DRIVER_LOCATION_BROADCAST, { lat, lng })
    }

    // Verifica se distância ao destino é < 3km para liberar segunda corrida
    const activeRideId = socket.data.activeRideId as string | undefined
    const alreadyNotified = socket.data.secondRideAvailableNotified as boolean | undefined
    if (activeRideId && !alreadyNotified) {
      const ride = await rideService.findById(activeRideId)
      if (ride && ride.status === 'in_progress') {
        const distKm = haversineKm(lat, lng, ride.destination.lat, ride.destination.lng)
        if (distKm < 3) {
          socket.data.secondRideAvailableNotified = true
          // A5: persiste flag no banco para sobreviver a reconexões
          await rideService.update(activeRideId, { secondRideNotified: true })
          socket.emit(SocketEvents.SECOND_RIDE_AVAILABLE, { rideId: activeRideId })
          logger.info('Segunda corrida disponível', { driverId, rideId: activeRideId, distKm: distKm.toFixed(2) })
        }
      }
    }
  })

  // Resposta do motorista ao convite de corrida (aceitar ou recusar)
  socket.on(SocketEvents.RIDE_REQUEST_RESPONSE, async ({ rideId, driverId, accepted }: { rideId: string; driverId: string; accepted: boolean }) => {
    const io = getIO()

    if (!accepted) {
      // Blacklist: corrida não pode mais aparecer para este motorista
      await rideService.rejectByDriver(rideId, driverId)
      logger.info('Driver recusou corrida', { driverId, rideId })
      return
    }

    const activeRideId = socket.data.activeRideId as string | undefined
    const secondRideAvailable = socket.data.secondRideAvailableNotified as boolean | undefined

    // Aceite de segunda corrida (driver em in_progress e < 3km do destino)
    if (activeRideId && secondRideAvailable) {
      const queuedRide = await rideService.acceptRide(rideId, driverId)
      if (!queuedRide) {
        logger.warn('Driver tentou aceitar segunda corrida já aceita', { driverId, rideId })
        return
      }

      socket.data.queuedRideId = rideId
      socket.data.queuedRideRiderId = queuedRide.riderId
      // M5: persiste estado no Redis
      await setDriverState(driverId, {
        activeRideId: socket.data.activeRideId as string,
        activeRideRiderId: socket.data.activeRideRiderId as string,
        queuedRideId: rideId,
        queuedRideRiderId: queuedRide.riderId,
      })

      const [driverUserQ, riderUserQ] = await Promise.all([
        userService.findById(driverId),
        userService.findById(queuedRide.riderId),
      ])
      const driverInfoQ = driverUserQ ? {
        name: driverUserQ.name,
        profileImage: driverUserQ.profileImage ?? null,
        vehicleModel: driverUserQ.vehicleModel ?? null,
        vehicleYear: driverUserQ.vehicleYear ?? null,
        vehicleColor: driverUserQ.vehicleColor ?? null,
        licensePlate: driverUserQ.licensePlate ?? null,
      } : null

      // Notifica passageiro da segunda corrida — motorista designado, mas ainda finalizando outra corrida
      io.to(`user:${queuedRide.riderId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, {
        rideId,
        status: 'driver_assigned',
        driverId,
        otp: queuedRide.otp,
        driverInfo: driverInfoQ,
        queued: true,
      })

      if (riderUserQ?.pushToken) {
        await sendPushNotification({
          pushTokens: [riderUserQ.pushToken],
          title: 'Motorista a caminho!',
          body: `${driverUserQ?.name ?? 'Seu motorista'} foi designado para sua corrida`,
          data: { rideId, type: 'driver_assigned' },
        })
      }

      logger.info('Driver enfileirou segunda corrida', { driverId, rideId })
      return
    }

    // Aceite normal da primeira corrida
    const updated = await rideService.acceptRide(rideId, driverId)
    if (!updated) {
      logger.warn('Driver tentou aceitar corrida já aceita', { driverId, rideId })
      return
    }

    socket.data.activeRideRiderId = updated.riderId
    socket.data.activeRideId = rideId
    socket.data.secondRideAvailableNotified = false
    // M5: persiste estado no Redis
    await setDriverState(driverId, { activeRideId: rideId, activeRideRiderId: updated.riderId })

    const [driverUser, riderUser] = await Promise.all([
      userService.findById(driverId),
      userService.findById(updated.riderId),
    ])

    const driverInfo = driverUser ? {
      name: driverUser.name,
      profileImage: driverUser.profileImage ?? null,
      vehicleModel: driverUser.vehicleModel ?? null,
      vehicleYear: driverUser.vehicleYear ?? null,
      vehicleColor: driverUser.vehicleColor ?? null,
      licensePlate: driverUser.licensePlate ?? null,
    } : null

    const riderInfo = riderUser ? {
      name: riderUser.name,
      phone: riderUser.phone ?? null,
      profileImage: riderUser.profileImage ?? null,
    } : null

    // Notifica passageiro com OTP + dados do motorista
    io.to(`user:${updated.riderId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, {
      rideId,
      status: 'driver_assigned',
      driverId,
      otp: updated.otp,
      driverInfo,
    })

    if (riderUser?.pushToken) {
      await sendPushNotification({
        pushTokens: [riderUser.pushToken],
        title: 'Motorista a caminho!',
        body: `${driverUser?.name ?? 'Seu motorista'} foi designado para sua corrida`,
        data: { rideId, type: 'driver_assigned' },
      })
    }

    // Calcula rota da localização atual do motorista até o embarque
    const driverLoc = await getDriverLocation(driverId)
    if (driverLoc) {
      const routeToPickup = await getRoute(driverLoc, updated.origin)
      const pickupRoutePayload = {
        rideId,
        phase: 'to_pickup' as const,
        origin: driverLoc,
        destination: updated.origin,
        destinationRide: updated.destination,
        geometry: routeToPickup?.geometry ?? null,
      }
      // Envia rota ao motorista (com dados do passageiro) e ao passageiro
      socket.emit(SocketEvents.RIDE_ROUTE_UPDATE, { ...pickupRoutePayload, riderInfo })
      io.to(`user:${updated.riderId}`).emit(SocketEvents.RIDE_ROUTE_UPDATE, pickupRoutePayload)
    }

    logger.info('Driver aceitou corrida', { driverId, rideId })
  })

  // Motorista valida OTP digitado pelo passageiro → confirma início da corrida
  socket.on(SocketEvents.OTP_VALIDATE, async ({ rideId, driverId, otp }: { rideId: string; driverId: string; otp: string }) => {
    const io = getIO()

    const started = await rideService.validateAndStartRide(rideId, driverId, otp)
    if (!started) {
      socket.emit(SocketEvents.OTP_INVALID, { rideId })
      logger.warn('OTP inválido', { driverId, rideId })
      return
    }

    socket.emit(SocketEvents.OTP_VERIFIED, { rideId })

    const riderId = socket.data.activeRideRiderId as string | undefined
    if (riderId) {
      io.to(`user:${riderId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, { rideId, status: 'in_progress', driverId })
    }
    socket.emit(SocketEvents.RIDE_STATUS_UPDATE, { rideId, status: 'in_progress' })

    // Calcula rota do embarque até o destino e envia ao motorista e passageiro
    const routeToDest = await getRoute(started.origin, started.destination)
    const destRoutePayload = {
      rideId,
      phase: 'to_destination' as const,
      origin: started.origin,
      destination: started.destination,
      geometry: routeToDest?.geometry ?? null,
    }
    socket.emit(SocketEvents.RIDE_ROUTE_UPDATE, destRoutePayload)
    if (riderId) {
      io.to(`user:${riderId}`).emit(SocketEvents.RIDE_ROUTE_UPDATE, destRoutePayload)
    }

    logger.info('OTP verificado, corrida iniciada', { driverId, rideId })
  })

  // Motorista solicita pagamento ao finalizar a corrida
  socket.on(SocketEvents.RIDE_PAYMENT_REQUEST, async ({ rideId, driverId }: { rideId: string; driverId: string }) => {
    const io = getIO()
    const riderId = socket.data.activeRideRiderId as string | undefined
    const riderUser = riderId ? await userService.findById(riderId) : null

    // 1. payment_pending
    await rideService.update(rideId, { status: 'payment_pending' })
    io.to(`user:${riderId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, { rideId, status: 'payment_pending' })
    socket.emit(SocketEvents.RIDE_STATUS_UPDATE, { rideId, status: 'payment_pending' })
    logger.info('Corrida aguardando pagamento', { rideId })

    // 2. paid (simulado após 1s)
    await new Promise(r => setTimeout(r, 1000))
    const paid = await rideService.processPayment(rideId)
    if (!paid) return

    io.to(`user:${riderId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, { rideId, status: 'paid', paymentConfirmed: true })
    socket.emit(SocketEvents.RIDE_STATUS_UPDATE, { rideId, status: 'paid', paymentConfirmed: true })
    logger.info('Pagamento confirmado', { rideId })

    if (riderUser?.pushToken) {
      await sendPushNotification({
        pushTokens: [riderUser.pushToken],
        title: 'Pagamento confirmado',
        body: 'Sua corrida foi paga com sucesso',
        data: { rideId, type: 'paid' },
      })
    }

    // 3. completed (após 1s)
    await new Promise(r => setTimeout(r, 1000))
    const finished = await rideService.finishRide(rideId)
    if (!finished) return

    io.to(`user:${riderId}`).emit(SocketEvents.RIDE_STATUS_UPDATE, { rideId, status: 'completed' })
    socket.emit(SocketEvents.RIDE_STATUS_UPDATE, { rideId, status: 'completed' })
    logger.info('Corrida finalizada', { rideId, driverId })

    if (riderUser?.pushToken) {
      await sendPushNotification({
        pushTokens: [riderUser.pushToken],
        title: 'Corrida finalizada',
        body: 'Obrigado por usar o TruDrive!',
        data: { rideId, type: 'completed' },
      })
    }

    // Verifica se há segunda corrida enfileirada
    const queuedRideId = socket.data.queuedRideId as string | undefined
    const queuedRideRiderId = socket.data.queuedRideRiderId as string | undefined

    if (queuedRideId && queuedRideRiderId) {
      // Transfere a segunda corrida para a corrida ativa
      socket.data.activeRideRiderId = queuedRideRiderId
      socket.data.activeRideId = queuedRideId
      socket.data.secondRideAvailableNotified = false
      delete socket.data.queuedRideId
      delete socket.data.queuedRideRiderId
      // M5: atualiza estado no Redis — remove queuedRide, promove para ativa
      await setDriverState(driverId, { activeRideId: queuedRideId, activeRideRiderId: queuedRideRiderId })
      await clearDriverStateField(driverId, 'queuedRideId', 'queuedRideRiderId')

      // Calcula rota da localização atual do motorista até o embarque da segunda corrida
      const queuedRide = await rideService.findById(queuedRideId)
      if (queuedRide) {
        const driverLoc = await getDriverLocation(driverId)
        const routeToPickup = driverLoc ? await getRoute(driverLoc, queuedRide.origin) : null

        const routePayload = {
          rideId: queuedRideId,
          phase: 'to_pickup' as const,
          origin: driverLoc ?? queuedRide.origin,
          destination: queuedRide.origin,
          geometry: routeToPickup?.geometry ?? null,
        }

        // Emite ao motorista a nova corrida ativa imediatamente
        socket.emit(SocketEvents.RIDE_ROUTE_UPDATE, {
          ...routePayload,
          destinationRide: queuedRide.destination,
        })

        // Emite ao rider 2 a rota do motorista indo até o embarque dele
        io.to(`user:${queuedRideRiderId}`).emit(SocketEvents.RIDE_ROUTE_UPDATE, routePayload)

        // Push para rider 2: motorista concluiu corrida anterior e está a caminho
        const queuedRiderUser = await userService.findById(queuedRideRiderId)
        if (queuedRiderUser?.pushToken) {
          await sendPushNotification({
            pushTokens: [queuedRiderUser.pushToken],
            title: 'Motorista a caminho!',
            body: 'Seu motorista concluiu a corrida anterior e está indo até você',
            data: { rideId: queuedRideId, type: 'driver_en_route' },
          })
        }

        logger.info('Segunda corrida iniciando', { driverId, rideId: queuedRideId })
      }
    } else {
      // Sem segunda corrida — libera o motorista
      delete socket.data.activeRideRiderId
      delete socket.data.activeRideId
      socket.data.secondRideAvailableNotified = false
      // M5: limpa estado do Redis
      await clearDriverState(driverId)
    }
  })

  socket.on('disconnect', async () => {
    const driverId = socket.data.driverId as string | undefined
    if (!driverId) return
    DriverSocketManager.remove(driverId)
    await removeDriverLocation(driverId)
    logger.info('Driver desconectado', { driverId })
  })
}
