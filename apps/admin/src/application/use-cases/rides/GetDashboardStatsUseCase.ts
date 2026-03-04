import type { IUserRepository } from '../../../domain/repositories/IUserRepository'
import type { IRideRepository } from '../../../domain/repositories/IRideRepository'
import type { DashboardStatsDto } from '../../dtos/DashboardStatsDto'

export class GetDashboardStatsUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly rideRepository: IRideRepository,
  ) {}

  async execute(): Promise<DashboardStatsDto> {
    const [users, rides] = await Promise.all([
      this.userRepository.findAll(),
      this.rideRepository.findAll(),
    ])

    const drivers = users.filter((u) => u.isDriver())
    const riders = users.filter((u) => u.isRider())
    const pendingApprovals = drivers.filter((d) => !d.isApproved).length

    const activeRides = rides.filter((r) =>
      ['searching_driver', 'driver_assigned', 'driver_en_route', 'in_progress'].includes(r.status),
    ).length
    const completedRides = rides.filter((r) => r.status === 'completed').length
    const cancelledRides = rides.filter((r) => r.status === 'cancelled').length

    const totalRevenue = rides
      .filter((r) => r.status === 'completed' && r.fare)
      .reduce((acc, r) => acc + (r.fare ?? 0), 0)

    return {
      totalUsers: users.length,
      totalDrivers: drivers.length,
      totalRiders: riders.length,
      pendingApprovals,
      totalRides: rides.length,
      activeRides,
      completedRides,
      cancelledRides,
      totalRevenue,
    }
  }
}
