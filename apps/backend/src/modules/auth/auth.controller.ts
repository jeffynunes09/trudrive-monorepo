import { Request, Response } from 'express'
import { AuthService } from './auth.service'

const authService = new AuthService()

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body)
      res.status(201).json(result)
    } catch (err: any) {
      const status = err.message === 'E-mail já cadastrado' ? 409 : 400
      res.status(status).json({ message: err.message })
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body)
      res.json(result)
    } catch (err: any) {
      res.status(401).json({ message: err.message })
    }
  }
}
