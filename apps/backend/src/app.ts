import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import 'dotenv/config'

import { connectDatabase } from './infrastructure/database/connection'
import { initWebSocket } from './infrastructure/websocket/socket'
import authRoutes from './modules/auth/auth.routes'
import rideRoutes from './modules/ride/ride.routes'
import geocodeRoutes from './modules/geocode/geocode.routes'
import { userRoutes } from './modules/user/user.module'
import { createRateLimiter } from './infrastructure/middleware/rateLimiter'
import { logger } from './infrastructure/logger'
import './workers/rideExpiry.worker'

const app = express()
const httpServer = createServer(app)

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// M2: Rate limiting por endpoint
const loginLimiter    = createRateLimiter(60_000, 10, 'Muitas tentativas de login. Aguarde 1 minuto.')
const registerLimiter = createRateLimiter(60 * 60_000, 5, 'Muitos registros. Tente novamente em 1 hora.')
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth/register', registerLimiter)

// HTTP routes intentionally removed — all communication via WebSocket (socket.io)
// Exception: REST kept for payment webhooks and file uploads when needed
// import paymentRoutes from './modules/payment/payment.routes'
// import uploadRoutes from './modules/upload/upload.routes'
// app.use('/api/payments', paymentRoutes)
// app.use('/api/uploads', uploadRoutes)

app.use('/api/auth', authRoutes)
app.use('/api', rideRoutes)
app.use('/api', userRoutes)
app.use('/api/geocode', geocodeRoutes)
app.get('/health', (_, res) => res.json({ status: 'ok' }))

async function bootstrap() {
  await connectDatabase()
  await initWebSocket(httpServer)

  const PORT = process.env.PORT || 3000
  httpServer.listen(PORT, () => {
    logger.info('Server started', { port: PORT, env: process.env.NODE_ENV })
  })
}

bootstrap().catch((err) => {
  logger.error('Bootstrap fatal error', { error: err.message })
  process.exit(1)
})
