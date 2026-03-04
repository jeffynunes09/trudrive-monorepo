import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function AuthGuard() {
  const { isAuthenticated, user } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    user: s.user,
  }))

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/unauthorized" replace />

  return <Outlet />
}
