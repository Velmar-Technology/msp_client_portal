import { Router } from 'express';
import { NotFoundError } from '@shared/errors';
import { gatewayAuthMiddleware } from '@shared/middleware/gatewayAuthMiddleware';
import { gatewayRateLimiterMiddleware } from '@shared/middleware/gatewayRateLimiterMiddleware';
import { gatewayHeaderPropagatorMiddleware, gatewayClusterRouter } from '@shared/middleware/gatewayRouterMiddleware';

const router = Router();

// ---- Ingress API Gateway Layer ----
// 1. Ingress Auth & Header Injection (X-User-Id, X-Tenant-Id)
router.use(gatewayAuthMiddleware);

// 2. Multi-Tenant Rate Limiting (per X-Tenant-Id or IP)
router.use(gatewayRateLimiterMiddleware);

// 3. Gateway Standard Header Propagator
router.use(gatewayHeaderPropagatorMiddleware);

// 4. Cluster & Route Dispatcher
router.use(gatewayClusterRouter);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Velmar Technology SRL MSP API is running',
    timestamp: new Date().toISOString(),
  });
});

// Catch-all 404 for unknown API routes
router.use((_req, _res, next) => {
  next(new NotFoundError('The requested API endpoint was not found'));
});

export default router;
