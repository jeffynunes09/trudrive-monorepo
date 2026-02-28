// Socket.io event names shared between backend and frontend

export const SocketEvents = {
  // User CRUD
  USER_CREATE: 'user:create',
  USER_FIND_ALL: 'user:findAll',
  USER_FIND_BY_ID: 'user:findById',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Ride CRUD
  RIDE_CREATE: 'ride:create',
  RIDE_FIND_ALL: 'ride:findAll',
  RIDE_FIND_BY_ID: 'ride:findById',
  RIDE_UPDATE: 'ride:update',
  RIDE_DELETE: 'ride:delete',

  // Ride flow
  RIDE_REQUEST: 'RIDE_REQUEST',
  RIDE_REQUEST_RESPONSE: 'RIDE_REQUEST_RESPONSE',
  RIDE_STATUS_UPDATE: 'RIDE_STATUS_UPDATE',
  CANCEL_RIDE: 'CANCEL_RIDE',

  // User presence
  USER_ONLINE: 'USER_ONLINE',

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
