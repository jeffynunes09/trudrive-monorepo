import type { IAuthGateway } from '../../ports/IAuthGateway'

export class LogoutUseCase {
  constructor(private readonly authGateway: IAuthGateway) {}

  execute(): void {
    this.authGateway.logout()
  }
}
