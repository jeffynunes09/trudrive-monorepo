import { describe, it, expect } from 'vitest'
import { Ride } from '../Ride'
import type { RideProps } from '../Ride'

const baseProps: RideProps = {
  id: 'r1',
  riderId: 'u1',
  origin: { lat: -23.5, lng: -46.6, address: 'Av. Paulista, 1000' },
  destination: { lat: -23.6, lng: -46.7, address: 'Rua Augusta, 200' },
  status: 'in_progress',
  otp: '123456',
  otpVerified: true,
  distance: 5000,
  duration: 900,
  fare: 25.5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('Ride entity', () => {
  it('deve identificar corrida ativa', () => {
    const ride = new Ride(baseProps)
    expect(ride.isActive()).toBe(true)
  })

  it('deve identificar corrida concluída', () => {
    const ride = new Ride({ ...baseProps, status: 'completed' })
    expect(ride.isCompleted()).toBe(true)
    expect(ride.isActive()).toBe(false)
  })

  it('deve formatar distância em km', () => {
    const ride = new Ride({ ...baseProps, distance: 7500 })
    expect(ride.formattedDistance()).toBe('7.5 km')
  })

  it('deve formatar distância em metros quando menor que 1km', () => {
    const ride = new Ride({ ...baseProps, distance: 800 })
    expect(ride.formattedDistance()).toBe('800 m')
  })

  it('deve formatar duração em minutos', () => {
    const ride = new Ride({ ...baseProps, duration: 900 })
    expect(ride.formattedDuration()).toBe('15 min')
  })
})
