import { Badge } from '../../ui/Badge'
import { RideStatus, type RideStatusValue } from '../../../../domain/value-objects/RideStatus'

type BadgeColor = 'primary' | 'success' | 'warning' | 'danger' | 'muted'

const STATUS_COLOR: Record<RideStatusValue, BadgeColor> = {
  pending: 'muted',
  searching_driver: 'warning',
  driver_assigned: 'primary',
  driver_en_route: 'primary',
  in_progress: 'primary',
  payment_pending: 'warning',
  paid: 'success',
  completed: 'success',
  cancelled: 'danger',
}

interface RideStatusBadgeProps {
  status: RideStatusValue
}

export function RideStatusBadge({ status }: RideStatusBadgeProps) {
  const label = RideStatus.create(status).label()
  const color = STATUS_COLOR[status]
  return <Badge color={color}>{label}</Badge>
}
