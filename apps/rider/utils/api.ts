import { Platform } from 'react-native'
import { RideDTO } from '../../../packages/shared-types/src/index'
import { getToken } from './storage'

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

export interface UserProfile {
  _id: string
  id: string
  name: string
  email: string
  phone?: string
  role: string
  profileImage?: string
  isApproved: boolean
  isActive: boolean
}

async function post<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Erro inesperado')
  return data as T
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams(params).toString()
  const url = query ? `${API_URL}${path}?${query}` : `${API_URL}${path}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Erro inesperado')
  return data as T
}

async function authPost<T>(path: string, body: object): Promise<T> {
  const token = await getToken()
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Erro inesperado')
  return data as T
}

async function authGet<T>(path: string): Promise<T> {
  const token = await getToken()
  const response = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Erro inesperado')
  return data as T
}

async function authPatch<T>(path: string, body: object): Promise<T> {
  const token = await getToken()
  const response = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Erro inesperado')
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

export function login(params: { email: string; password: string }): Promise<AuthResult> {
  return post<AuthResult>('/api/auth/login', params)
}

export function getMe(): Promise<UserProfile> {
  return authGet<UserProfile>('/api/users/me')
}

export function updateMe(data: Partial<UserProfile>): Promise<UserProfile> {
  return authPatch<UserProfile>('/api/users/me', data)
}

export function getUploadUrl(folder: string, mimeType: string): Promise<{ url: string; key: string; publicUrl: string }> {
  return authPost('/api/users/me/upload-url', { folder, mimeType })
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
