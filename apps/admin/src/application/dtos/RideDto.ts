import type { RideStatusValue } from '../../domain/value-objects/RideStatus'

export interface CoordinateDto {
  lat: number
  lng: number
  address: string
}

export interface RideDto {
  id: string
  riderId: string
  driverId?: string
  origin: CoordinateDto
  destination: CoordinateDto
  status: RideStatusValue
  otp: string
  otpVerified: boolean
  fare?: number
  distance?: number
  duration?: number
  paymentConfirmed?: boolean
  cancelledBy?: 'rider' | 'driver' | 'admin'
  scheduledAt?: string
  startedAt?: string
  completedAt?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export interface UpdateRideDto {
  status?: RideStatusValue
  fare?: number
  paymentConfirmed?: boolean
  cancelledAt?: string
  cancelledBy?: 'rider' | 'driver' | 'admin'
}
