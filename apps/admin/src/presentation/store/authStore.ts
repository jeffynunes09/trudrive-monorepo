import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserDto } from '../../application/dtos/UserDto'

interface AuthState {
  user: UserDto | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: UserDto, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'admin_auth' },
  ),
)
