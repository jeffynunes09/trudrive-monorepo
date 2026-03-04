import { describe, it, expect } from 'vitest'
import { Email } from '../Email'
import { DomainError } from '../../errors/DomainError'

describe('Email value object', () => {
  it('deve criar e-mail válido', () => {
    const email = Email.create('Admin@TruDrive.com')
    expect(email.toString()).toBe('admin@trudrive.com')
  })

  it('deve normalizar para lowercase', () => {
    const email = Email.create('USER@EXAMPLE.COM')
    expect(email.toString()).toBe('user@example.com')
  })

  it('deve lançar DomainError para e-mail inválido', () => {
    expect(() => Email.create('not-an-email')).toThrow(DomainError)
    expect(() => Email.create('')).toThrow(DomainError)
    expect(() => Email.create('missing@')).toThrow(DomainError)
  })
})
