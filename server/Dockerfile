FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for compilation of native Node modules (e.g. bcrypt)
RUN apk add --no-cache make gcc g++ python3

# Copy root workspace configurations
COPY package*.json tsconfig.base.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY packages/errors/package*.json ./packages/errors/

# Install dependencies (npm workspaces)
RUN npm ci

# Copy packages and build shared errors module
COPY packages/errors ./packages/errors
RUN npm run build:packages

# Copy and build server code
COPY server ./server
RUN npm -w server run build

# Production runtime image
FROM node:20-alpine

WORKDIR /app

# Install runtime build dependencies if any native module needs compilation in production stage
RUN apk add --no-cache make gcc g++ python3

# Copy package requirements for production dependency installation
COPY package*.json tsconfig.base.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY packages/errors/package*.json ./packages/errors/

# Install only production dependencies
RUN npm ci --omit=dev --workspace=server --workspace=packages/errors

# Copy compiled code from build stage
COPY --from=builder /app/packages/errors/dist ./packages/errors/dist
COPY --from=builder /app/server/dist ./server/dist

# Copy migrations and seed.sql from server
COPY --from=builder /app/server/src/db/migrations ./server/dist/db/migrations
COPY --from=builder /app/server/src/db/seed.sql ./server/dist/db/seed.sql

EXPOSE 3001

# Run migrations and start the server
CMD ["sh", "-c", "node server/dist/db/migrate.js && npm -w server run start"]

