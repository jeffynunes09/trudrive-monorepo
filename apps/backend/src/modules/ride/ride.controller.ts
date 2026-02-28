import { Request, Response } from 'express'
import { RideService } from './ride.service'
import { RideStatus } from './ride.schema'

const rideService = new RideService()

export class RideController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const ride = await rideService.create(req.body)
      res.status(201).json(ride)
    } catch (err: any) {
      res.status(400).json({ message: err.message })
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const { riderId, driverId, status } = req.query
      const rides = await rideService.findAll({
        riderId: riderId as string,
        driverId: driverId as string,
        status: status as RideStatus,
      })
      res.json(rides)
    } catch (err: any) {
      res.status(500).json({ message: err.message })
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const ride = await rideService.findById(req.params.id)
      if (!ride) {
        res.status(404).json({ message: 'Ride not found' })
        return
      }
      res.json(ride)
    } catch (err: any) {
      res.status(500).json({ message: err.message })
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const ride = await rideService.update(req.params.id, req.body)
      if (!ride) {
        res.status(404).json({ message: 'Ride not found' })
        return
      }
      res.json(ride)
    } catch (err: any) {
      res.status(400).json({ message: err.message })
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const ride = await rideService.delete(req.params.id)
      if (!ride) {
        res.status(404).json({ message: 'Ride not found' })
        return
      }
      res.status(204).send()
    } catch (err: any) {
      res.status(500).json({ message: err.message })
    }
  }
}
