import { RedisClientService, redisClientService } from './RedisClient';
import { logger } from '@shared/utils/logger';

/**
 * Generation-based Cache Invalidation (SOTA Odoo/Registry Pattern).
 *
 * Keys are formatted with their current generation:
 *   e.g. "tenant:tenant-123:plans:v2:plan-tier-1"
 *
 * When an entity or collection changes, incrementing the generation counter
 * (via atomic `INCR gen:tenant:tenant-123:plans`) instantly invalidates all
 * cached keys across all Express instances without requiring expensive `KEYS`
 * pattern scans or manual key flushes. Old keys expire via TTL.
 */
export class GenerationTracker {
  // In-memory generation cache to avoid Redis roundtrips on every key lookup
  private localGenCache = new Map<string, { gen: number; expiresAt: number }>();
  private localGenFallback = new Map<string, number>();
  private readonly localTtlMs: number;

  constructor(
    private redisService: RedisClientService = redisClientService,
    localTtlMs = 2000 // 2 seconds local generation memoization
  ) {
    this.localTtlMs = localTtlMs;
  }

  private getGenKey(namespace: string, scope = 'global'): string {
    return `gen:${namespace}:${scope}`;
  }

  /**
   * Retrieves the current generation counter for a namespace and scope.
   */
  async getGeneration(namespace: string, scope = 'global'): Promise<number> {
    const genKey = this.getGenKey(namespace, scope);
    const now = Date.now();

    // 1. Check local memoized generation
    const local = this.localGenCache.get(genKey);
    if (local && local.expiresAt > now) {
      return local.gen;
    }

    // 2. Query Redis if available
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        const val = await redis.get(genKey);
        const gen = val ? parseInt(val, 10) : 1;
        this.localGenCache.set(genKey, { gen, expiresAt: now + this.localTtlMs });
        return gen;
      } catch (err: any) {
        logger.warn('Failed to fetch generation counter from Redis, falling back to local', {
          error: err.message,
          namespace,
          scope,
        });
      }
    }

    // 3. Fallback to in-memory generation tracking
    const fallbackGen = this.localGenFallback.get(genKey) || 1;
    this.localGenCache.set(genKey, { gen: fallbackGen, expiresAt: now + this.localTtlMs });
    return fallbackGen;
  }

  /**
   * Atomically increments the generation counter for the namespace/scope.
   * This immediately invalidates all cached keys under this scope across all nodes.
   */
  async invalidate(namespace: string, scope = 'global'): Promise<number> {
    const genKey = this.getGenKey(namespace, scope);

    // Invalidate local memoization immediately
    this.localGenCache.delete(genKey);

    const redis = this.redisService.getClient();
    if (redis) {
      try {
        const newGen = await redis.incr(genKey);
        this.localGenCache.set(genKey, { gen: newGen, expiresAt: Date.now() + this.localTtlMs });
        return newGen;
      } catch (err: any) {
        logger.warn('Failed to increment Redis generation counter, using local increment', {
          error: err.message,
          namespace,
          scope,
        });
      }
    }

    // In-memory fallback increment
    const current = this.localGenFallback.get(genKey) || 1;
    const next = current + 1;
    this.localGenFallback.set(genKey, next);
    this.localGenCache.set(genKey, { gen: next, expiresAt: Date.now() + this.localTtlMs });
    return next;
  }

  /**
   * Formats a versioned cache key incorporating the active generation.
   *
   * Example output: "plans:global:v3:business_pro"
   */
  async formatVersionedKey(namespace: string, scope: string, identifier: string): Promise<string> {
    const gen = await this.getGeneration(namespace, scope);
    return `${namespace}:${scope}:v${gen}:${identifier}`;
  }

  /**
   * Clears in-memory generation trackers (primarily for unit testing).
   */
  resetLocalState(): void {
    this.localGenCache.clear();
    this.localGenFallback.clear();
  }
}

export const generationTracker = new GenerationTracker();
