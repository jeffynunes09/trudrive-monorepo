import { Request, Response } from 'express'
import { UserService } from './user.service'

const userService = new UserService()

export class UserController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.create(req.body)
      res.status(201).json(user)
    } catch (err: any) {
      if (err.code === 11000) {
        res.status(409).json({ message: 'Phone already registered' })
        return
      }
      res.status(400).json({ message: err.message })
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const { role, isActive, isApproved } = req.query
      const filters: Record<string, any> = {}
      if (role) filters.role = role
      if (isActive !== undefined) filters.isActive = isActive === 'true'
      if (isApproved !== undefined) filters.isApproved = isApproved === 'true'

      const users = await userService.findAll(filters)
      res.json(users)
    } catch (err: any) {
      res.status(500).json({ message: err.message })
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.findById(req.params.id)
      if (!user) {
        res.status(404).json({ message: 'User not found' })
        return
      }
      res.json(user)
    } catch (err: any) {
      res.status(500).json({ message: err.message })
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.update(req.params.id, req.body)
      if (!user) {
        res.status(404).json({ message: 'User not found' })
        return
      }
      res.json(user)
    } catch (err: any) {
      res.status(400).json({ message: err.message })
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.delete(req.params.id)
      if (!user) {
        res.status(404).json({ message: 'User not found' })
        return
      }
      res.status(204).send()
    } catch (err: any) {
      res.status(500).json({ message: err.message })
    }
  }
}
