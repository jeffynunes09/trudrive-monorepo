import { Platform } from 'react-native'
import {RideDTO} from "../../../packages/shared-types/src/index"

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')

console.log('[driver/api] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL)
console.log('[driver/api] API_URL resolvido:', API_URL)

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
async function get<T>(path: string, params: object): Promise<T> {
  const query = new URLSearchParams(params as Record<string, string>).toString()
  const response = await fetch(`${API_URL}${path}?${query}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
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


export function getRidesForDriverId(driverId: string): Promise<RideDTO[]> {
  return get<RideDTO[]>(`/api/rides/driver/${driverId}`, {})
}