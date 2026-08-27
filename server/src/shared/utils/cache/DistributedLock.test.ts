import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DistributedLock } from './DistributedLock';
import { RedisClientService } from './RedisClient';

describe('DistributedLock', () => {
  let lock: DistributedLock;
  let mockRedisService: RedisClientService;

  beforeEach(() => {
    mockRedisService = {
      getClient: vi.fn().mockReturnValue(null), // Redis offline for in-memory mutex test
      isReady: vi.fn().mockReturnValue(false),
      getHealth: vi.fn(),
      incrementOps: vi.fn(),
      quit: vi.fn(),
    } as unknown as RedisClientService;

    lock = new DistributedLock(mockRedisService);
  });

  it('acquires and releases in-memory lock correctly', async () => {
    const token = await lock.acquireLock('round_robin:SUPPORT');
    expect(token).toBeDefined();

    // Second acquire should fail while held
    const secondToken = await lock.acquireLock('round_robin:SUPPORT');
    expect(secondToken).toBeNull();

    // Release lock
    const released = await lock.releaseLock('round_robin:SUPPORT', token!);
    expect(released).toBe(true);

    // Can acquire again after release
    const thirdToken = await lock.acquireLock('round_robin:SUPPORT');
    expect(thirdToken).toBeDefined();
  });

  it('executes guarded callback with withLock', async () => {
    let executionCount = 0;
    const result = await lock.withLock('counter', 1000, async () => {
      executionCount++;
      return 'done';
    });

    expect(result).toBe('done');
    expect(executionCount).toBe(1);

    // Lock is automatically released after withLock
    const nextResult = await lock.withLock('counter', 1000, async () => {
      return 'next';
    });
    expect(nextResult).toBe('next');
  });

  it('works with simulated Redis lock client', async () => {
    const fakeRedis = {
      set: vi.fn().mockResolvedValue('OK'),
      eval: vi.fn().mockResolvedValue(1),
    };
    mockRedisService.getClient = vi.fn().mockReturnValue(fakeRedis);

    const redisLock = new DistributedLock(mockRedisService);
    const token = await redisLock.acquireLock('resource-123', 5000);

    expect(token).toBeDefined();
    expect(fakeRedis.set).toHaveBeenCalledWith('lock:resource-123', token, 'PX', 5000, 'NX');

    const released = await redisLock.releaseLock('resource-123', token!);
    expect(released).toBe(true);
    expect(fakeRedis.eval).toHaveBeenCalled();
  });
});
