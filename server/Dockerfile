FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for compilation of native Node modules (e.g. bcrypt) under Debian slim
RUN apt-get update && apt-get install -y make gcc g++ python3 && rm -rf /var/lib/apt/lists/*

# Upgrade npm to match local environment version
RUN npm install -g npm@11.16.0

# Copy root workspace configurations (restores package-lock.json in builder stage)
COPY package*.json tsconfig.base.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY packages/errors/package.json ./packages/errors/

# Install dependencies (npm workspaces) strictly using lockfile
RUN npm ci --legacy-peer-deps

# Copy packages and build shared errors module
COPY packages/errors ./packages/errors
RUN npm run build:packages

# Copy and build server code
COPY server ./server
RUN npm -w server run build

# Production runtime image
FROM node:22-slim

WORKDIR /app

# Install runtime build dependencies if any native module needs compilation in production stage
RUN apt-get update && apt-get install -y make gcc g++ python3 && rm -rf /var/lib/apt/lists/*

# Upgrade npm to match local environment version
RUN npm install -g npm@11.16.0

# Copy package requirements for production dependency installation (uses package-lock.json for strict prod audit)
COPY package*.json tsconfig.base.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY packages/errors/package.json ./packages/errors/

# Install only production dependencies and explicitly force zod installation to resolve hoisting conflicts
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund && npm install zod@3.24.2 --legacy-peer-deps --no-audit --no-fund

# Copy compiled code from build stage
COPY --from=builder /app/packages/errors/dist ./packages/errors/dist
COPY --from=builder /app/server/dist ./server/dist

# Copy migrations and seed.sql from server
COPY --from=builder /app/server/src/db/migrations ./server/dist/db/migrations
COPY --from=builder /app/server/src/db/seed.sql ./server/dist/db/seed.sql

EXPOSE 3001

# Run migrations and start the server
CMD ["sh", "-c", "node server/dist/db/migrate.js && npm -w server run start"]
