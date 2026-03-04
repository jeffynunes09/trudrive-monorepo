import type { IRideRepository, RideFilters } from '../../../domain/repositories/IRideRepository'
import type { Ride } from '../../../domain/entities/Ride'

export class ListRidesUseCase {
  constructor(private readonly rideRepository: IRideRepository) {}

  async execute(filters?: RideFilters): Promise<Ride[]> {
    return this.rideRepository.findAll(filters)
  }
}
