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

  /**
   * Initializes DistributedLock with RedisClientService dependency.
   *
   * @param redisService - Redis client management service
   */
  constructor(private redisService: RedisClientService = redisClientService) {}

  /**
   * Attempts to acquire an atomic distributed lock on `resourceKey`.
   *
   * @param resourceKey - Unique identifier of resource to lock
   * @param ttlMs - Lock expiration lifetime in milliseconds (default: 5000)
   * @returns Lock token UUID string if acquired, or null if locked by another caller
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
   * Releases a previously acquired lock using its token via atomic Lua script execution.
   *
   * @param resourceKey - Unique identifier of resource
   * @param token - Token UUID received from acquireLock
   * @returns True if lock was released, false if expired or owned by another process
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
   * Executes an asynchronous task inside an exclusive distributed lock boundary with exponential backoff retries.
   *
   * @typeParam T - Callback return type
   * @param resourceKey - Unique identifier of resource to lock
   * @param ttlMs - Lock TTL duration in milliseconds
   * @param callback - Critical section async function
   * @param maxWaitMs - Maximum wait time before aborting in milliseconds (default: 3000)
   * @returns Callback result
   * @throws {LockAcquisitionError} When the lock cannot be acquired within maxWaitMs
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
