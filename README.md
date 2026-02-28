# TruDrive Monorepo

Ride-sharing platform — Modular Monolith with event-driven architecture.

## Architecture

- **Backend**: Express.js + Socket.io + MongoDB Atlas + BullMQ + Redis
- **Driver App**: React Native
- **Rider App**: React Native
- **Admin Panel**: React Web (Chakra UI)
- **Shared**: TypeScript types, socket events, config constants

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express.js + Socket.io |
| Database | MongoDB Atlas |
| Cache / Pub-Sub | Redis |
| Job Queue | BullMQ |
| File Storage | AWS S3 (pre-signed URLs) |
| Real-time | Socket.io with Redis Adapter |
| Mobile | React Native |
| Web Admin | React + Chakra UI |
| Notifications | OneSignal |
| Payment | Mercado Pago |

## Monorepo Structure

```
apps/
  backend/        — API Gateway + Modules + Workers
  rider/          — Rider React Native app
  driver/         — Driver React Native app
  admin/          — Admin web panel
packages/
  shared-types/   — DTOs and TypeScript types
  shared-events/  — Socket.io event names and domain events
  shared-config/  — App-wide constants
infra/
  docker-compose.yml
```

## Backend Module Architecture

```
backend/src/
  modules/
    user/           — Auth (OTP), profiles, JWT
    ride/           — Ride creation, matching, status
    payment/        — Fare calculation, payment processing
    notification/   — Push notifications (OneSignal)
    upload/         — AWS S3 pre-signed URL generation
  infrastructure/
    database/       — MongoDB connection (Mongoose)
    redis/          — Redis client + key patterns
    queue/          — BullMQ queue definitions
    websocket/      — Socket.io server + driver manager
  workers/
    notifyDrivers.worker.ts
    payment.worker.ts
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm --filter shared-types build
pnpm --filter shared-events build
pnpm --filter shared-config build

# Run backend in dev mode
pnpm dev:backend

# Run workers
pnpm --filter backend worker:notify
pnpm --filter backend worker:payment
```

## Environment Variables

Copy `apps/backend/.env.example` to `apps/backend/.env` and fill in your values.

## Docker

```bash
cd infra
docker-compose up -d
```
