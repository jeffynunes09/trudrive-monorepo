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