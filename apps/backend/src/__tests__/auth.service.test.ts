import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../modules/user/user.schema', () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}))

import { AuthService } from '../modules/auth/auth.service'
import { User } from '../modules/user/user.schema'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    service = new AuthService()
  })

  describe('register', () => {
    it('lança erro se e-mail já cadastrado', async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce({ email: 'test@test.com' } as any)

      await expect(
        service.register({ name: 'A', email: 'test@test.com', password: '123', role: 'rider' })
      ).rejects.toThrow('E-mail já cadastrado')
    })

    it('normaliza email para lowercase antes de buscar', async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(null)
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('hash' as any)
      const fakeUser = { _id: { toString: () => 'id1' }, name: 'A', email: 'test@test.com', role: 'rider' }
      vi.mocked(User.create).mockResolvedValueOnce(fakeUser as any)
      vi.mocked(jwt.sign).mockReturnValueOnce('tok' as any)

      await service.register({ name: 'A', email: 'TEST@TEST.COM', password: '123', role: 'rider' })

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' })
    })

    it('cria usuário com hash da senha e retorna token', async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(null)
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed_pw' as any)
      const fakeUser = { _id: { toString: () => 'id1' }, name: 'João', email: 'joao@test.com', role: 'rider' }
      vi.mocked(User.create).mockResolvedValueOnce(fakeUser as any)
      vi.mocked(jwt.sign).mockReturnValueOnce('my_token' as any)

      const result = await service.register({ name: 'João', email: 'joao@test.com', password: 'senha', role: 'rider' })

      expect(bcrypt.hash).toHaveBeenCalledWith('senha', 10)
      expect(result.token).toBe('my_token')
      expect(result.user).toEqual({ id: 'id1', name: 'João', email: 'joao@test.com', role: 'rider' })
    })

    it('registra motorista com campos específicos de driver', async () => {
      vi.mocked(User.findOne).mockResolvedValueOnce(null)
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('h' as any)
      const fakeDriver = { _id: { toString: () => 'id2' }, name: 'Motorista', email: 'm@test.com', role: 'driver' }
      vi.mocked(User.create).mockResolvedValueOnce(fakeDriver as any)
      vi.mocked(jwt.sign).mockReturnValueOnce('tok2' as any)

      await service.register({
        name: 'Motorista',
        email: 'm@test.com',
        password: '123',
        role: 'driver',
        document: '123.456.789-00',
        licensePlate: 'ABC1234',
        vehicleModel: 'Fiat Uno',
        vehicleYear: 2020,
        vehicleColor: 'Branco',
      })

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: '123.456.789-00',
          licensePlate: 'ABC1234',
          vehicleModel: 'Fiat Uno',
          vehicleYear: 2020,
          vehicleColor: 'Branco',
        })
      )
    })
  })

  describe('login', () => {
    it('lança erro se usuário não encontrado', async () => {
      vi.mocked(User.findOne).mockReturnValueOnce({ select: vi.fn().mockResolvedValueOnce(null) } as any)

      await expect(service.login({ email: 'x@x.com', password: '123' })).rejects.toThrow('Credenciais inválidas')
    })

    it('lança erro se usuário não tem passwordHash', async () => {
      vi.mocked(User.findOne).mockReturnValueOnce({
        select: vi.fn().mockResolvedValueOnce({ email: 'x@x.com' }),
      } as any)

      await expect(service.login({ email: 'x@x.com', password: '123' })).rejects.toThrow('Credenciais inválidas')
    })

    it('lança erro se senha incorreta', async () => {
      vi.mocked(User.findOne).mockReturnValueOnce({
        select: vi.fn().mockResolvedValueOnce({ passwordHash: 'hash', email: 'x@x.com' }),
      } as any)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as any)

      await expect(service.login({ email: 'x@x.com', password: 'wrong' })).rejects.toThrow('Credenciais inválidas')
    })

    it('retorna token com credenciais válidas', async () => {
      const fakeUser = {
        _id: { toString: () => 'id1' },
        name: 'Maria',
        email: 'maria@test.com',
        role: 'rider',
        passwordHash: 'hash',
      }
      vi.mocked(User.findOne).mockReturnValueOnce({ select: vi.fn().mockResolvedValueOnce(fakeUser) } as any)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as any)
      vi.mocked(jwt.sign).mockReturnValueOnce('valid_token' as any)

      const result = await service.login({ email: 'maria@test.com', password: 'correta' })

      expect(result.token).toBe('valid_token')
      expect(result.user.name).toBe('Maria')
      expect(result.user.role).toBe('rider')
    })

    it('usa .select("+passwordHash") na busca do usuário', async () => {
      const selectMock = vi.fn().mockResolvedValueOnce(null)
      vi.mocked(User.findOne).mockReturnValueOnce({ select: selectMock } as any)

      await service.login({ email: 'x@x.com', password: '123' }).catch(() => {})

      expect(selectMock).toHaveBeenCalledWith('+passwordHash')
    })
  })
})
