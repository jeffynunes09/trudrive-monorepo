import { describe, it, expect, vi } from 'vitest'
import { ApproveDriverUseCase } from '../users/ApproveDriverUseCase'
import { User } from '../../../domain/entities/User'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository'
import { DomainError } from '../../../domain/errors/DomainError'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

function makeDriver(overrides?: Partial<ConstructorParameters<typeof User>[0]>) {
  return new User({
    id: 'd1',
    name: 'Motorista Teste',
    email: 'driver@test.com',
    role: 'driver',
    isActive: true,
    isApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  })
}

function makeRepo(driver: User | null = makeDriver()): IUserRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn().mockResolvedValue(driver),
    update: vi.fn().mockResolvedValue({ ...driver, isApproved: true }),
    delete: vi.fn(),
  } as unknown as IUserRepository
}

describe('ApproveDriverUseCase', () => {
  it('deve aprovar motorista pendente', async () => {
    const repo = makeRepo()
    const useCase = new ApproveDriverUseCase(repo)

    await useCase.execute('d1')

    expect(repo.update).toHaveBeenCalledWith('d1', { isApproved: true })
  })

  it('deve lançar NotFoundError quando motorista não existe', async () => {
    const repo = makeRepo(null)
    const useCase = new ApproveDriverUseCase(repo)

    await expect(useCase.execute('d999')).rejects.toThrow(NotFoundError)
  })

  it('deve lançar DomainError quando usuário não é motorista', async () => {
    const rider = makeDriver({ role: 'rider' })
    const repo = makeRepo(rider)
    const useCase = new ApproveDriverUseCase(repo)

    await expect(useCase.execute('d1')).rejects.toThrow(DomainError)
  })

  it('deve lançar DomainError quando motorista já está aprovado', async () => {
    const approvedDriver = makeDriver({ isApproved: true })
    const repo = makeRepo(approvedDriver)
    const useCase = new ApproveDriverUseCase(repo)

    await expect(useCase.execute('d1')).rejects.toThrow(DomainError)
  })
})
