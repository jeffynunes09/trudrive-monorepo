import type { IRideRepository, RideFilters, UpdateRideData } from '../../domain/repositories/IRideRepository'
import type { Ride } from '../../domain/entities/Ride'
import type { IHttpClient } from '../../application/ports/IHttpClient'
import type { RideDto } from '../../application/dtos/RideDto'
import { Ride as RideEntity } from '../../domain/entities/Ride'

function toEntity(dto: RideDto & { _id?: string }): Ride {
  return new RideEntity({
    id: dto._id ?? dto.id,
    riderId: dto.riderId,
    driverId: dto.driverId,
    origin: dto.origin,
    destination: dto.destination,
    status: dto.status,
    otp: dto.otp,
    otpVerified: dto.otpVerified,
    fare: dto.fare,
    distance: dto.distance,
    duration: dto.duration,
    paymentConfirmed: dto.paymentConfirmed,
    cancelledBy: dto.cancelledBy,
    scheduledAt: dto.scheduledAt,
    startedAt: dto.startedAt,
    completedAt: dto.completedAt,
    cancelledAt: dto.cancelledAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  })
}

export class HttpRideRepository implements IRideRepository {
  constructor(private readonly http: IHttpClient) {}

  async findAll(filters?: RideFilters): Promise<Ride[]> {
    const params: Record<string, unknown> = {}
    if (filters?.status) params.status = filters.status
    if (filters?.driverId) params.driverId = filters.driverId
    if (filters?.riderId) params.riderId = filters.riderId

    const dtos = await this.http.get<(RideDto & { _id?: string })[]>('/rides', params)
    return dtos.map(toEntity)
  }

  async findById(id: string): Promise<Ride | null> {
    try {
      const dto = await this.http.get<RideDto & { _id?: string }>(`/rides/${id}`)
      return toEntity(dto)
    } catch {
      return null
    }
  }

  async update(id: string, data: UpdateRideData): Promise<Ride> {
    const dto = await this.http.patch<RideDto & { _id?: string }>(`/rides/${id}`, data)
    return toEntity(dto)
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/rides/${id}`)
  }
}
