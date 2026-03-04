import { DomainError } from '../errors/DomainError'

export class Money {
  private readonly cents: number

  private constructor(cents: number) {
    this.cents = cents
  }

  static fromNumber(value: number): Money {
    if (value < 0) throw new DomainError('Valor monetário não pode ser negativo.')
    return new Money(Math.round(value * 100))
  }

  toNumber(): number {
    return this.cents / 100
  }

  format(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.toNumber())
  }
}
