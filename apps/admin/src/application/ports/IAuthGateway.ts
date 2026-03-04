import type { UserDto } from '../dtos/UserDto'

export interface LoginResult {
  token: string
  user: UserDto
}

export interface IAuthGateway {
  login(email: string, password: string): Promise<LoginResult>
  logout(): void
  getToken(): string | null
}
