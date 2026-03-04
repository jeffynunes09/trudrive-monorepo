import type { IUserRepository } from '../../../domain/repositories/IUserRepository'
import type { User } from '../../../domain/entities/User'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

export class GetUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id)
    if (!user) throw new NotFoundError('Usuário', id)
    return user
  }
}
