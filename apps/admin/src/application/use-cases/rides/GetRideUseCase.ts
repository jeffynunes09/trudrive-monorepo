import type { IRideRepository } from '../../../domain/repositories/IRideRepository'
import type { Ride } from '../../../domain/entities/Ride'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

export class GetRideUseCase {
  constructor(private readonly rideRepository: IRideRepository) {}

  async execute(id: string): Promise<Ride> {
    const ride = await this.rideRepository.findById(id)
    if (!ride) throw new NotFoundError('Corrida', id)
    return ride
  }
}
