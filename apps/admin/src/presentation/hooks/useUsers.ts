import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useContainer } from '../providers/DIProvider'
import type { UserFilters } from '../../domain/repositories/IUserRepository'

export function useUsers(filters?: UserFilters) {
  const { listUsersUseCase, approveDriverUseCase, deactivateUserUseCase, deleteUserUseCase } =
    useContainer()
  const queryClient = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ['users', filters],
    queryFn: () => listUsersUseCase.execute(filters),
  })

  const approveMutation = useMutation({
    mutationFn: (driverId: string) => approveDriverUseCase.execute(driverId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => deactivateUserUseCase.execute(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUserUseCase.execute(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    approveDriver: approveMutation.mutateAsync,
    deactivateUser: deactivateMutation.mutateAsync,
    deleteUser: deleteMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
