import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContainer } from '../providers/DIProvider'
import { useAuthStore } from '../store/authStore'
import type { LoginRequestDto } from '../../application/dtos/LoginDto'
import { DomainError } from '../../domain/errors/DomainError'

export function useAuth() {
  const { loginUseCase, logoutUseCase } = useContainer()
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const login = useCallback(
    async (dto: LoginRequestDto) => {
      const result = await loginUseCase.execute(dto)
      setAuth(result.user, result.token)
      navigate('/dashboard')
    },
    [loginUseCase, setAuth, navigate],
  )

  const logout = useCallback(() => {
    logoutUseCase.execute()
    clearAuth()
    navigate('/login')
  }, [logoutUseCase, clearAuth, navigate])

  const parseError = (err: unknown): string => {
    if (err instanceof DomainError) return err.message
    if (err instanceof Error) return err.message
    return 'Erro desconhecido.'
  }

  return { user, isAuthenticated, login, logout, parseError }
}
