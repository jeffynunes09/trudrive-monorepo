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

// HTTP routes intentionally removed — all communication via WebSocket (socket.io)
// Exception: REST kept for payment webhooks and file uploads when needed
// import paymentRoutes from './modules/payment/payment.routes'
// import uploadRoutes from './modules/upload/upload.routes'
// app.use('/api/payments', paymentRoutes)
// app.use('/api/uploads', uploadRoutes)

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
