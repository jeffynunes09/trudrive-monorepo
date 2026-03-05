import { Router, Request, Response, NextFunction } from 'express'
import { AuthController } from './auth.controller'

const router = Router()
const controller = new AuthController()

// A3: Validação de entrada — register
function validateRegister(req: Request, res: Response, next: NextFunction): void {
  const { name, email, password, role } = req.body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ message: 'Nome deve ter ao menos 2 caracteres' })
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    res.status(400).json({ message: 'E-mail inválido' })
    return
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ message: 'Senha deve ter ao menos 6 caracteres' })
    return
  }

  if (!role || !['driver', 'rider'].includes(role)) {
    res.status(400).json({ message: 'Role deve ser "driver" ou "rider"' })
    return
  }

  next()
}

// A3: Validação de entrada — login
function validateLogin(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body

  if (!email || typeof email !== 'string') {
    res.status(400).json({ message: 'E-mail é obrigatório' })
    return
  }

  if (!password || typeof password !== 'string') {
    res.status(400).json({ message: 'Senha é obrigatória' })
    return
  }

  next()
}

router.post('/register', validateRegister, controller.register.bind(controller))
router.post('/login', validateLogin, controller.login.bind(controller))

export default router
