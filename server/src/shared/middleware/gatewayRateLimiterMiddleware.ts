import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '@shared/errors';
import { env } from '@shared/config/env';
import { metricsService } from '@shared/metrics/metricsService';
import { redisClientService } from '@shared/utils/cache/RedisClient';
import { logger } from '@shared/utils/logger';

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  prefix?: string;
  message?: string;
}

const getDefaultOptions = () => ({
  windowMs: env?.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000, // 15 minutes window
  maxRequests: env?.RATE_LIMIT_MAX_REQUESTS ?? 1000, // max 1000 requests per window
});

/**
 * In-memory fallback sliding window store mapping keys to timestamp arrays.
 */
const inMemoryStore = new Map<string, number[]>();

/**
 * Resets the in-memory rate limit store and flushes test Redis keys.
 */
export async function resetRateLimitStore(): Promise<void> {
  inMemoryStore.clear();
  const client = redisClientService.getClient();
  if (client) {
    try {
      const keys = await client.keys('ratelimit:*');
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch {
      // Ignore cleanup error in test
    }
  }
}

/**
 * Checks and increments rate limit counter in Redis using atomic sorted sets.
 */
async function checkRedisSlidingWindow(
  client: any,
  key: string,
  windowMs: number,
  now: number
): Promise<{ count: number; resetTime: number }> {
  const clearBefore = now - windowMs;
  const member = `${now}:${Math.random().toString(36).substring(2, 9)}`;

  const pipeline = client.multi();
  pipeline.zremrangebyscore(key, 0, clearBefore);
  pipeline.zadd(key, now, member);
  pipeline.zcard(key);
  pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);

  const results = await pipeline.exec();
  if (!results) {
    throw new Error('Redis pipeline execution returned null');
  }

  const [cardErr, cardResult] = results[2];
  if (cardErr) throw cardErr;

  const count = typeof cardResult === 'number' ? cardResult : Number(cardResult);
  return {
    count,
    resetTime: now + windowMs,
  };
}

/**
 * Checks and increments rate limit counter in local memory with LRU cleanup.
 */
function checkMemorySlidingWindow(
  key: string,
  windowMs: number,
  now: number
): { count: number; resetTime: number } {
  let timestamps = inMemoryStore.get(key) || [];
  const cutoff = now - windowMs;
  timestamps = timestamps.filter((t) => t > cutoff);
  timestamps.push(now);
  inMemoryStore.set(key, timestamps);

  if (inMemoryStore.size > 10000) {
    const oldestKey = inMemoryStore.keys().next().value;
    if (oldestKey !== undefined) {
      inMemoryStore.delete(oldestKey);
    }
  }

  return {
    count: timestamps.length,
    resetTime: now + windowMs,
  };
}

/**
 * Creates a sliding-window rate limiter middleware backed by Redis with in-memory LRU fallback.
 *
 * @param options - Custom windowMs, maxRequests, keyGenerator, prefix, or error message
 * @returns Express middleware function
 * @throws {RateLimitError} When request count exceeds maxRequests within windowMs
 */
export function createGatewayRateLimiter(options: RateLimiterOptions = {}) {
  const defaults = getDefaultOptions();
  const windowMs = options.windowMs ?? defaults.windowMs;
  const maxRequests = options.maxRequests ?? defaults.maxRequests;
  const prefix = options.prefix ?? 'ratelimit:gw';

  return async function gatewayRateLimiterMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const now = Date.now();
    const identifier = options.keyGenerator
      ? options.keyGenerator(req)
      : (req.headers['x-tenant-id'] as string) || ((req as any).user?.tenantId as string) || req.ip || '127.0.0.1';

    const fullKey = `${prefix}:${identifier}`;

    let count: number;
    let resetTime: number;

    const redisClient = redisClientService.getClient();
    if (redisClient) {
      try {
        const result = await checkRedisSlidingWindow(redisClient, fullKey, windowMs, now);
        count = result.count;
        resetTime = result.resetTime;
      } catch (err: any) {
        logger.warn('Redis rate limiter failed — falling back to in-memory store', { error: err?.message });
        const fallbackResult = checkMemorySlidingWindow(fullKey, windowMs, now);
        count = fallbackResult.count;
        resetTime = fallbackResult.resetTime;
      }
    } else {
      const fallbackResult = checkMemorySlidingWindow(fullKey, windowMs, now);
      count = fallbackResult.count;
      resetTime = fallbackResult.resetTime;
    }

    const remaining = Math.max(0, maxRequests - count);
    const resetTimeSeconds = Math.ceil(resetTime / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTimeSeconds.toString());

    if (count > maxRequests) {
      const retryAfterSeconds = Math.ceil((resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      metricsService.recordRateLimitHit(identifier);
      return next(new RateLimitError(options.message || `Rate limit exceeded for: ${identifier}`));
    }

    next();
  };
}

export const gatewayRateLimiterMiddleware = createGatewayRateLimiter();
