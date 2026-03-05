import { Router } from 'express'
import { UserController } from './user.controller'
import { authMiddleware } from '../../infrastructure/middleware/auth.middleware'
import { requireAdmin } from '../../infrastructure/middleware/requireAdmin.middleware'

const router = Router()
const controller = new UserController()

// Autenticado: próprio perfil
router.get('/users/me', authMiddleware, controller.getMe.bind(controller))
router.patch('/users/me', authMiddleware, controller.updateMe.bind(controller))
router.post('/users/me/upload-url', authMiddleware, controller.getUploadUrl.bind(controller))

// Admin only
router.post('/users', authMiddleware, requireAdmin, controller.create.bind(controller))
router.get('/users', authMiddleware, requireAdmin, controller.findAll.bind(controller))
router.get('/users/:id', authMiddleware, requireAdmin, controller.findById.bind(controller))
router.patch('/users/:id/approve', authMiddleware, requireAdmin, controller.approveDriver.bind(controller))
router.patch('/users/:id/deactivate', authMiddleware, requireAdmin, controller.deactivateUser.bind(controller))
router.patch('/users/:id', authMiddleware, requireAdmin, controller.update.bind(controller))
router.delete('/users/:id', authMiddleware, requireAdmin, controller.delete.bind(controller))

export default router
