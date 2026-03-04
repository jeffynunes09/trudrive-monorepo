import type { IUserRepository } from '../../../domain/repositories/IUserRepository'
import type { User } from '../../../domain/entities/User'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

export class DeactivateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId)
    if (!user) throw new NotFoundError('Usuário', userId)

    return this.userRepository.update(userId, { isActive: false })
  }
}
