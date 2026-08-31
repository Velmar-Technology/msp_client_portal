FROM node:22-slim AS builder

WORKDIR /app

# Upgrade npm to match local environment version
RUN npm install -g npm@11.16.0

# Copy root lock and package configurations for dependency installation (restores package-lock.json)
COPY package*.json tsconfig.base.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY packages/errors/package.json ./packages/errors/

# Install strict dependencies using lockfile (resolves Typescript types correctly)
RUN npm ci --legacy-peer-deps

# Explicitly install the missing Linux optional binary modules for Tailwind v4 and Vite compiling
RUN npm install --legacy-peer-deps --no-audit --no-fund lightningcss-linux-x64-gnu @tailwindcss/oxide-linux-x64-gnu

# Copy packages and build shared errors module
COPY packages/errors ./packages/errors
RUN npm -w packages/errors run build

# Copy client and build production bundle (invalidates cache for VITE_GOOGLE_CLIENT_ID)
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_APP_VERSION
ARG VITE_PAYPAL_CLIENT_ID
ARG VITE_FARO_URL
ARG VITE_FARO_APP_NAME
ARG VITE_FARO_APP_ENV
ARG VITE_DD_APPLICATION_ID
ARG VITE_DD_CLIENT_TOKEN
ARG VITE_DD_SITE
ARG VITE_DD_SERVICE
ARG VITE_DD_ENV
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_PAYPAL_CLIENT_ID=$VITE_PAYPAL_CLIENT_ID
ENV VITE_FARO_URL=$VITE_FARO_URL
ENV VITE_FARO_APP_NAME=$VITE_FARO_APP_NAME
ENV VITE_FARO_APP_ENV=$VITE_FARO_APP_ENV
ENV VITE_DD_APPLICATION_ID=$VITE_DD_APPLICATION_ID
ENV VITE_DD_CLIENT_TOKEN=$VITE_DD_CLIENT_TOKEN
ENV VITE_DD_SITE=$VITE_DD_SITE
ENV VITE_DD_SERVICE=$VITE_DD_SERVICE
ENV VITE_DD_ENV=$VITE_DD_ENV

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
