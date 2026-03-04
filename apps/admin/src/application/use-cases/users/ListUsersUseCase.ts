import type { IUserRepository, UserFilters } from '../../../domain/repositories/IUserRepository'
import type { User } from '../../../domain/entities/User'

export class ListUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(filters?: UserFilters): Promise<User[]> {
    return this.userRepository.findAll(filters)
  }
}
