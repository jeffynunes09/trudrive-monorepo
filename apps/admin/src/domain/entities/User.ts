export type UserRole = 'driver' | 'rider' | 'admin'

export interface UserProps {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  profileImage?: string
  isActive: boolean
  isApproved: boolean
  // Driver-only
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

export class User {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly phone?: string
  readonly role: UserRole
  readonly profileImage?: string
  readonly isActive: boolean
  readonly isApproved: boolean
  readonly document?: string
  readonly licensePlate?: string
  readonly vehicleModel?: string
  readonly vehicleYear?: number
  readonly vehicleColor?: string
  readonly driverLicenseImage?: string
  readonly vehicleDocImage?: string
  readonly createdAt: string
  readonly updatedAt: string

  constructor(props: UserProps) {
    this.id = props.id
    this.name = props.name
    this.email = props.email
    this.phone = props.phone
    this.role = props.role
    this.profileImage = props.profileImage
    this.isActive = props.isActive
    this.isApproved = props.isApproved
    this.document = props.document
    this.licensePlate = props.licensePlate
    this.vehicleModel = props.vehicleModel
    this.vehicleYear = props.vehicleYear
    this.vehicleColor = props.vehicleColor
    this.driverLicenseImage = props.driverLicenseImage
    this.vehicleDocImage = props.vehicleDocImage
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  isDriver(): boolean {
    return this.role === 'driver'
  }

  isRider(): boolean {
    return this.role === 'rider'
  }

  needsApproval(): boolean {
    return this.isDriver() && !this.isApproved
  }

  hasCompleteVehicleInfo(): boolean {
    return !!(
      this.document &&
      this.licensePlate &&
      this.vehicleModel &&
      this.vehicleYear &&
      this.vehicleColor
    )
  }
}
