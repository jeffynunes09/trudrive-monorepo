import { Router } from 'express'
import { UserController } from './user.controller'

const router = Router()
const controller = new UserController()

router.post('/users', controller.create.bind(controller))
router.get('/users', controller.findAll.bind(controller))
router.get('/users/:id', controller.findById.bind(controller))
router.patch('/users/:id', controller.update.bind(controller))
router.delete('/users/:id', controller.delete.bind(controller))

export default router
