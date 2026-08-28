import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from './CacheManager';
import { RedisClientService } from './RedisClient';
import { MemoryFallbackCache } from './MemoryFallbackCache';
import { GenerationTracker } from './GenerationTracker';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockRedisService: RedisClientService;
  let memoryCache: MemoryFallbackCache;
  let genTracker: GenerationTracker;

  beforeEach(() => {
    mockRedisService = {
      getClient: vi.fn().mockReturnValue(null), // Redis offline
      isReady: vi.fn().mockReturnValue(false),
      getHealth: vi.fn(),
      incrementOps: vi.fn(),
      quit: vi.fn(),
    } as unknown as RedisClientService;

    memoryCache = new MemoryFallbackCache();
    genTracker = new GenerationTracker(mockRedisService);
    genTracker.resetLocalState();

    cacheManager = new CacheManager(mockRedisService, memoryCache, genTracker);
  });

  it('stores and retrieves values via fallback cache when Redis is offline', async () => {
    await cacheManager.set('test:key', { data: 'hello' }, 60);
    const result = await cacheManager.get<{ data: string }>('test:key');

    expect(result).toEqual({ data: 'hello' });
    expect(cacheManager.getMetrics().hits).toBe(1);
  });

  it('wrap evaluates fetcher on miss and caches result for subsequent hits', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 'plan-1', name: 'Standard' });

    // First call (cache miss)
    const res1 = await cacheManager.wrap('plans:plan-1', 60, fetcher);
    expect(res1).toEqual({ id: 'plan-1', name: 'Standard' });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Second call (cache hit)
    const res2 = await cacheManager.wrap('plans:plan-1', 60, fetcher);
    expect(res2).toEqual({ id: 'plan-1', name: 'Standard' });
    expect(fetcher).toHaveBeenCalledTimes(1); // Not called again
  });

  it('wrapVersioned automatically invalidates when generation changes', async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { count: fetchCount };
    };

    // Initial read
    const v1 = await cacheManager.wrapVersioned('plans', 'global', 'active', 60, fetcher);
    expect(v1).toEqual({ count: 1 });

    // Subsequent read (hits cache)
    const v1Cached = await cacheManager.wrapVersioned('plans', 'global', 'active', 60, fetcher);
    expect(v1Cached).toEqual({ count: 1 });

    // Invalidate generation
    await cacheManager.invalidateScope('plans', 'global');

    // Next read must evaluate fetcher again because generation incremented to v2
    const v2 = await cacheManager.wrapVersioned('plans', 'global', 'active', 60, fetcher);
    expect(v2).toEqual({ count: 2 });
  });

  it('deletes cached items on del', async () => {
    await cacheManager.set('temp', '123', 60);
    expect(await cacheManager.get('temp')).toBe('123');

    await cacheManager.del('temp');
    expect(await cacheManager.get('temp')).toBeNull();
  });

  it('restores Date values degraded to ISO strings by the Redis JSON round-trip', async () => {
    const storedJson: Record<string, string> = {};
    const fakeRedis = {
      get: vi.fn(async (key: string) => storedJson[key] ?? null),
      set: vi.fn(async (key: string, value: string) => {
        storedJson[key] = value;
      }),
      del: vi.fn(async (key: string) => {
        delete storedJson[key];
      }),
    };

    mockRedisService.getClient = vi.fn().mockReturnValue(fakeRedis);
    const redisCache = new CacheManager(mockRedisService, memoryCache, genTracker, 50);

    const lastLoginAt = new Date('2025-06-15T10:30:00.000Z');
    await redisCache.set('user:email:test', { id: 'user-1', lastLoginAt }, 60);

    // The serialized payload must carry the degraded ISO string (simulating the real Redis write)
    const rawStored = storedJson['user:email:test'];
    expect(rawStored).toBe(JSON.stringify({ id: 'user-1', lastLoginAt: '2025-06-15T10:30:00.000Z' }));

    const result = await redisCache.get<{ id: string; lastLoginAt: Date }>('user:email:test');
    expect(result?.id).toBe('user-1');
    expect(result?.lastLoginAt).toBeInstanceOf(Date);
    expect(result?.lastLoginAt.toISOString()).toBe('2025-06-15T10:30:00.000Z');
  });

  it('leaves non-date strings untouched during cache reads', async () => {
    const storedJson: Record<string, string> = {};
    const fakeRedis = {
      get: vi.fn(async (key: string) => storedJson[key] ?? null),
      set: vi.fn(async (key: string, value: string) => {
        storedJson[key] = value;
      }),
      del: vi.fn(async (key: string) => {
        delete storedJson[key];
      }),
    };

    mockRedisService.getClient = vi.fn().mockReturnValue(fakeRedis);
    const redisCache = new CacheManager(mockRedisService, memoryCache, genTracker, 50);

    const payload = { name: 'hello', id: 'plan-1', ref: '2026-01-01' };
    await redisCache.set('plans:plan-1', payload, 60);

    const result = await redisCache.get<typeof payload>('plans:plan-1');
    expect(result).toEqual(payload);
    expect(result?.name).toBe('hello');
    expect(result?.ref).toBe('2026-01-01');
  });

  it('transparently falls back to in-memory store when Redis throws or times out', async () => {
    const errorRedis = {
      get: vi.fn().mockRejectedValue(new Error('Redis connection timeout')),
      set: vi.fn().mockRejectedValue(new Error('Redis connection timeout')),
      del: vi.fn().mockRejectedValue(new Error('Redis connection timeout')),
    };

    mockRedisService.getClient = vi.fn().mockReturnValue(errorRedis);

    const resilientCache = new CacheManager(mockRedisService, memoryCache, genTracker, 50);

    // Set should succeed by saving to memory fallback
    await resilientCache.set('resilientKey', 'safeValue', 60);

    // Get should catch Redis error and retrieve from memory fallback
    const val = await resilientCache.get<string>('resilientKey');
    expect(val).toBe('safeValue');
    expect(resilientCache.getMetrics().errors).toBeGreaterThan(0);
  });
});
