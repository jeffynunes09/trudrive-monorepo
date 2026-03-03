import { Platform } from 'react-native'
import { RideDTO } from '../../../packages/shared-types/src/index'

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')

console.log('[rider/api] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL)
console.log('[rider/api] API_URL resolvido:', API_URL)

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
  return post<AuthResult>('/api/auth/register', { ...params, role: 'rider' })
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params).toString()
  const response = await fetch(`${API_URL}${path}?${query}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Erro inesperado')
  return data as T
}

export function login(params: { email: string; password: string }): Promise<AuthResult> {
  return post<AuthResult>('/api/auth/login', params)
}

export function getHistoryRides(params: { riderId?: string; driverId?: string }): Promise<RideDTO[]> {
  const clean: Record<string, string> = {}
  if (params.riderId) clean.riderId = params.riderId
  if (params.driverId) clean.driverId = params.driverId
  return get<RideDTO[]>('/api/rides', clean)
}

export interface GeocodeResult {
  lat: number
  lng: number
  address: string
}

/** Converte endereço digitado em coordenadas */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  console.log('[rider/api] geocodeAddress chamado — url:', `${API_URL}/api/geocode/forward?address=${address}`)
  try {
    const result = await get<GeocodeResult>('/api/geocode/forward', { address })
    console.log('[rider/api] geocodeAddress sucesso:', result)
    return result
  } catch (e: any) {
    console.error('[rider/api] geocodeAddress erro:', e.message)
    return null
  }
}

/** Converte coordenadas GPS em endereço legível */
export async function reverseGeocodeLocation(lat: number, lng: number): Promise<string | null> {
  try {
    const result = await get<{ address: string }>('/api/geocode/reverse', {
      lat: String(lat),
      lng: String(lng),
    })
    return result.address
  } catch {
    return null
  }
}
