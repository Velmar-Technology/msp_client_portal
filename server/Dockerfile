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
COPY packages/contracts/package.json ./packages/contracts/

# Install dependencies (npm workspaces) strictly using lockfile
RUN npm ci --legacy-peer-deps

# Copy packages and build shared errors and contracts modules
COPY packages/errors ./packages/errors
COPY packages/contracts ./packages/contracts
RUN npm -w packages/errors run build && npm -w packages/contracts run build

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
COPY packages/contracts/package.json ./packages/contracts/

# Install only production dependencies and explicitly force zod installation to resolve hoisting conflicts
# (cache cleanup must run in the SAME layer so /root/.npm/_cacache never lands in the image)
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund \
  && npm install zod@3.24.2 --legacy-peer-deps --no-audit --no-fund \
  && npm cache clean --force \
  && rm -rf /root/.npm

# Copy compiled code from build stage
COPY --from=builder /app/packages/errors/dist ./packages/errors/dist
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/server/dist ./server/dist

# Copy migrations and seed.sql from server
COPY --from=builder /app/server/src/shared/db/migrations ./server/dist/shared/db/migrations
COPY --from=builder /app/server/src/shared/db/migrations ./server/dist/migrations
COPY --from=builder /app/server/src/shared/db/seed.sql ./server/dist/shared/db/seed.sql
COPY --from=builder /app/server/src/shared/db/seed.sql ./server/dist/seed.sql

EXPOSE 3001

# Run migrations and start the server
CMD ["sh", "-c", "node server/dist/shared/db/migrate.js && npm -w server run start"]

