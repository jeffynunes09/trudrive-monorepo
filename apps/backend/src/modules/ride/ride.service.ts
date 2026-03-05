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
  cancellationFee?: number
  secondRideNotified?: boolean
  driverRating?: number
}

export class RideService {
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  async create(data: CreateRideDto): Promise<IRide> {
    return Ride.create({ ...data, otp: this.generateOTP() })
  }

  async requestRide(data: CreateRideDto): Promise<{ ride: IRide; driverIds: string[] }> {
    const route = await getRoute(data.origin, data.destination)
    const fare = route
      ? Math.round((AppConfig.BASE_FARE + route.distance * AppConfig.FARE_PER_KM + route.duration * AppConfig.FARE_PER_MIN) * 100) / 100
      : undefined

    const ride = await Ride.create({
      ...data,
      status: 'searching_driver',
      otp: this.generateOTP(),
      distance: route?.distance,
      duration: route?.duration,
      fare,
      geometry: route?.geometry,
    })

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

  async findAllPaginated(
    filters: { riderId?: string; driverId?: string; status?: RideStatus } = {},
    page = 1,
    limit = 20,
  ): Promise<{ rides: IRide[]; total: number; page: number; hasMore: boolean }> {
    const query: FilterQuery<IRide> = {}
    if (filters.riderId) query.riderId = filters.riderId
    if (filters.driverId) query.driverId = filters.driverId
    if (filters.status) query.status = filters.status

    const skip = (page - 1) * limit
    const [rides, total] = await Promise.all([
      Ride.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Ride.countDocuments(query),
    ])
    return { rides, total, page, hasMore: skip + rides.length < total }
  }

  async findById(id: string): Promise<IRide | null> {
    return Ride.findById(id)
  }

  async findByRiderId(riderId: string): Promise<IRide[]> {
    return Ride.find({ riderId }).sort({ createdAt: -1 })
  }

  async update(id: string, data: UpdateRideDto): Promise<IRide | null> {
    return Ride.findByIdAndUpdate(id, data, { new: true, runValidators: true })
  }

  async delete(id: string): Promise<IRide | null> {
    return Ride.findByIdAndDelete(id)
  }

  // Aceite atômico — apenas o primeiro motorista a responder vence
  async acceptRide(rideId: string, driverId: string): Promise<IRide | null> {
    return Ride.findOneAndUpdate(
      { _id: rideId, status: 'searching_driver' },
      { driverId, status: 'driver_assigned' },
      { new: true }
    )
  }

  // Registra rejeição — corrida não pode mais aparecer para este motorista
  async rejectByDriver(rideId: string, driverId: string): Promise<void> {
    await Ride.updateOne(
      { _id: rideId },
      { $addToSet: { rejectedByDriverIds: driverId } }
    )
  }

  // Valida OTP e inicia a corrida atomicamente
  async validateAndStartRide(rideId: string, driverId: string, otp: string): Promise<IRide | null> {
    const ride = await Ride.findOne({ _id: rideId, driverId, status: 'driver_assigned' })
    if (!ride || ride.otp !== otp) return null
    return Ride.findOneAndUpdate(
      { _id: rideId, driverId, status: 'driver_assigned' },
      { status: 'in_progress', otpVerified: true, startedAt: new Date() },
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

  async findActiveRideForUser(userId: string, role: string): Promise<IRide | null> {
    const activeStatuses: RideStatus[] = ['searching_driver', 'driver_assigned', 'in_progress', 'payment_pending']
    const query = role === 'driver'
      ? { driverId: userId, status: { $in: activeStatuses } }
      : { riderId: userId, status: { $in: activeStatuses } }
    return Ride.findOne(query).sort({ createdAt: -1 })
  }
}
