import { describe, it, expect, vi } from 'vitest'
import { CancelRideUseCase } from '../rides/CancelRideUseCase'
import { Ride } from '../../../domain/entities/Ride'
import type { IRideRepository } from '../../../domain/repositories/IRideRepository'
import { DomainError } from '../../../domain/errors/DomainError'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

function makeRide(status: Ride['status'] = 'in_progress') {
  return new Ride({
    id: 'r1',
    riderId: 'u1',
    origin: { lat: -23.5, lng: -46.6, address: 'Origem' },
    destination: { lat: -23.6, lng: -46.7, address: 'Destino' },
    status,
    otp: '123456',
    otpVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

function makeRepo(ride: Ride | null = makeRide()): IRideRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn().mockResolvedValue(ride),
    update: vi.fn().mockResolvedValue({ ...ride, status: 'cancelled' }),
    delete: vi.fn(),
  } as unknown as IRideRepository
}

describe('CancelRideUseCase', () => {
  it('deve cancelar corrida ativa', async () => {
    const repo = makeRepo()
    const useCase = new CancelRideUseCase(repo)

    await useCase.execute('r1')

    expect(repo.update).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ status: 'cancelled', cancelledBy: 'admin' }),
    )
  })

  it('deve lançar NotFoundError quando corrida não existe', async () => {
    const repo = makeRepo(null)
    const useCase = new CancelRideUseCase(repo)

    await expect(useCase.execute('r999')).rejects.toThrow(NotFoundError)
  })

  it('deve lançar DomainError ao tentar cancelar corrida já concluída', async () => {
    const repo = makeRepo(makeRide('completed'))
    const useCase = new CancelRideUseCase(repo)

    await expect(useCase.execute('r1')).rejects.toThrow(DomainError)
  })

  it('deve lançar DomainError ao tentar cancelar corrida já cancelada', async () => {
    const repo = makeRepo(makeRide('cancelled'))
    const useCase = new CancelRideUseCase(repo)

    await expect(useCase.execute('r1')).rejects.toThrow(DomainError)
  })
})
