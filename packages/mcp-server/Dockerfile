# syntax=docker/dockerfile:1.4
FROM node:22-slim AS builder

WORKDIR /app

# Upgrade npm to match workspace version
RUN npm install -g npm@11.16.0

# Copy root workspace configurations
COPY package*.json tsconfig.base.json ./
COPY packages/errors/package.json ./packages/errors/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install workspace dependencies strictly using lockfile
RUN npm ci --legacy-peer-deps

# Copy and build shared packages
COPY packages/errors ./packages/errors
COPY packages/contracts ./packages/contracts
RUN npm -w packages/errors run build && npm -w packages/contracts run build

# Copy and build MCP server
COPY packages/mcp-server ./packages/mcp-server
RUN npm -w packages/mcp-server run build

# Production runtime image
FROM node:22-alpine

WORKDIR /app

# Copy production package metadata
COPY packages/mcp-server/package.json ./

# Install production dependencies only
RUN npm install --omit=dev --no-audit --no-fund

# Copy compiled JavaScript dist from builder
COPY --from=builder /app/packages/mcp-server/dist ./dist

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_HTTP_PORT=3005

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3005/health || exit 1

CMD ["node", "dist/index.js", "--http"]
