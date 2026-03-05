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
  RIDE_CREATED: 'RIDE_CREATED',
  RIDE_REQUEST: 'RIDE_REQUEST',
  RIDE_REQUEST_RESPONSE: 'RIDE_REQUEST_RESPONSE',
  RIDE_STATUS_UPDATE: 'RIDE_STATUS_UPDATE',
  RIDE_START: 'RIDE_START',
  RIDE_PAYMENT_REQUEST: 'RIDE_PAYMENT_REQUEST',
  CANCEL_RIDE: 'CANCEL_RIDE',
  RIDE_ROUTE_UPDATE: 'RIDE_ROUTE_UPDATE',        // backend → driver: nova geometria de rota (driver→embarque ou embarque→destino)

  // OTP — confirmação de embarque
  OTP_VALIDATE: 'OTP_VALIDATE',                  // driver → backend: motorista envia código OTP
  OTP_INVALID: 'OTP_INVALID',                    // backend → driver: OTP incorreto
  OTP_VERIFIED: 'OTP_VERIFIED',                  // backend → driver: OTP correto, corrida iniciada

  // Segunda corrida
  SECOND_RIDE_AVAILABLE: 'SECOND_RIDE_AVAILABLE', // backend → driver: pode aceitar segunda corrida

  // Restore de corrida ativa ao reconectar
  RIDE_RESTORE: 'RIDE_RESTORE',      // backend → client: corrida ativa ao conectar (IRide | null)
  GET_RIDE_STATE: 'GET_RIDE_STATE',  // client → backend: solicita RIDE_RESTORE quando socket já estava conectado

  // User presence
  USER_ONLINE: 'USER_ONLINE',

  // Driver
  DRIVER_LOCATION_UPDATE: 'DRIVER_LOCATION_UPDATE',
  DRIVER_LOCATION_BROADCAST: 'DRIVER_LOCATION_BROADCAST',
  DRIVER_HEARTBEAT: 'DRIVER_HEARTBEAT',
  DRIVER_ONLINE: 'DRIVER_ONLINE',
  DRIVER_OFFLINE: 'DRIVER_OFFLINE',

  // Chat
  CHAT_MESSAGE: 'CHAT_MESSAGE',

  // Admin → Driver
  DRIVER_APPROVED: 'driver:approved',

  // Rating
  RATE_DRIVER: 'RATE_DRIVER',
  RATE_DRIVER_SUCCESS: 'RATE_DRIVER_SUCCESS',
  RATE_DRIVER_ERROR: 'RATE_DRIVER_ERROR',
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
