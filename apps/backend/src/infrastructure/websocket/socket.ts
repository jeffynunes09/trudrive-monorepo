import { Server, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from "ioredis";
import { Server as HttpServer } from 'http'
import { registerRideHandlers } from './handlers/ride.handler'
import { registerDriverHandlers } from './handlers/driver.handler'
import { registerUserHandlers } from './handlers/user.handler'

let io: Server;

export async function initWebSocket(httpServer: HttpServer): Promise<Server> {
  const pubClient = new Redis(process.env.REDIS_URL!);
  const subClient = pubClient.duplicate();
  subClient.on('error', (err) => console.error('❌ Redis sub error:', err.message));

  io = new Server(httpServer, {
    cors: { origin: "*" },
    adapter: createAdapter(pubClient, subClient),
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[WS] Connected: ${socket.id}`);

    registerRideHandlers(socket)
    registerDriverHandlers(socket)
    registerUserHandlers(socket)

    socket.on("disconnect", () => {
      console.log(`[WS] Disconnected: ${socket.id}`);
    });
  });

  return io;
}
export function getIO(): Server {
  if (!io) throw new Error('WebSocket not initialized')
  return io
}

// Driver connection manager
const driverSockets = new Map<string, Socket>()

export const DriverSocketManager = {
  add: (driverId: string, socket: Socket) => driverSockets.set(driverId, socket),
  remove: (driverId: string) => driverSockets.delete(driverId),
  get: (driverId: string) => driverSockets.get(driverId),
  isConnected: (driverId: string) => driverSockets.has(driverId),
}
