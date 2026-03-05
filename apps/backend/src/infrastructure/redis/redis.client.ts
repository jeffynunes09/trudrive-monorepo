import Redis from "ioredis";

let redis: Redis;

export function getRedisClient() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
        tls: process.env.REDIS_URL!.startsWith('rediss://') ? {} : undefined,
      
    });

    redis.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redis.on("error", (err) => {
      console.error("❌ Redis error:", err);
    });
  }

  return redis;
}

const DRIVERS_GEO_KEY = "drivers:online";

export async function addDriverLocation(
  driverId: string,
  lat: number,
  lng: number
): Promise<void> {
  const client = getRedisClient();
  await client.geoadd(DRIVERS_GEO_KEY, lng, lat, driverId);
}

export async function removeDriverLocation(driverId: string): Promise<void> {
  const client = getRedisClient();
  await client.zrem(DRIVERS_GEO_KEY, driverId);
}

export async function getNearbyDrivers(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<string[]> {
  const client = getRedisClient();

  const results = await client.geosearch(
    DRIVERS_GEO_KEY,
    "FROMLONLAT",
    lng,
    lat,
    "BYRADIUS",
    radiusKm,
    "km",
    "ASC"
  );

  return results as string[];
}

export async function getDriverLocation(
  driverId: string
): Promise<{ lat: number; lng: number } | null> {
  const client = getRedisClient();
  const results = await client.geopos(DRIVERS_GEO_KEY, driverId);
  const pos = results?.[0];
  if (!pos || pos[0] === null || pos[1] === null) return null;
  return { lat: parseFloat(pos[1]), lng: parseFloat(pos[0]) };
}

// ─── Driver runtime state (persisted for multi-instance support) ──────────────

const DRIVER_STATE_PREFIX = 'driver:state:'
const DRIVER_STATE_TTL_S = 86400 // 24h

export interface DriverState {
  activeRideId?: string
  activeRideRiderId?: string
  queuedRideId?: string
  queuedRideRiderId?: string
}

export async function setDriverState(driverId: string, state: DriverState): Promise<void> {
  const client = getRedisClient()
  const key = `${DRIVER_STATE_PREFIX}${driverId}`
  const toSet: Record<string, string> = {}
  for (const [k, v] of Object.entries(state)) {
    if (v) toSet[k] = v
  }
  if (Object.keys(toSet).length > 0) {
    await client.hset(key, toSet)
    await client.expire(key, DRIVER_STATE_TTL_S)
  }
}

export async function clearDriverStateField(driverId: string, ...fields: string[]): Promise<void> {
  const client = getRedisClient()
  if (fields.length > 0) {
    await client.hdel(`${DRIVER_STATE_PREFIX}${driverId}`, ...fields)
  }
}

export async function getDriverState(driverId: string): Promise<DriverState | null> {
  const client = getRedisClient()
  const raw = await client.hgetall(`${DRIVER_STATE_PREFIX}${driverId}`)
  if (!raw || Object.keys(raw).length === 0) return null
  return {
    activeRideId: raw.activeRideId,
    activeRideRiderId: raw.activeRideRiderId,
    queuedRideId: raw.queuedRideId,
    queuedRideRiderId: raw.queuedRideRiderId,
  }
}

export async function clearDriverState(driverId: string): Promise<void> {
  const client = getRedisClient()
  await client.del(`${DRIVER_STATE_PREFIX}${driverId}`)
}