import type { IUserRepository, UserFilters, UpdateUserData } from '../../domain/repositories/IUserRepository'
import type { User } from '../../domain/entities/User'
import type { IHttpClient } from '../../application/ports/IHttpClient'
import type { UserDto } from '../../application/dtos/UserDto'
import { User as UserEntity } from '../../domain/entities/User'

function toEntity(dto: UserDto & { _id?: string }): User {
  return new UserEntity({
    id: dto._id ?? dto.id,
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    role: dto.role,
    profileImage: dto.profileImage,
    isActive: dto.isActive,
    isApproved: dto.isApproved,
    document: dto.document,
    licensePlate: dto.licensePlate,
    vehicleModel: dto.vehicleModel,
    vehicleYear: dto.vehicleYear,
    vehicleColor: dto.vehicleColor,
    driverLicenseImage: dto.driverLicenseImage,
    vehicleDocImage: dto.vehicleDocImage,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  })
}

export class HttpUserRepository implements IUserRepository {
  constructor(private readonly http: IHttpClient) {}

  async findAll(filters?: UserFilters): Promise<User[]> {
    const params: Record<string, unknown> = {}
    if (filters?.role) params.role = filters.role
    if (filters?.isActive !== undefined) params.isActive = String(filters.isActive)
    if (filters?.isApproved !== undefined) params.isApproved = String(filters.isApproved)

    const dtos = await this.http.get<(UserDto & { _id?: string })[]>('/users', params)
    return dtos.map(toEntity)
  }

  async findById(id: string): Promise<User | null> {
    try {
      const dto = await this.http.get<UserDto & { _id?: string }>(`/users/${id}`)
      return toEntity(dto)
    } catch {
      return null
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const dto = await this.http.patch<UserDto & { _id?: string }>(`/users/${id}`, data)
    return toEntity(dto)
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/users/${id}`)
  }
}
