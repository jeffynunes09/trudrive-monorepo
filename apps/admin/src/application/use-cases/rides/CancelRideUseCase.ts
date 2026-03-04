import type { IRideRepository } from '../../../domain/repositories/IRideRepository'
import type { Ride } from '../../../domain/entities/Ride'
import { DomainError } from '../../../domain/errors/DomainError'
import { NotFoundError } from '../../../domain/errors/NotFoundError'
import { RideStatus } from '../../../domain/value-objects/RideStatus'

export class CancelRideUseCase {
  constructor(private readonly rideRepository: IRideRepository) {}

  async execute(rideId: string): Promise<Ride> {
    const ride = await this.rideRepository.findById(rideId)
    if (!ride) throw new NotFoundError('Corrida', rideId)

    const status = RideStatus.create(ride.status)
    if (!status.canBeCancelledByAdmin()) {
      throw new DomainError(`Não é possível cancelar uma corrida com status "${status.label()}".`)
    }

    return this.rideRepository.update(rideId, {
      status: 'cancelled',
      cancelledBy: 'admin',
      cancelledAt: new Date().toISOString(),
    })
  }
}
