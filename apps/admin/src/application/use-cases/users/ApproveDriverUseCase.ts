import type { IUserRepository } from '../../../domain/repositories/IUserRepository'
import type { User } from '../../../domain/entities/User'
import { DomainError } from '../../../domain/errors/DomainError'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

export class ApproveDriverUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(driverId: string): Promise<User> {
    const user = await this.userRepository.findById(driverId)
    if (!user) throw new NotFoundError('Motorista', driverId)
    if (!user.isDriver()) throw new DomainError('Usuário não é um motorista.')
    if (user.isApproved) throw new DomainError('Motorista já está aprovado.')

    return this.userRepository.update(driverId, { isApproved: true })
  }
}
