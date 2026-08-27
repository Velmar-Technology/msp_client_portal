import { RedisClientService, redisClientService } from './RedisClient';
import { MemoryFallbackCache, memoryFallbackCache } from './MemoryFallbackCache';
import { GenerationTracker, generationTracker } from './GenerationTracker';
import { logger } from '@shared/utils/logger';
import type { CachePort } from '@shared/types';

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  fallbacks: number;
  errors: number;
}

/**
 * Unified Cache Manager with Tiered Multi-Level Storage and Circuit-Breaker Routing.
 *
 * Tier 1: Redis Distributed Cache (Shared across all worker instances).
 * Tier 2: In-Memory LRU Cache (Activated when Redis is offline or degraded).
 *
 * All Redis operations are wrapped in strict timeout boundaries to ensure zero latency
 * spikes even under network partition.
 */
export class CacheManager implements CachePort {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    fallbacks: 0,
    errors: 0,
  };

  private readonly opTimeoutMs: number;

  constructor(
    private redisService: RedisClientService = redisClientService,
    private memoryCache: MemoryFallbackCache = memoryFallbackCache,
    private genTracker: GenerationTracker = generationTracker,
    opTimeoutMs = 150 // Max 150ms for Redis command before falling back
  ) {
    this.opTimeoutMs = opTimeoutMs;
  }

  private async withTimeout<T>(promise: Promise<T>, fallbackFn: () => T | Promise<T>): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutHandle = setTimeout(async () => {
        this.metrics.fallbacks++;
        resolve(await fallbackFn());
      }, this.opTimeoutMs);
    });

    try {
      const result = await Promise.race([
        promise.then((res) => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          return res;
        }),
        timeoutPromise,
      ]);
      return result;
    } catch (err: any) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      this.metrics.errors++;
      this.metrics.fallbacks++;
      logger.debug('Redis operation failed in CacheManager, falling back to memory', {
        error: err?.message || String(err),
      });
      return fallbackFn();
    }
  }

  /**
   * Retrieves an item from the cache.
   */
  async get<T>(key: string): Promise<T | null> {
    const redis = this.redisService.getClient();

    if (!redis) {
      const memoryValue = this.memoryCache.get<T>(key);
      if (memoryValue !== null) {
        this.metrics.hits++;
        return memoryValue;
      }
      this.metrics.misses++;
      return null;
    }

    return this.withTimeout(
      (async () => {
        this.redisService.incrementOps();
        const raw = await redis.get(key);
        if (!raw) {
          this.metrics.misses++;
          return null;
        }
        try {
          const parsed = JSON.parse(raw) as T;
          this.metrics.hits++;
          return parsed;
        } catch {
          this.metrics.hits++;
          return raw as unknown as T;
        }
      })(),
      () => {
        const mem = this.memoryCache.get<T>(key);
        if (mem !== null) {
          this.metrics.hits++;
          return mem;
        }
        this.metrics.misses++;
        return null;
      }
    );
  }

  /**
   * Stores an item in the cache with an optional TTL (in seconds).
   */
  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    this.metrics.sets++;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    this.memoryCache.set(key, value, ttlSeconds);

    const redis = this.redisService.getClient();
    if (!redis) return;

    await this.withTimeout(
      (async () => {
        this.redisService.incrementOps();
        if (ttlSeconds > 0) {
          await redis.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await redis.set(key, serialized);
        }
      })(),
      () => {}
    );
  }

  /**
   * Deletes an item from the cache.
   */
  async del(key: string): Promise<void> {
    this.memoryCache.del(key);

    const redis = this.redisService.getClient();
    if (!redis) return;

    await this.withTimeout(
      (async () => {
        this.redisService.incrementOps();
        await redis.del(key);
      })(),
      () => {}
    );
  }

  /**
   * Cache-Aside Wrapper: Fetches from cache, or evaluates fetcher and caches the result.
   */
  async wrap<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fetcher();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }

    return fresh;
  }

  /**
   * Versioned Cache-Aside Wrapper: Builds generation-aware key and caches value.
   * On invalidation, generation increment makes this key instantly stale across all workers.
   */
  async wrapVersioned<T>(
    namespace: string,
    scope: string,
    identifier: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const versionedKey = await this.genTracker.formatVersionedKey(namespace, scope, identifier);
    return this.wrap<T>(versionedKey, ttlSeconds, fetcher);
  }

  /**
   * Invalidates all cached items under a specific namespace and scope atomically.
   */
  async invalidateScope(namespace: string, scope = 'global'): Promise<number> {
    return this.genTracker.invalidate(namespace, scope);
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = { hits: 0, misses: 0, sets: 0, fallbacks: 0, errors: 0 };
  }
}

export const cacheManager = new CacheManager();
