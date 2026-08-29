import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '@shared/errors';
import { env } from '@shared/config/env';
import { metricsService } from '@shared/metrics/metricsService';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
}

const getDefaultOptions = () => ({
  windowMs: env?.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000, // 15 minutes window
  maxRequests: env?.RATE_LIMIT_MAX_REQUESTS ?? 1000, // max 1000 requests per window
});

/**
 * In-memory rate limiting store mapping tenantId/IP keys to tracking records.
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Resets the in-memory rate limit store (primarily for unit testing).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Ingress Gateway Multi-Tenant Rate Limiting Middleware Factory.
 * Protects downstream services by tracking request rates grouped by `X-Tenant-Id` or client IP.
 *
 * @param options - RateLimiterOptions with custom windowMs and maxRequests
 * @returns Express rate limiting middleware function
 * @throws {RateLimitError} When request count exceeds maxRequests within windowMs
 */
export function createGatewayRateLimiter(options: RateLimiterOptions = {}) {
  const defaults = getDefaultOptions();
  const windowMs = options.windowMs ?? defaults.windowMs;
  const maxRequests = options.maxRequests ?? defaults.maxRequests;

  return function gatewayRateLimiterMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const now = Date.now();
    const tenantId = (req.headers['x-tenant-id'] as string) || (req.user?.tenantId as string);
    const key = tenantId ? `tenant:${tenantId}` : `ip:${req.ip || '127.0.0.1'}`;

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetTimeSeconds = Math.ceil(record.resetTime / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTimeSeconds.toString());

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      metricsService.recordRateLimitHit(tenantId || req.ip || 'anonymous');
      return next(new RateLimitError(`Rate limit exceeded for tenant: ${tenantId || req.ip}`));
    }

    next();
  };
}

export const gatewayRateLimiterMiddleware = createGatewayRateLimiter();
