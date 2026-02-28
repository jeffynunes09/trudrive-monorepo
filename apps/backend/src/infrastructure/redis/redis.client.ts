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

const DRIVERS_GEO_KEY = 'drivers:online'

export async function addDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
  const client = await getRedisClient()
  await client.geoAdd(DRIVERS_GEO_KEY, { longitude: lng, latitude: lat, member: driverId })
}

export async function removeDriverLocation(driverId: string): Promise<void> {
  const client = await getRedisClient()
  await client.zRem(DRIVERS_GEO_KEY, driverId)
}

export async function getNearbyDrivers(lat: number, lng: number, radiusKm: number): Promise<string[]> {
  const client = await getRedisClient()
  const results = await client.geoSearch(
    DRIVERS_GEO_KEY,
    { longitude: lng, latitude: lat },
    { radius: radiusKm, unit: 'km' },
    { SORT: 'ASC' }
  )
  return results
}
