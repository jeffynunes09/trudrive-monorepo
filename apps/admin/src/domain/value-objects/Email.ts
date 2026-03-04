import { DomainError } from '../errors/DomainError'

export class Email {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new DomainError(`E-mail inválido: "${raw}"`)
    }
    return new Email(normalized)
  }

  toString(): string {
    return this.value
  }
}
