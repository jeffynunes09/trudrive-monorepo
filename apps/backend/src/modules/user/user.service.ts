import { User, IUser } from './user.schema'
import { FilterQuery } from 'mongoose'

export interface CreateUserDto {
  name: string
  phone: string
  email?: string
  role: 'driver' | 'rider' | 'admin'
  profileImage?: string
}

export interface UpdateUserDto {
  name?: string
  email?: string
  profileImage?: string
  isActive?: boolean
  isApproved?: boolean
}

export class UserService {
  async create(data: CreateUserDto): Promise<IUser> {
    const user = await User.create(data)
    return user
  }

  async findAll(filters: { role?: string; isActive?: boolean; isApproved?: boolean } = {}): Promise<IUser[]> {
    const query: FilterQuery<IUser> = {}
    if (filters.role !== undefined) query.role = filters.role
    if (filters.isActive !== undefined) query.isActive = filters.isActive
    if (filters.isApproved !== undefined) query.isApproved = filters.isApproved
    return User.find(query).sort({ createdAt: -1 })
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id)
  }

  async findByPhone(phone: string): Promise<IUser | null> {
    return User.findOne({ phone })
  }

  async update(id: string, data: UpdateUserDto): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true })
  }

  async delete(id: string): Promise<IUser | null> {
    return User.findByIdAndDelete(id)
  }
}
