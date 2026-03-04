import { useState } from 'react'
import { useUsers } from '../hooks/useUsers'
import { DriverApprovalCard } from '../components/features/drivers/DriverApprovalCard'
import { Spinner } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'

type Filter = 'all' | 'pending' | 'approved'

export function DriversPage() {
  const { users, isLoading, approveDriver, isApproving } = useUsers({ role: 'driver' })
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = users.filter((u) => {
    if (filter === 'pending') return !u.isApproved
    if (filter === 'approved') return u.isApproved
    return true
  })

  const pendingCount = users.filter((u) => !u.isApproved).length

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'pending', 'approved'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === f
                ? 'gradient-teal text-primary-foreground btn-teal-glow'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Aprovados'}
            {f === 'pending' && pendingCount > 0 && (
              <Badge color="warning" className="ml-1.5 text-[9px] py-0">
                {pendingCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground text-sm">Nenhum motorista encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((driver) => (
            <DriverApprovalCard
              key={driver.id}
              driver={driver}
              onApprove={approveDriver}
              isApproving={isApproving}
            />
          ))}
        </div>
      )}
    </div>
  )
}
