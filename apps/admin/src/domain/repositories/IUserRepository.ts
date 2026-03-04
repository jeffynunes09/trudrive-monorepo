import type { User } from '../entities/User'
import type { UserRole } from '../entities/User'

export interface UserFilters {
  role?: UserRole
  isActive?: boolean
  isApproved?: boolean
}

export interface UpdateUserData {
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

export interface IUserRepository {
  findAll(filters?: UserFilters): Promise<User[]>
  findById(id: string): Promise<User | null>
  update(id: string, data: UpdateUserData): Promise<User>
  delete(id: string): Promise<void>
}
