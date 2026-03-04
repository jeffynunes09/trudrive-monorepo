import { LocalStorageGateway } from '../gateways/LocalStorageGateway'
import { AxiosHttpClient } from '../http/AxiosHttpClient'
import { JwtAuthGateway } from '../gateways/JwtAuthGateway'
import { HttpUserRepository } from '../repositories/HttpUserRepository'
import { HttpRideRepository } from '../repositories/HttpRideRepository'

import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase'
import { LogoutUseCase } from '../../application/use-cases/auth/LogoutUseCase'
import { ListUsersUseCase } from '../../application/use-cases/users/ListUsersUseCase'
import { GetUserUseCase } from '../../application/use-cases/users/GetUserUseCase'
import { ApproveDriverUseCase } from '../../application/use-cases/users/ApproveDriverUseCase'
import { DeactivateUserUseCase } from '../../application/use-cases/users/DeactivateUserUseCase'
import { DeleteUserUseCase } from '../../application/use-cases/users/DeleteUserUseCase'
import { ListRidesUseCase } from '../../application/use-cases/rides/ListRidesUseCase'
import { GetRideUseCase } from '../../application/use-cases/rides/GetRideUseCase'
import { CancelRideUseCase } from '../../application/use-cases/rides/CancelRideUseCase'
import { GetDashboardStatsUseCase } from '../../application/use-cases/rides/GetDashboardStatsUseCase'

export interface DIContainer {
  loginUseCase: LoginUseCase
  logoutUseCase: LogoutUseCase
  listUsersUseCase: ListUsersUseCase
  getUserUseCase: GetUserUseCase
  approveDriverUseCase: ApproveDriverUseCase
  deactivateUserUseCase: DeactivateUserUseCase
  deleteUserUseCase: DeleteUserUseCase
  listRidesUseCase: ListRidesUseCase
  getRideUseCase: GetRideUseCase
  cancelRideUseCase: CancelRideUseCase
  getDashboardStatsUseCase: GetDashboardStatsUseCase
}

export function createContainer(): DIContainer {
  // Infrastructure
  const storage = new LocalStorageGateway()
  const http = new AxiosHttpClient(storage)

  // Repositories
  const userRepository = new HttpUserRepository(http)
  const rideRepository = new HttpRideRepository(http)

  // Auth gateway
  const authGateway = new JwtAuthGateway(http, storage)

  return {
    loginUseCase: new LoginUseCase(authGateway),
    logoutUseCase: new LogoutUseCase(authGateway),
    listUsersUseCase: new ListUsersUseCase(userRepository),
    getUserUseCase: new GetUserUseCase(userRepository),
    approveDriverUseCase: new ApproveDriverUseCase(userRepository),
    deactivateUserUseCase: new DeactivateUserUseCase(userRepository),
    deleteUserUseCase: new DeleteUserUseCase(userRepository),
    listRidesUseCase: new ListRidesUseCase(rideRepository),
    getRideUseCase: new GetRideUseCase(rideRepository),
    cancelRideUseCase: new CancelRideUseCase(rideRepository),
    getDashboardStatsUseCase: new GetDashboardStatsUseCase(userRepository, rideRepository),
  }
}
