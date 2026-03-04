import { DomainError } from '../errors/DomainError'

export type RideStatusValue =
  | 'pending'
  | 'searching_driver'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'in_progress'
  | 'payment_pending'
  | 'paid'
  | 'completed'
  | 'cancelled'

const ALL_STATUSES: RideStatusValue[] = [
  'pending',
  'searching_driver',
  'driver_assigned',
  'driver_en_route',
  'in_progress',
  'payment_pending',
  'paid',
  'completed',
  'cancelled',
]

const STATUS_LABELS: Record<RideStatusValue, string> = {
  pending: 'Pendente',
  searching_driver: 'Buscando motorista',
  driver_assigned: 'Motorista atribuído',
  driver_en_route: 'Motorista a caminho',
  in_progress: 'Em andamento',
  payment_pending: 'Aguardando pagamento',
  paid: 'Pago',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

export class RideStatus {
  private readonly value: RideStatusValue

  private constructor(value: RideStatusValue) {
    this.value = value
  }

  static create(raw: string): RideStatus {
    if (!ALL_STATUSES.includes(raw as RideStatusValue)) {
      throw new DomainError(`Status de corrida inválido: "${raw}"`)
    }
    return new RideStatus(raw as RideStatusValue)
  }

  toString(): RideStatusValue {
    return this.value
  }

  label(): string {
    return STATUS_LABELS[this.value]
  }

  isTerminal(): boolean {
    return this.value === 'completed' || this.value === 'cancelled'
  }

  canBeCancelledByAdmin(): boolean {
    return !this.isTerminal()
  }
}
