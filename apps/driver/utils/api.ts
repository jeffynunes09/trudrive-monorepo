// iOS simulator: localhost | Android emulator: 10.0.2.2 | Device: LAN IP
const API_URL = 'http://localhost:3000'

export interface AuthResult {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

async function post<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Erro inesperado')
  }

  return data as T
}

export function register(params: {
  name: string
  email: string
  password: string
  phone?: string
}): Promise<AuthResult> {
  return post<AuthResult>('/api/auth/register', { ...params, role: 'driver' })
}

export function login(params: { email: string; password: string }): Promise<AuthResult> {
  return post<AuthResult>('/api/auth/login', params)
}
