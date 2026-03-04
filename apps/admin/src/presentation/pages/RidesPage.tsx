import { useState } from 'react'
import { useRides } from '../hooks/useRides'
import { RidesTable } from '../components/features/rides/RidesTable'
import { Spinner } from '../components/ui/Spinner'
import type { RideStatusValue } from '../../domain/value-objects/RideStatus'

const STATUS_OPTIONS: Array<{ label: string; value: RideStatusValue | 'all' }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Ativas', value: 'in_progress' },
  { label: 'Concluídas', value: 'completed' },
  { label: 'Canceladas', value: 'cancelled' },
  { label: 'Aguardando', value: 'searching_driver' },
]

export function RidesPage() {
  const [statusFilter, setStatusFilter] = useState<RideStatusValue | 'all'>('all')
  const { rides, isLoading, cancelRide, isCancelling } = useRides(
    statusFilter !== 'all' ? { status: statusFilter } : undefined,
  )

  return (
    <div className="space-y-4">
      {/* Filtros de status */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === value
                ? 'gradient-teal text-primary-foreground btn-teal-glow'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <RidesTable rides={rides} onCancel={cancelRide} isCancelling={isCancelling} />
      )}
    </div>
  )
}
