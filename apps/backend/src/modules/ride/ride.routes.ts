import { Router } from 'express'
import { RideController } from './ride.controller'

const router = Router()
const controller = new RideController()

router.post('/rides', controller.create.bind(controller))
router.get('/rides', controller.findAll.bind(controller))
router.get('/rides/:id', controller.findById.bind(controller))
router.patch('/rides/:id', controller.update.bind(controller))
router.delete('/rides/:id', controller.delete.bind(controller))

export default router
