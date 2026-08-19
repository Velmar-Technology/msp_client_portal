import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
}

const defaultOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes window
  maxRequests: 100, // max 100 requests per window
};

/**
 * In-memory rate limiting store mapping tenantId/IP keys to tracking records.
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Helper to clear rate limit store state (useful for unit testing).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Ingress Gateway Multi-Tenant Rate Limiting Middleware.
 * Protects downstream microservices/clusters from noisy neighbors by tracking request rate
 * grouped by `X-Tenant-Id` (for authenticated calls) or client IP (for unauthenticated calls).
 */
export function createGatewayRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? defaultOptions.windowMs;
  const maxRequests = options.maxRequests ?? defaultOptions.maxRequests;

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
      return next(AppError.tooManyRequests(`Rate limit exceeded for tenant: ${tenantId || req.ip}`));
    }

    next();
  };
}

export const gatewayRateLimiterMiddleware = createGatewayRateLimiter();
