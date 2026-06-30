FROM node:alpine AS builder

WORKDIR /app

# Upgrade npm to match local environment version
RUN npm install -g npm@11.16.0

# Copy root lock and package configurations for dependency installation
COPY package*.json tsconfig.base.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY packages/errors/package.json ./packages/errors/

# Install dependencies (npm workspaces)
RUN npm ci

# Copy packages and build shared errors module
COPY packages/errors ./packages/errors
RUN npm run build:packages

# Copy client and build production bundle
COPY client ./client
RUN npm -w client run build

# Production image with Nginx
FROM nginx:stable-alpine

# Copy custom Nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to Nginx html directory
COPY --from=builder /app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
