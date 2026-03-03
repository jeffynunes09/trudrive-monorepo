import { Request, Response } from 'express'
import { UserService } from './user.service'
import { generatePresignedUrl } from '../upload/upload.service'

const userService = new UserService()

export class UserController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.create(req.body)
      res.status(201).json(user)
    } catch (err: any) {
      if (err.code === 11000) {
        res.status(409).json({ message: 'Dado já cadastrado (email, telefone, CPF ou placa duplicado)' })
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
        res.status(404).json({ message: 'Usuário não encontrado' })
        return
      }
      res.json(user)
    } catch (err: any) {
      res.status(500).json({ message: err.message })
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.findById(req.user!.userId)
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado' })
        return
      }
      res.json(user)
    } catch (err: any) {
      res.status(500).json({ message: err.message })
    }
  }

  async updateMe(req: Request, res: Response): Promise<void> {
    try {
      // Prevent role/approval escalation via this endpoint
      const { isApproved, isActive, role, ...safeData } = req.body
      const user = await userService.update(req.user!.userId, safeData)
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado' })
        return
      }
      res.json(user)
    } catch (err: any) {
      if (err.code === 11000) {
        res.status(409).json({ message: 'Dado já em uso (telefone, CPF ou placa duplicado)' })
        return
      }
      res.status(400).json({ message: err.message })
    }
  }

  async getUploadUrl(req: Request, res: Response): Promise<void> {
    console.log('[controller] getUploadUrl | userId:', req.user?.userId, '| body:', req.body)
    try {
      const { folder, mimeType } = req.body
      const allowed = ['profile', 'driver_license', 'vehicle_doc']
      if (!folder || !allowed.includes(folder)) {
        console.warn('[controller] getUploadUrl | pasta inválida:', folder)
        res.status(400).json({ message: 'Pasta inválida. Use: profile, driver_license ou vehicle_doc' })
        return
      }
      if (!mimeType || !mimeType.startsWith('image/')) {
        console.warn('[controller] getUploadUrl | mimeType inválido:', mimeType)
        res.status(400).json({ message: 'mimeType inválido. Apenas imagens são permitidas.' })
        return
      }
      const result = await generatePresignedUrl(folder, mimeType)
      console.log('[controller] getUploadUrl | retornando URL | key:', result.key)
      res.json(result)
    } catch (err: any) {
      console.error('[controller] getUploadUrl | erro:', err.message)
      res.status(500).json({ message: err.message })
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.update(req.params.id, req.body)
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado' })
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
        res.status(404).json({ message: 'Usuário não encontrado' })
        return
      }
      res.status(204).send()
    } catch (err: any) {
      res.status(500).json({ message: err.message })
    }
  }
}
