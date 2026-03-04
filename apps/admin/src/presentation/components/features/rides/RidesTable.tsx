import { Trash2 } from 'lucide-react'
import type { Ride } from '../../../../domain/entities/Ride'
import { Button } from '../../ui/Button'
import { RideStatusBadge } from './RideStatusBadge'
import { Money } from '../../../../domain/value-objects/Money'

interface RidesTableProps {
  rides: Ride[]
  onCancel: (id: string) => void
  isCancelling?: boolean
}

export function RidesTable({ rides, onCancel, isCancelling }: RidesTableProps) {
  if (rides.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">Nenhuma corrida encontrada.</div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {['Origem', 'Destino', 'Status', 'Tarifa', 'Data', 'Ações'].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rides.map((ride) => (
            <tr key={ride.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
              <td className="px-4 py-3 text-xs text-foreground max-w-40 truncate">
                {ride.origin.address}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground max-w-40 truncate">
                {ride.destination.address}
              </td>
              <td className="px-4 py-3">
                <RideStatusBadge status={ride.status} />
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-primary">
                {ride.fare ? Money.fromNumber(ride.fare).format() : '–'}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(ride.createdAt).toLocaleDateString('pt-BR')}
              </td>
              <td className="px-4 py-3">
                {!ride.isCancelled() && !ride.isCompleted() && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={isCancelling}
                    onClick={() => onCancel(ride.id)}
                  >
                    <Trash2 size={12} />
                    Cancelar
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
