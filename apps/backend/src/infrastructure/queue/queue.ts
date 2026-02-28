import { Queue } from 'bullmq'

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}

// Queue definitions
export const notifyDriversQueue = new Queue('notify-drivers', { connection })
export const processPaymentQueue = new Queue('process-payment', { connection })
export const sendReceiptQueue = new Queue('send-receipt', { connection })
export const processImageQueue = new Queue('process-image', { connection })

export const Queues = {
  NOTIFY_DRIVERS: 'notify-drivers',
  PROCESS_PAYMENT: 'process-payment',
  SEND_RECEIPT: 'send-receipt',
  PROCESS_IMAGE: 'process-image',
} as const
