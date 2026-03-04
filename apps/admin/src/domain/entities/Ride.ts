import type { RideStatusValue } from '../value-objects/RideStatus'

export interface Coordinate {
  lat: number
  lng: number
  address: string
}

export interface RideProps {
  id: string
  riderId: string
  driverId?: string
  origin: Coordinate
  destination: Coordinate
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

export class Ride {
  readonly id: string
  readonly riderId: string
  readonly driverId?: string
  readonly origin: Coordinate
  readonly destination: Coordinate
  readonly status: RideStatusValue
  readonly otp: string
  readonly otpVerified: boolean
  readonly fare?: number
  readonly distance?: number
  readonly duration?: number
  readonly paymentConfirmed?: boolean
  readonly cancelledBy?: 'rider' | 'driver' | 'admin'
  readonly scheduledAt?: string
  readonly startedAt?: string
  readonly completedAt?: string
  readonly cancelledAt?: string
  readonly createdAt: string
  readonly updatedAt: string

  constructor(props: RideProps) {
    this.id = props.id
    this.riderId = props.riderId
    this.driverId = props.driverId
    this.origin = props.origin
    this.destination = props.destination
    this.status = props.status
    this.otp = props.otp
    this.otpVerified = props.otpVerified
    this.fare = props.fare
    this.distance = props.distance
    this.duration = props.duration
    this.paymentConfirmed = props.paymentConfirmed
    this.cancelledBy = props.cancelledBy
    this.scheduledAt = props.scheduledAt
    this.startedAt = props.startedAt
    this.completedAt = props.completedAt
    this.cancelledAt = props.cancelledAt
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  isActive(): boolean {
    return ['searching_driver', 'driver_assigned', 'driver_en_route', 'in_progress'].includes(
      this.status
    )
  }

  isCompleted(): boolean {
    return this.status === 'completed'
  }

  isCancelled(): boolean {
    return this.status === 'cancelled'
  }

  formattedDistance(): string {
    if (!this.distance) return '–'
    return this.distance >= 1000
      ? `${(this.distance / 1000).toFixed(1)} km`
      : `${this.distance} m`
  }

  formattedDuration(): string {
    if (!this.duration) return '–'
    const minutes = Math.floor(this.duration / 60)
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}min`
  }
}
