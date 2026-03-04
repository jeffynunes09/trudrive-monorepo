import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useContainer } from '../providers/DIProvider'
import type { RideFilters } from '../../domain/repositories/IRideRepository'

export function useRides(filters?: RideFilters) {
  const { listRidesUseCase, cancelRideUseCase } = useContainer()
  const queryClient = useQueryClient()

  const ridesQuery = useQuery({
    queryKey: ['rides', filters],
    queryFn: () => listRidesUseCase.execute(filters),
  })

  const cancelMutation = useMutation({
    mutationFn: (rideId: string) => cancelRideUseCase.execute(rideId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rides'] }),
  })

  return {
    rides: ridesQuery.data ?? [],
    isLoading: ridesQuery.isLoading,
    error: ridesQuery.error,
    cancelRide: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  }
}
