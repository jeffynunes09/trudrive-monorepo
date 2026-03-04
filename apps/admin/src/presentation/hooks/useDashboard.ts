import { useQuery } from '@tanstack/react-query'
import { useContainer } from '../providers/DIProvider'

export function useDashboard() {
  const { getDashboardStatsUseCase } = useContainer()

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => getDashboardStatsUseCase.execute(),
    staleTime: 60_000, // 1 min
  })
}
