import type { IUserRepository } from '../../../domain/repositories/IUserRepository'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

export class DeleteUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId)
    if (!user) throw new NotFoundError('Usuário', userId)

    await this.userRepository.delete(userId)
  }
}
