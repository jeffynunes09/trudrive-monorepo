import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import 'dotenv/config'

import { connectDatabase } from './infrastructure/database/connection'
import { initWebSocket } from './infrastructure/websocket/socket'

const app = express()
const httpServer = createServer(app)

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
// import userRoutes from './modules/user/user.routes'
// import rideRoutes from './modules/ride/ride.routes'
// import paymentRoutes from './modules/payment/payment.routes'
// import uploadRoutes from './modules/upload/upload.routes'
// import notificationRoutes from './modules/notification/notification.routes'

// app.use('/api/users', userRoutes)
// app.use('/api/rides', rideRoutes)
// app.use('/api/payments', paymentRoutes)
// app.use('/api/uploads', uploadRoutes)
// app.use('/api/notifications', notificationRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

async function bootstrap() {
  await connectDatabase()
  await initWebSocket(httpServer)

  const PORT = process.env.PORT || 3000
  httpServer.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`)
  })
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal error:', err)
  process.exit(1)
})
