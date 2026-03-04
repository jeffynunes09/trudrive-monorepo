import { describe, it, expect } from 'vitest'
import { User } from '../User'
import type { UserProps } from '../User'

const baseProps: UserProps = {
  id: '1',
  name: 'João Silva',
  email: 'joao@trudrive.com',
  role: 'driver',
  isActive: true,
  isApproved: false,
  licensePlate: 'ABC-1234',
  vehicleModel: 'Honda Civic',
  vehicleYear: 2022,
  vehicleColor: 'Preto',
  document: '123.456.789-00',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('User entity', () => {
  it('deve identificar motorista corretamente', () => {
    const user = new User(baseProps)
    expect(user.isDriver()).toBe(true)
    expect(user.isRider()).toBe(false)
  })

  it('deve identificar motorista pendente de aprovação', () => {
    const user = new User({ ...baseProps, isApproved: false })
    expect(user.needsApproval()).toBe(true)
  })

  it('não deve exigir aprovação de motorista já aprovado', () => {
    const user = new User({ ...baseProps, isApproved: true })
    expect(user.needsApproval()).toBe(false)
  })

  it('deve validar informações completas do veículo', () => {
    const user = new User(baseProps)
    expect(user.hasCompleteVehicleInfo()).toBe(true)
  })

  it('deve indicar informações incompletas quando falta placa', () => {
    const user = new User({ ...baseProps, licensePlate: undefined })
    expect(user.hasCompleteVehicleInfo()).toBe(false)
  })
})
