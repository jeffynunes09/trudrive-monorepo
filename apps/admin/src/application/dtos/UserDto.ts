import type { UserRole } from '../../domain/entities/User'

export interface UserDto {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  profileImage?: string
  isActive: boolean
  isApproved: boolean
  document?: string
  licensePlate?: string
  vehicleModel?: string
  vehicleYear?: number
  vehicleColor?: string
  driverLicenseImage?: string
  vehicleDocImage?: string
  createdAt: string
  updatedAt: string
}

export interface UpdateUserDto {
  name?: string
  email?: string
  phone?: string
  profileImage?: string
  isActive?: boolean
  isApproved?: boolean
  document?: string
  licensePlate?: string
  vehicleModel?: string
  vehicleYear?: number
  vehicleColor?: string
  driverLicenseImage?: string
  vehicleDocImage?: string
}
