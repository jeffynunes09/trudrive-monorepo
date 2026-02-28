# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY pnpm-workspace.yaml package.json ./

# Copy packages
COPY packages/ packages/

# Copy backend
COPY apps/backend/ apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages
RUN pnpm --filter shared-types build
RUN pnpm --filter shared-events build
RUN pnpm --filter shared-config build

# Build backend
RUN pnpm --filter backend build

# Production stage
FROM node:20-alpine AS final

RUN addgroup -S trudrive && adduser -S trudrive -G trudrive

WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/pnpm-workspace.yaml .
COPY --from=builder /app/package.json .
COPY --from=builder /app/packages packages/
COPY --from=builder /app/apps/backend/dist apps/backend/dist/
COPY --from=builder /app/apps/backend/package.json apps/backend/package.json

RUN pnpm install --prod --frozen-lockfile

USER trudrive

EXPOSE 3000

CMD ["node", "apps/backend/dist/app.js"]
