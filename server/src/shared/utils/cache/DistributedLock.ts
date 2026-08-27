import { RedisClientService, redisClientService } from './RedisClient';
import { randomUUID } from 'crypto';
import { logger } from '@shared/utils/logger';
import { LockAcquisitionError } from '@shared/errors';

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Distributed Lock Manager (Mutex / Concurrency Guard).
 *
 * Uses Redis `SET ... NX PX` with UUID verification and atomic Lua release.
 * If Redis is unavailable, it gracefully falls back to an in-memory queue mutex
 * so single-node concurrency is still fully protected.
 */
export class DistributedLock {
  private localMutexes = new Map<string, Promise<void>>();

  constructor(private redisService: RedisClientService = redisClientService) {}

  /**
   * Attempts to acquire a distributed lock on `resourceKey`.
   * Returns a lock token if acquired, or null if already locked.
   */
  async acquireLock(resourceKey: string, ttlMs = 5000): Promise<string | null> {
    const lockKey = `lock:${resourceKey}`;
    const token = randomUUID();

    const redis = this.redisService.getClient();
    if (redis) {
      try {
        const result = await redis.set(lockKey, token, 'PX', ttlMs, 'NX');
        if (result === 'OK') {
          return token;
        }
        return null;
      } catch (err: any) {
        logger.warn('Failed to acquire Redis lock, falling back to in-memory mutex', {
          error: err.message,
          resourceKey,
        });
      }
    }

    // In-memory fallback mutex
    if (this.localMutexes.has(lockKey)) {
      return null;
    }
    this.localMutexes.set(lockKey, Promise.resolve());
    return token;
  }

  /**
   * Releases a previously acquired lock using its token.
   */
  async releaseLock(resourceKey: string, token: string): Promise<boolean> {
    const lockKey = `lock:${resourceKey}`;

    const redis = this.redisService.getClient();
    if (redis) {
      try {
        const result = await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, token);
        return result === 1;
      } catch (err: any) {
        logger.warn('Failed to release Redis lock via Lua script', {
          error: err.message,
          resourceKey,
        });
      }
    }

    // In-memory fallback cleanup
    return this.localMutexes.delete(lockKey);
  }

  /**
   * Executes a callback within a guarded lock block.
   * Retries acquisition with backoff until acquired or timeout exceeded.
   */
  async withLock<T>(
    resourceKey: string,
    ttlMs: number,
    callback: () => Promise<T>,
    maxWaitMs = 3000
  ): Promise<T> {
    const startTime = Date.now();
    let token: string | null = null;
    let attempt = 0;

    while (!token) {
      token = await this.acquireLock(resourceKey, ttlMs);
      if (token) break;

      if (Date.now() - startTime >= maxWaitMs) {
        throw new LockAcquisitionError(
          `Failed to acquire distributed lock for '${resourceKey}' after ${maxWaitMs}ms`,
          { resourceKey, maxWaitMs }
        );
      }

      attempt++;
      const jitter = Math.floor(Math.random() * 20);
      const backoff = Math.min(20 * Math.pow(1.5, attempt), 200) + jitter;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }

    try {
      return await callback();
    } finally {
      await this.releaseLock(resourceKey, token);
    }
  }
}

export const distributedLock = new DistributedLock();
