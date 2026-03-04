import type { IAuthGateway, LoginResult } from '../../application/ports/IAuthGateway'
import type { IHttpClient } from '../../application/ports/IHttpClient'
import type { IStorageGateway } from '../../application/ports/IStorageGateway'
import type { UserDto } from '../../application/dtos/UserDto'
import { TOKEN_KEY } from '../http/api.config'

interface LoginResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export class JwtAuthGateway implements IAuthGateway {
  constructor(
    private readonly http: IHttpClient,
    private readonly storage: IStorageGateway,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const response = await this.http.post<LoginResponse>('/auth/login', { email, password })

    this.storage.set(TOKEN_KEY, response.token)

    const user: UserDto = {
      id: response?.user?.id,
      name: response?.user?.name,
      email: response?.user?.email,
      role: response?.user?.role as UserDto['role'],
      isActive: true,
      isApproved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return { token: response.token, user }
  }

  logout(): void {
    this.storage.remove(TOKEN_KEY)
  }

  getToken(): string | null {
    return this.storage.get(TOKEN_KEY)
  }
}
