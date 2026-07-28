import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { testConnection } from './config/database';
import { migrate } from './db/migrate';
import { logger } from './utils/logger';

import { createExpressErrorMiddleware } from '@shared/errors';
import routes from './routes';
import { swaggerSpec } from './swagger/swagger.config';

const app = express();

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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Velmar Technology SRL MSP API Documentation',
}));

// ---- API Routes ----
app.use('/api/v1', routes);

// ---- Global Error Handler (must be last) ----
app.use(createExpressErrorMiddleware({ logger, isProduction: env.NODE_ENV === 'production' }));

// ---- Start Server ----
async function startServer(): Promise<void> {
  try {
    // Test database connection
    await testConnection();

    // Auto-run pending database migrations
    await migrate();


    app.listen(env.PORT, () => {
      logger.info(`🚀 Velmar Technology SRL MSP API Server running on port ${env.PORT}`);
      logger.info(`📚 API Docs available at http://localhost:${env.PORT}/api-docs`);
      logger.info(`🌐 Environment: ${env.NODE_ENV}`);
      
      // Start background subscriptions renewal scheduler
      const { subscriptionScheduler } = require('./services/SubscriptionScheduler');
      subscriptionScheduler.start();
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();

export default app;
