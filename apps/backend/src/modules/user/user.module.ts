// User Module
// Responsible for: driver/rider registration, auth (OTP), profile management, JWT
// Events emitted: user.created, user.updated

export * from './user.controller'
export * from './user.service'
export * from './user.schema'
export { default as userRoutes } from './user.routes'
