import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../modules/ride/ride.schema', () => ({
  Ride: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}))

vi.mock('../infrastructure/redis/redis.client', () => ({
  getNearbyDrivers: vi.fn(),
}))

vi.mock('../infrastructure/routes/ors.client', () => ({
  getRoute: vi.fn(),
}))

import { RideService } from '../modules/ride/ride.service'
import { Ride } from '../modules/ride/ride.schema'
import { getNearbyDrivers } from '../infrastructure/redis/redis.client'
import { getRoute } from '../infrastructure/routes/ors.client'

const makeSortable = (resolved: any) => ({ sort: vi.fn().mockResolvedValue(resolved) })

const coords = { lat: -23.5, lng: -46.6, address: 'São Paulo' }

describe('RideService', () => {
  let service: RideService

  beforeEach(() => {
    service = new RideService()
  })

  describe('create', () => {
    it('cria corrida com OTP de 6 dígitos', async () => {
      const fakeRide = { _id: 'ride1', otp: '123456' }
      vi.mocked(Ride.create).mockResolvedValueOnce(fakeRide as any)

      await service.create({ riderId: 'user1', origin: coords, destination: coords })

      const callArg = vi.mocked(Ride.create).mock.calls[0][0] as any
      expect(callArg.otp).toMatch(/^\d{6}$/)
    })
  })

  describe('requestRide', () => {
    it('cria corrida com rota e calcula tarifa corretamente', async () => {
      vi.mocked(getRoute).mockResolvedValueOnce({ distance: 10, duration: 20, geometry: [] })
      vi.mocked(getNearbyDrivers).mockResolvedValueOnce(['driver1', 'driver2'])
      const fakeRide = { _id: 'ride1', status: 'searching_driver' }
      vi.mocked(Ride.create).mockResolvedValueOnce(fakeRide as any)

      const result = await service.requestRide({ riderId: 'user1', origin: coords, destination: coords })

      // fare = BASE_FARE(5) + distance(10)*FARE_PER_KM(2.5) + duration(20)*FARE_PER_MIN(0.3) = 5 + 25 + 6 = 36
      const callArg = vi.mocked(Ride.create).mock.calls[0][0] as any
      expect(callArg.fare).toBe(36)
      expect(callArg.status).toBe('searching_driver')
      expect(callArg.otp).toMatch(/^\d{6}$/)
      expect(result.driverIds).toEqual(['driver1', 'driver2'])
    })

    it('cria corrida sem tarifa quando rota não disponível', async () => {
      vi.mocked(getRoute).mockResolvedValueOnce(null)
      vi.mocked(getNearbyDrivers).mockResolvedValueOnce([])
      vi.mocked(Ride.create).mockResolvedValueOnce({ _id: 'ride2' } as any)

      await service.requestRide({ riderId: 'user1', origin: coords, destination: coords })

      const callArg = vi.mocked(Ride.create).mock.calls[0][0] as any
      expect(callArg.fare).toBeUndefined()
    })

    it('retorna lista de motoristas próximos', async () => {
      vi.mocked(getRoute).mockResolvedValueOnce(null)
      vi.mocked(getNearbyDrivers).mockResolvedValueOnce(['d1', 'd2', 'd3'])
      vi.mocked(Ride.create).mockResolvedValueOnce({ _id: 'ride3' } as any)

      const result = await service.requestRide({ riderId: 'user1', origin: coords, destination: coords })

      expect(result.driverIds).toEqual(['d1', 'd2', 'd3'])
    })
  })

  describe('findAll', () => {
    it('retorna corridas sem filtros', async () => {
      const rides = [{ _id: 'r1' }]
      vi.mocked(Ride.find).mockReturnValueOnce(makeSortable(rides) as any)

      const result = await service.findAll()

      expect(Ride.find).toHaveBeenCalledWith({})
      expect(result).toEqual(rides)
    })

    it('aplica filtro riderId', async () => {
      vi.mocked(Ride.find).mockReturnValueOnce(makeSortable([]) as any)

      await service.findAll({ riderId: 'user1' })

      expect(Ride.find).toHaveBeenCalledWith({ riderId: 'user1' })
    })

    it('aplica filtro driverId e status', async () => {
      vi.mocked(Ride.find).mockReturnValueOnce(makeSortable([]) as any)

      await service.findAll({ driverId: 'd1', status: 'in_progress' })

      expect(Ride.find).toHaveBeenCalledWith({ driverId: 'd1', status: 'in_progress' })
    })
  })

  describe('findById', () => {
    it('retorna corrida pelo id', async () => {
      vi.mocked(Ride.findById).mockResolvedValueOnce({ _id: 'r1' } as any)

      const result = await service.findById('r1')
      expect(result).toEqual({ _id: 'r1' })
    })

    it('retorna null se não encontrada', async () => {
      vi.mocked(Ride.findById).mockResolvedValueOnce(null)

      const result = await service.findById('fake')
      expect(result).toBeNull()
    })
  })

  describe('acceptRide', () => {
    it('atualiza status para driver_assigned atomicamente', async () => {
      const updatedRide = { _id: 'r1', status: 'driver_assigned', driverId: 'd1' }
      vi.mocked(Ride.findOneAndUpdate).mockResolvedValueOnce(updatedRide as any)

      const result = await service.acceptRide('r1', 'd1')

      expect(Ride.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'r1', status: 'searching_driver' },
        { driverId: 'd1', status: 'driver_assigned' },
        { new: true }
      )
      expect(result?.status).toBe('driver_assigned')
    })

    it('retorna null se corrida não está em searching_driver', async () => {
      vi.mocked(Ride.findOneAndUpdate).mockResolvedValueOnce(null)

      const result = await service.acceptRide('r1', 'd2')
      expect(result).toBeNull()
    })
  })

  describe('rejectByDriver', () => {
    it('adiciona driverId ao array rejectedByDriverIds', async () => {
      vi.mocked(Ride.updateOne).mockResolvedValueOnce({} as any)

      await service.rejectByDriver('r1', 'd1')

      expect(Ride.updateOne).toHaveBeenCalledWith(
        { _id: 'r1' },
        { $addToSet: { rejectedByDriverIds: 'd1' } }
      )
    })
  })

  describe('validateAndStartRide', () => {
    it('retorna null se corrida não encontrada', async () => {
      vi.mocked(Ride.findOne).mockResolvedValueOnce(null)

      const result = await service.validateAndStartRide('r1', 'd1', '123456')
      expect(result).toBeNull()
    })

    it('retorna null se OTP incorreto', async () => {
      vi.mocked(Ride.findOne).mockResolvedValueOnce({ otp: '999999' } as any)

      const result = await service.validateAndStartRide('r1', 'd1', '123456')
      expect(result).toBeNull()
    })

    it('inicia corrida com OTP correto', async () => {
      vi.mocked(Ride.findOne).mockResolvedValueOnce({ otp: '123456' } as any)
      const started = { _id: 'r1', status: 'in_progress', otpVerified: true }
      vi.mocked(Ride.findOneAndUpdate).mockResolvedValueOnce(started as any)

      const result = await service.validateAndStartRide('r1', 'd1', '123456')

      expect(Ride.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'r1', driverId: 'd1', status: 'driver_assigned' },
        expect.objectContaining({ status: 'in_progress', otpVerified: true }),
        { new: true }
      )
      expect(result?.status).toBe('in_progress')
    })
  })

  describe('processPayment', () => {
    it('atualiza status de payment_pending para paid', async () => {
      const paid = { _id: 'r1', status: 'paid', paymentConfirmed: true }
      vi.mocked(Ride.findOneAndUpdate).mockResolvedValueOnce(paid as any)

      const result = await service.processPayment('r1')

      expect(Ride.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'r1', status: 'payment_pending' },
        { status: 'paid', paymentConfirmed: true },
        { new: true }
      )
      expect(result?.status).toBe('paid')
    })
  })

  describe('finishRide', () => {
    it('atualiza status de paid para completed', async () => {
      const completed = { _id: 'r1', status: 'completed' }
      vi.mocked(Ride.findOneAndUpdate).mockResolvedValueOnce(completed as any)

      const result = await service.finishRide('r1')

      expect(Ride.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'r1', status: 'paid' },
        expect.objectContaining({ status: 'completed' }),
        { new: true }
      )
      expect(result?.status).toBe('completed')
    })
  })

  describe('findActiveRideForUser', () => {
    const activeStatuses = ['searching_driver', 'driver_assigned', 'in_progress', 'payment_pending']

    it('busca corrida ativa para rider pelo riderId', async () => {
      vi.mocked(Ride.findOne).mockReturnValueOnce(makeSortable(null) as any)

      await service.findActiveRideForUser('user1', 'rider')

      expect(Ride.findOne).toHaveBeenCalledWith({
        riderId: 'user1',
        status: { $in: activeStatuses },
      })
    })

    it('busca corrida ativa para driver pelo driverId', async () => {
      vi.mocked(Ride.findOne).mockReturnValueOnce(makeSortable(null) as any)

      await service.findActiveRideForUser('driver1', 'driver')

      expect(Ride.findOne).toHaveBeenCalledWith({
        driverId: 'driver1',
        status: { $in: activeStatuses },
      })
    })

    it('retorna corrida ativa encontrada', async () => {
      const ride = { _id: 'r1', status: 'in_progress' }
      vi.mocked(Ride.findOne).mockReturnValueOnce(makeSortable(ride) as any)

      const result = await service.findActiveRideForUser('u1', 'rider')
      expect(result).toEqual(ride)
    })
  })

  describe('update', () => {
    it('atualiza campos da corrida', async () => {
      const updated = { _id: 'r1', status: 'cancelled' }
      vi.mocked(Ride.findByIdAndUpdate).mockResolvedValueOnce(updated as any)

      const result = await service.update('r1', { status: 'cancelled' })

      expect(Ride.findByIdAndUpdate).toHaveBeenCalledWith('r1', { status: 'cancelled' }, { new: true, runValidators: true })
      expect(result?.status).toBe('cancelled')
    })
  })

  describe('delete', () => {
    it('deleta corrida pelo id', async () => {
      const ride = { _id: 'r1' }
      vi.mocked(Ride.findByIdAndDelete).mockResolvedValueOnce(ride as any)

      const result = await service.delete('r1')
      expect(result).toEqual(ride)
    })
  })
})
