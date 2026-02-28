import { Worker, Job } from 'bullmq'
import { getIO } from '../infrastructure/websocket/socket'
import { Queues } from '../infrastructure/queue/queue'
import 'dotenv/config'

interface NotifyDriversJob {
  rideId: string
  riderId: string
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  driverIds: string[]
}

const worker = new Worker<NotifyDriversJob>(
  Queues.NOTIFY_DRIVERS,
  async (job: Job<NotifyDriversJob>) => {
    const { rideId, riderId, origin, destination, driverIds } = job.data
    const io = getIO()

    for (const driverId of driverIds) {
      io.to(`driver:${driverId}`).emit('RIDE_REQUEST', {
        rideId,
        riderId,
        origin,
        destination,
      })
    }

    console.log(`[Worker] Notified ${driverIds.length} drivers for ride ${rideId}`)
  },
  { connection: { url: process.env.REDIS_URL } }
)

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message)
})

console.log('[Worker] notifyDrivers worker running...')
