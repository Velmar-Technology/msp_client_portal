import './tracer';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { WebSocketServer } from 'ws';
import swaggerUi from 'swagger-ui-express';
import { env } from '@shared/config/env';
import { testConnection, startPinger } from '@shared/config/database';
import { migrate } from '@shared/db/migrate';
import { logger } from '@shared/utils/logger';

import { createExpressErrorMiddleware } from '@shared/errors';
import routes from './routes';
import { swaggerSpec } from '@shared/swagger/swagger.config';
import { agentGateway } from '@modules/rmm/services/AgentGateway';
import { equipmentService } from '@modules/equipment/services/EquipmentService';
import { metricsMiddleware } from '@shared/middleware/metricsMiddleware';
import { metricsService } from '@shared/metrics/metricsService';

const app = express();

// Trust reverse proxy (Traefik / Nginx) headers for TLS/HTTPS detection (X-Forwarded-Proto, etc.)
app.set('trust proxy', 1);

// ---- Observability & Metrics Middleware ----
app.use(metricsMiddleware);

// Root Metrics Endpoint for Prometheus Scraper
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', metricsService.getContentType());
  res.end(await metricsService.getMetrics());
});

// ---- Security Middleware ----
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// ---- Body Parsing ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Request Logging ----
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// ---- Static Files (Uploads) ----
const uploadsDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ---- API Documentation ----
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Velmar Technology SRL MSP API Documentation',
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
app.use('/api/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// ---- API Routes ----
app.use('/api/v1', routes);

// ---- Global Error Handler (must be last) ----
app.use(createExpressErrorMiddleware({ logger, isProduction: env.NODE_ENV === 'production' }));

// ---- Create Server (shared for Express + WebSocket, HTTP or HTTPS/WSS) ----
let server: http.Server | https.Server;
let isHttps = false;

if (
  (env.ENABLE_HTTPS || (env.SSL_KEY_PATH && env.SSL_CERT_PATH)) &&
  env.SSL_KEY_PATH &&
  env.SSL_CERT_PATH &&
  fs.existsSync(env.SSL_KEY_PATH) &&
  fs.existsSync(env.SSL_CERT_PATH)
) {
  const sslOptions: https.ServerOptions = {
    key: fs.readFileSync(env.SSL_KEY_PATH),
    cert: fs.readFileSync(env.SSL_CERT_PATH),
    ca: env.SSL_CA_PATH && fs.existsSync(env.SSL_CA_PATH) ? fs.readFileSync(env.SSL_CA_PATH) : undefined,
  };
  server = https.createServer(sslOptions, app);
  isHttps = true;
} else if (env.SSL_KEY && env.SSL_CERT) {
  const sslOptions: https.ServerOptions = {
    key: env.SSL_KEY,
    cert: env.SSL_CERT,
    ca: env.SSL_CA,
  };
  server = https.createServer(sslOptions, app);
  isHttps = true;
} else {
  server = http.createServer(app);
}

// ---- WebSocket Server for Remote Agent Gateway (supports WS and WSS) ----
const wss = new WebSocketServer({
  server,
  path: '/agent-ws',
});
agentGateway.init(wss);

// Reconcile agent-discovered identity onto equipment records whenever an agent
// completes its registration handshake. Errors are contained by the handler.
agentGateway.onAgentHello((equipmentId, hello, token) =>
  equipmentService.reconcileAgentIdentity(equipmentId, hello, token)
);

// ---- Start Server ----
async function startServer(): Promise<void> {
  try {
    // Test database connection with retry backoff
    await testConnection();

    // Auto-run pending database migrations
    await migrate();

    // Start background database health pinger once DB connection & migrations are complete
    startPinger();

    server.listen(env.PORT, () => {
      const httpProto = isHttps ? 'https' : 'http';
      const wsProto = isHttps ? 'wss' : 'ws';
      logger.info(`Velmar Technology SRL MSP API Server running on port ${env.PORT} (${httpProto.toUpperCase()})`);
      logger.info(`API Docs available at ${httpProto}://localhost:${env.PORT}/api-docs and ${httpProto}://localhost:${env.PORT}/api/v1/api-docs`);
      logger.info(`Agent WebSocket Gateway available at ${wsProto}://localhost:${env.PORT}/agent-ws (supports WSS over TLS / Reverse Proxy)`);
      if (env.EXTERNAL_GATEWAY_URL) {
        logger.info(`External WSS Gateway URL: ${env.EXTERNAL_GATEWAY_URL}`);
      }
      logger.info(`Environment: ${env.NODE_ENV}`);
      
      // Start background subscriptions renewal scheduler
      const { subscriptionScheduler } = require('@modules/subscriptions/services/SubscriptionScheduler');
      subscriptionScheduler.start();

      // Start background SLA escalation scheduler
      const { escalationScheduler } = require('@modules/tickets/services/EscalationScheduler');
      escalationScheduler.start();
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();

export default app;
// Server restarted to register CRM domain router endpoints

