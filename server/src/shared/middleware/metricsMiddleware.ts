import { Request, Response, NextFunction } from 'express';
import { metricsService } from '@shared/metrics/metricsService';

/**
 * Express middleware to record HTTP request metrics (latency, counts, status codes).
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip metrics collection for metrics endpoint itself and static assets
  if (req.path.startsWith('/metrics') || req.path.startsWith('/api/v1/metrics') || req.path.startsWith('/uploads')) {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;

    // Normalize route path to avoid high-cardinality labels from URL parameters
    const route = req.route?.path
      ? `${req.baseUrl || ''}${req.route.path}`
      : `${req.baseUrl || ''}${req.path}`;

    metricsService.recordHttpRequest(req.method, route, res.statusCode, durationInSeconds);
  });

  next();
}
