import { Worker, Job } from 'bullmq'
import { Queues } from '../infrastructure/queue/queue'
import 'dotenv/config'

interface PaymentJob {
  rideId: string
  riderId: string
  amount: number
  provider: 'mercadopago' | 'stripe'
}

const worker = new Worker<PaymentJob>(
  Queues.PROCESS_PAYMENT,
  async (job: Job<PaymentJob>) => {
    const { rideId, riderId, amount, provider } = job.data
    console.log(`[Worker] Processing payment for ride ${rideId}, amount: ${amount}, provider: ${provider}`)
    // TODO: integrate payment provider
  },
  { connection: { url: process.env.REDIS_URL } }
)

worker.on('failed', (job, err) => {
  console.error(`[Worker] Payment job ${job?.id} failed:`, err.message)
})

console.log('[Worker] payment worker running...')
