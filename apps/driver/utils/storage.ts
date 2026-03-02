import AsyncStorage from '@react-native-async-storage/async-storage'

const TOKEN_KEY = '@jndrive_driver_token'
const USER_KEY = '@jndrive_driver_user'

export interface StoredUser {
  id: string
  name: string
  email: string
  role: string
}

export async function saveAuth(token: string, user: StoredUser): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ])
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY)
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    // normaliza: dados antigos podem ter sido salvos com _id em vez de id
    return { ...parsed, id: parsed.id ?? parsed._id } as StoredUser
  } catch {
    return null
  }
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY])
}
