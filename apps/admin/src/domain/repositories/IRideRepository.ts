import type { Ride } from '../entities/Ride'
import type { RideStatusValue } from '../value-objects/RideStatus'

export interface RideFilters {
  status?: RideStatusValue
  driverId?: string
  riderId?: string
}

export interface UpdateRideData {
  status?: RideStatusValue
  fare?: number
  paymentConfirmed?: boolean
  cancelledAt?: string
  cancelledBy?: 'rider' | 'driver' | 'admin'
}

export interface IRideRepository {
  findAll(filters?: RideFilters): Promise<Ride[]>
  findById(id: string): Promise<Ride | null>
  update(id: string, data: UpdateRideData): Promise<Ride>
  delete(id: string): Promise<void>
}
