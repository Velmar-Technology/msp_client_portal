import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryFallbackCache } from './MemoryFallbackCache';

describe('MemoryFallbackCache', () => {
  let cache: MemoryFallbackCache;

  beforeEach(() => {
    cache = new MemoryFallbackCache(5); // Small limit for testing eviction
  });

  it('stores and retrieves items within TTL', () => {
    cache.set('key1', { name: 'MSP Plan' }, 10);
    const result = cache.get<{ name: string }>('key1');
    expect(result).toEqual({ name: 'MSP Plan' });
  });

  it('returns null on expired TTL items', () => {
    vi.useFakeTimers();
    cache.set('expiring', 'value', 1); // 1 second TTL

    expect(cache.get('expiring')).toBe('value');

    // Advance 2 seconds
    vi.advanceTimersByTime(2000);

    expect(cache.get('expiring')).toBeNull();
    vi.useRealTimers();
  });

  it('evicts oldest items when max limit is exceeded (LRU behavior)', () => {
    cache.set('k1', 1);
    cache.set('k2', 2);
    cache.set('k3', 3);
    cache.set('k4', 4);
    cache.set('k5', 5);

    expect(cache.size()).toBe(5);

    // Adding 6th item should evict k1
    cache.set('k6', 6);
    expect(cache.size()).toBe(5);
    expect(cache.get('k1')).toBeNull();
    expect(cache.get('k6')).toBe(6);
  });

  it('deletes specific keys correctly', () => {
    cache.set('toDelete', 'value');
    expect(cache.del('toDelete')).toBe(true);
    expect(cache.get('toDelete')).toBeNull();
  });

  it('clears all stored items', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
