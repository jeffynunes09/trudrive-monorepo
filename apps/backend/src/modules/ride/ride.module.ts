// Ride Module
// Responsible for: ride creation, matching, status updates
// Events emitted: ride.created, ride.accepted, ride.cancelled, ride.completed
// Queues: notify-drivers

export * from './ride.controller'
export * from './ride.service'
export * from './ride.schema'
export { default as rideRoutes } from './ride.routes'
