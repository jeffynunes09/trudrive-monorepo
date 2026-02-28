// Socket.io event names shared between backend and frontend

export const SocketEvents = {
  // Ride flow
  RIDE_REQUEST: 'RIDE_REQUEST',
  RIDE_REQUEST_RESPONSE: 'RIDE_REQUEST_RESPONSE',
  RIDE_STATUS_UPDATE: 'RIDE_STATUS_UPDATE',
  CANCEL_RIDE: 'CANCEL_RIDE',

  // Driver
  DRIVER_LOCATION_UPDATE: 'DRIVER_LOCATION_UPDATE',
  DRIVER_HEARTBEAT: 'DRIVER_HEARTBEAT',
  DRIVER_ONLINE: 'DRIVER_ONLINE',
  DRIVER_OFFLINE: 'DRIVER_OFFLINE',

  // Chat
  CHAT_MESSAGE: 'CHAT_MESSAGE',
} as const

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents]

// Domain events (internal pub/sub via Redis)
export const DomainEvents = {
  RIDE_CREATED: 'ride.created',
  RIDE_ACCEPTED: 'ride.accepted',
  RIDE_CANCELLED: 'ride.cancelled',
  RIDE_COMPLETED: 'ride.completed',
  PAYMENT_PROCESSED: 'payment.processed',
} as const
