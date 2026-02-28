import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL }) as RedisClientType
    await redisClient.connect()
    console.log('Redis connected')
  }
  return redisClient
}

// Key patterns
export const RedisKeys = {
  driverLocation: (driverId: string) => `driver:${driverId}:location`,
  activeRide: (driverId: string) => `ride:active:driver:${driverId}`,
  driverHeartbeat: (driverId: string) => `driver:${driverId}:heartbeat`,
  nearbyDrivers: (lat: number, lng: number) => `nearby:${lat}:${lng}`,
}
