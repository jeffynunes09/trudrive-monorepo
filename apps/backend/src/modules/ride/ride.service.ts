import { Ride, IRide, RideStatus, ICoordinate } from './ride.schema'
import { FilterQuery } from 'mongoose'
import { getNearbyDrivers } from '../../infrastructure/redis/redis.client'
import { getRoute } from '../../infrastructure/routes/ors.client'
import { AppConfig } from 'shared-config'

export interface CreateRideDto {
  riderId: string
  origin: ICoordinate
  destination: ICoordinate
  scheduledAt?: Date
}

export interface UpdateRideDto {
  driverId?: string
  status?: RideStatus
  fare?: number
  distance?: number
  duration?: number
  paymentConfirmed?: boolean
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  cancelledAt?: Date
  cancelledBy?: 'rider' | 'driver' | 'admin'
}

export class RideService {
  async create(data: CreateRideDto): Promise<IRide> {
    return Ride.create(data)
  }

  async requestRide(data: CreateRideDto): Promise<{ ride: IRide; driverIds: string[] }> {
 //TODO: BLOQUEAR CRIAÇÃO EM CASO DE FALHA DE ROTA (EX: ORIGIN/DESTINO INACESSÍVEIS)
 console.log(`dados da corrida`, data)
    const route = await getRoute(data.origin, data.destination)
    console.log(`[RideService] Route fetched: distance=${route?.distance}m duration=${route?.duration}s`)
    const fare = route
      ? Math.round((AppConfig.BASE_FARE + route.distance * AppConfig.FARE_PER_KM + route.duration * AppConfig.FARE_PER_MIN) * 100) / 100
      : undefined

    // 2. Criar corrida com dados de rota
    const ride = await Ride.create({
      ...data,
      status: 'searching_driver',
      distance: route?.distance,
      duration: route?.duration,
      fare,
      geometry: route?.geometry,
    })

    // 3. Buscar motoristas próximos
    const driverIds = await getNearbyDrivers(
      data.origin.lat,
      data.origin.lng,
      AppConfig.NEARBY_DRIVERS_RADIUS_KM
    )

    return { ride, driverIds }
  }

  async findAll(filters: {
    riderId?: string
    driverId?: string
    status?: RideStatus
  } = {}): Promise<IRide[]> {
    const query: FilterQuery<IRide> = {}
    if (filters.riderId) query.riderId = filters.riderId
    if (filters.driverId) query.driverId = filters.driverId
    if (filters.status) query.status = filters.status
    return Ride.find(query).sort({ createdAt: -1 })
  }

  async findById(id: string): Promise<IRide | null> {
    return Ride.findById(id)
  }

  async findByRiderId(riderId: string): Promise<IRide[]> {
    return Ride.find({ riderId }) .sort({ createdAt: -1 })}

  async update(id: string, data: UpdateRideDto): Promise<IRide | null> {
    return Ride.findByIdAndUpdate(id, data, { new: true, runValidators: true })
  }

  async delete(id: string): Promise<IRide | null> {
    return Ride.findByIdAndDelete(id)
  }

  // Atomic accept — only succeeds if status is still 'searching_driver'
  async acceptRide(rideId: string, driverId: string): Promise<IRide | null> {
    return Ride.findOneAndUpdate(
      { _id: rideId, status: 'searching_driver' },
      { driverId, status: 'driver_assigned' },
      { new: true }
    )
  }

  async startRide(rideId: string, driverId: string): Promise<IRide | null> {
    return Ride.findOneAndUpdate(
      { _id: rideId, driverId, status: 'driver_assigned' },
      { status: 'in_progress', startedAt: new Date() },
      { new: true }
    )
  }

  async processPayment(rideId: string): Promise<IRide | null> {
    return Ride.findOneAndUpdate(
      { _id: rideId, status: 'payment_pending' },
      { status: 'paid', paymentConfirmed: true },
      { new: true }
    )
  }

  async finishRide(rideId: string): Promise<IRide | null> {
    return Ride.findOneAndUpdate(
      { _id: rideId, status: 'paid' },
      { status: 'completed', completedAt: new Date() },
      { new: true }
    )
  }
}
