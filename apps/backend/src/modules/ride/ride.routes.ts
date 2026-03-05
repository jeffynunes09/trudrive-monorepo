import { Router } from 'express'
import { RideController } from './ride.controller'
import { authMiddleware } from '../../infrastructure/middleware/auth.middleware'
import { requireAdmin } from '../../infrastructure/middleware/requireAdmin.middleware'

const router = Router()
const controller = new RideController()

router.post('/rides', controller.create.bind(controller))
router.get('/rides', controller.findAll.bind(controller))           // suporta ?page=&limit=&status=
router.get('/rides/driver/:driverId', controller.findByDriver.bind(controller))
router.get('/rides/rider/:riderId', controller.findByRider.bind(controller))
router.get('/rides/:id', controller.findById.bind(controller))
router.patch('/rides/:id', controller.update.bind(controller))
router.delete('/rides/:id', authMiddleware, requireAdmin, controller.delete.bind(controller))

export default router
