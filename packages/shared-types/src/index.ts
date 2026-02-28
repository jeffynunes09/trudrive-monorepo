// Shared types across backend and frontend apps

export interface Coordinate {
  lat: number
  lng: number
  address?: string
}

export interface UserDTO {
  id: string
  name: string
  phone: string
  email?: string
  role: 'driver' | 'rider' | 'admin'
  profileImage?: string
  isActive: boolean
  isApproved: boolean
}

export interface RideDTO {
  id: string
  riderId: string
  driverId?: string
  origin: Coordinate
  destination: Coordinate
  status: RideStatus
  fare?: number
  distance?: number
  duration?: number
  scheduledAt?: string
  createdAt: string
}

export type RideStatus =
  | 'pending'
  | 'searching_driver'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
