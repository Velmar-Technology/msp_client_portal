import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenerationTracker } from './GenerationTracker';
import { RedisClientService } from './RedisClient';

describe('GenerationTracker', () => {
  let tracker: GenerationTracker;
  let mockRedisService: RedisClientService;

  beforeEach(() => {
    mockRedisService = {
      getClient: vi.fn().mockReturnValue(null), // Redis offline for unit test isolation
      isReady: vi.fn().mockReturnValue(false),
      getHealth: vi.fn(),
      incrementOps: vi.fn(),
      quit: vi.fn(),
    } as unknown as RedisClientService;

    tracker = new GenerationTracker(mockRedisService, 100);
    tracker.resetLocalState();
  });

  it('initializes generation counter to 1 by default', async () => {
    const gen = await tracker.getGeneration('plans', 'global');
    expect(gen).toBe(1);
  });

  it('formats versioned keys with active generation', async () => {
    const key = await tracker.formatVersionedKey('plans', 'global', 'tier-1');
    expect(key).toBe('plans:global:v1:tier-1');
  });

  it('increments generation counter atomically on invalidation', async () => {
    const genBefore = await tracker.getGeneration('plans', 'tenant-123');
    expect(genBefore).toBe(1);

    const newGen = await tracker.invalidate('plans', 'tenant-123');
    expect(newGen).toBe(2);

    const versionedKey = await tracker.formatVersionedKey('plans', 'tenant-123', 'id:plan-1');
    expect(versionedKey).toBe('plans:tenant-123:v2:id:plan-1');
  });

  it('isolates generation counters across different scopes and namespaces', async () => {
    await tracker.invalidate('plans', 'tenant-A');

    const genA = await tracker.getGeneration('plans', 'tenant-A');
    const genB = await tracker.getGeneration('plans', 'tenant-B');
    const genUsers = await tracker.getGeneration('users', 'tenant-A');

    expect(genA).toBe(2);
    expect(genB).toBe(1); // Unaffected
    expect(genUsers).toBe(1); // Unaffected
  });

  it('works with simulated Redis client when online', async () => {
    let redisCounter = 5;
    const fakeRedis = {
      get: vi.fn().mockResolvedValue('5'),
      incr: vi.fn().mockImplementation(async () => ++redisCounter),
    };

    mockRedisService.getClient = vi.fn().mockReturnValue(fakeRedis);

    const redisTracker = new GenerationTracker(mockRedisService, 50);
    const gen = await redisTracker.getGeneration('plans', 'global');
    expect(gen).toBe(5);

    const nextGen = await redisTracker.invalidate('plans', 'global');
    expect(nextGen).toBe(6);
    expect(fakeRedis.incr).toHaveBeenCalledWith('gen:plans:global');
  });
});
