import { Ride, IRide, RideStatus, ICoordinate } from './ride.schema'
import { FilterQuery, Types } from 'mongoose'
import { getNearbyDrivers } from '../../infrastructure/redis/redis.client'
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
    const ride = await Ride.create({ ...data, status: 'searching_driver' })
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
    if (filters.riderId) query.riderId = new Types.ObjectId(filters.riderId)
    if (filters.driverId) query.driverId = new Types.ObjectId(filters.driverId)
    if (filters.status) query.status = filters.status
    return Ride.find(query).sort({ createdAt: -1 })
  }

  async findById(id: string): Promise<IRide | null> {
    return Ride.findById(id)
  }

  async update(id: string, data: UpdateRideDto): Promise<IRide | null> {
    return Ride.findByIdAndUpdate(id, data, { new: true, runValidators: true })
  }

  async delete(id: string): Promise<IRide | null> {
    return Ride.findByIdAndDelete(id)
  }
}
