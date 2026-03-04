import { CheckCircle, User, Car } from 'lucide-react'
import type { User as UserEntity } from '../../../../domain/entities/User'
import { Card } from '../../ui/Card'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Avatar } from '../../ui/Avatar'

interface DriverApprovalCardProps {
  driver: UserEntity
  onApprove: (id: string) => void
  isApproving?: boolean
}

export function DriverApprovalCard({ driver, onApprove, isApproving }: DriverApprovalCardProps) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Avatar src={driver.profileImage} name={driver.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-foreground truncate">{driver.name}</p>
            <Badge color={driver.isApproved ? 'success' : 'warning'}>
              {driver.isApproved ? 'Aprovado' : 'Pendente'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{driver.email}</p>

          <div className="mt-2 space-y-1">
            {driver.licensePlate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Car size={12} />
                {driver.vehicleModel} {driver.vehicleYear} — {driver.licensePlate}
              </div>
            )}
            {driver.document && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User size={12} />
                CPF: {driver.document}
              </div>
            )}
          </div>

          {driver.needsApproval() && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                loading={isApproving}
                onClick={() => onApprove(driver.id)}
                className="gap-1.5"
              >
                <CheckCircle size={13} />
                Aprovar motorista
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
