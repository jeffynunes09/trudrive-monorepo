import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../modules/user/user.schema', () => ({
  User: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}))

import { UserService } from '../modules/user/user.service'
import { User } from '../modules/user/user.schema'

const makeSortable = (resolved: any) => ({ sort: vi.fn().mockResolvedValue(resolved) })

describe('UserService', () => {
  let service: UserService

  beforeEach(() => {
    service = new UserService()
  })

  describe('create', () => {
    it('cria e retorna o usuário', async () => {
      const user = { _id: 'id1', name: 'Ana', email: 'ana@test.com', role: 'rider' }
      vi.mocked(User.create).mockResolvedValueOnce(user as any)

      const result = await service.create({ name: 'Ana', email: 'ana@test.com', role: 'rider' })
      expect(result).toEqual(user)
    })
  })

  describe('findAll', () => {
    it('retorna todos os usuários sem filtros', async () => {
      const users = [{ name: 'A' }, { name: 'B' }]
      vi.mocked(User.find).mockReturnValueOnce(makeSortable(users) as any)

      const result = await service.findAll()

      expect(User.find).toHaveBeenCalledWith({})
      expect(result).toEqual(users)
    })

    it('aplica filtro de role', async () => {
      vi.mocked(User.find).mockReturnValueOnce(makeSortable([]) as any)

      await service.findAll({ role: 'driver' })

      expect(User.find).toHaveBeenCalledWith({ role: 'driver' })
    })

    it('aplica filtros isActive e isApproved', async () => {
      vi.mocked(User.find).mockReturnValueOnce(makeSortable([]) as any)

      await service.findAll({ isActive: true, isApproved: false })

      expect(User.find).toHaveBeenCalledWith({ isActive: true, isApproved: false })
    })

    it('não inclui filtros com valor undefined', async () => {
      vi.mocked(User.find).mockReturnValueOnce(makeSortable([]) as any)

      await service.findAll({ role: undefined })

      expect(User.find).toHaveBeenCalledWith({})
    })
  })

  describe('findById', () => {
    it('retorna usuário pelo id', async () => {
      const user = { _id: 'id1', name: 'Bob' }
      vi.mocked(User.findById).mockResolvedValueOnce(user as any)

      const result = await service.findById('id1')
      expect(result).toEqual(user)
    })

    it('retorna null se não encontrado', async () => {
      vi.mocked(User.findById).mockResolvedValueOnce(null)

      const result = await service.findById('inexistente')
      expect(result).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('busca por email normalizado para lowercase', async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(null)

      await service.findByEmail('BOB@TEST.COM')

      expect(User.findOne).toHaveBeenCalledWith({ email: 'bob@test.com' })
    })
  })

  describe('update', () => {
    it('atualiza e retorna usuário', async () => {
      const updated = { _id: 'id1', name: 'Novo' }
      vi.mocked(User.findByIdAndUpdate).mockResolvedValueOnce(updated as any)

      const result = await service.update('id1', { name: 'Novo' })

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('id1', { name: 'Novo' }, { new: true, runValidators: true })
      expect(result).toEqual(updated)
    })

    it('retorna null se usuário não existe', async () => {
      vi.mocked(User.findByIdAndUpdate).mockResolvedValueOnce(null)

      const result = await service.update('fake', { name: 'X' })
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('deleta e retorna o usuário removido', async () => {
      const user = { _id: 'id1' }
      vi.mocked(User.findByIdAndDelete).mockResolvedValueOnce(user as any)

      const result = await service.delete('id1')
      expect(result).toEqual(user)
    })

    it('retorna null se não encontrado', async () => {
      vi.mocked(User.findByIdAndDelete).mockResolvedValueOnce(null)

      const result = await service.delete('fake')
      expect(result).toBeNull()
    })
  })
})
