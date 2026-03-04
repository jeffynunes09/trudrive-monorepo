import type { IAuthGateway, LoginResult } from '../../ports/IAuthGateway'
import type { LoginRequestDto } from '../../dtos/LoginDto'
import { DomainError } from '../../../domain/errors/DomainError'
import { Email } from '../../../domain/value-objects/Email'

export class LoginUseCase {
  constructor(private readonly authGateway: IAuthGateway) {}

  async execute(dto: LoginRequestDto): Promise<LoginResult> {
    Email.create(dto.email) // valida formato

    if (!dto.password || dto.password.length < 6) {
      throw new DomainError('A senha deve ter ao menos 6 caracteres.')
    }

    return this.authGateway.login(dto.email, dto.password)
  }
}
