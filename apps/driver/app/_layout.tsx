import { useEffect, useState, useCallback, createContext } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { router } from 'expo-router'
import 'react-native-reanimated'
import { getToken, getStoredUser, clearAuth } from '../utils/storage'

export const AuthContext = createContext<{ logout: () => Promise<void> }>({
  logout: async () => {},
})

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const [token, user] = await Promise.all([getToken(), getStoredUser()])
        setIsLoggedIn(!!(token && user))
      } finally {
        setReady(true)
        SplashScreen.hideAsync()
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (!ready) return
    if (isLoggedIn) {
      router.replace('/(tabs)')
    } else {
      router.replace('/')
    }
  }, [ready, isLoggedIn])

  const logout = useCallback(async () => {
    await clearAuth()
    setIsLoggedIn(false)
  }, [])

  if (!ready) return null

  return (
    <AuthContext.Provider value={{ logout }}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </AuthContext.Provider>
  )
}
