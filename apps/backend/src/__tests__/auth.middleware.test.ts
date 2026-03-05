import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}))

import { authMiddleware } from '../infrastructure/middleware/auth.middleware'
import jwt from 'jsonwebtoken'

const mockRes = () => {
  const res = {} as Response
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('authMiddleware', () => {
  let next: NextFunction

  beforeEach(() => {
    next = vi.fn()
  })

  it('retorna 401 se header Authorization ausente', () => {
    const req = { headers: {} } as Request
    const res = mockRes()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Token não fornecido' })
    expect(next).not.toHaveBeenCalled()
  })

  it('retorna 401 se header não começa com Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } } as Request
    const res = mockRes()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('retorna 401 se token inválido', () => {
    vi.mocked(jwt.verify).mockImplementationOnce(() => { throw new Error('invalid') })
    const req = { headers: { authorization: 'Bearer token_invalido' } } as Request
    const res = mockRes()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido' })
    expect(next).not.toHaveBeenCalled()
  })

  it('chama next() e define req.user com token válido', () => {
    const payload = { userId: 'id1', role: 'rider', name: 'Ana' }
    vi.mocked(jwt.verify).mockReturnValueOnce(payload as any)
    const req = { headers: { authorization: 'Bearer token_valido' } } as Request
    const res = mockRes()

    authMiddleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toEqual(payload)
  })

  it('extrai token removendo o prefixo "Bearer "', () => {
    const payload = { userId: 'id2', role: 'driver', name: 'Carlos' }
    vi.mocked(jwt.verify).mockReturnValueOnce(payload as any)
    const req = { headers: { authorization: 'Bearer meu_token_aqui' } } as Request
    const res = mockRes()

    authMiddleware(req, res, next)

    expect(jwt.verify).toHaveBeenCalledWith('meu_token_aqui', expect.any(String))
  })
})
