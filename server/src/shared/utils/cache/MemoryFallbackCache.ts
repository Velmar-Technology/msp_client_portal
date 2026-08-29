interface CacheEntry<T> {
  value: T;
  expiresAt: number | null; // unix timestamp in ms
}

/**
 * In-memory fallback cache with TTL expiration and LRU-like eviction.
 * Guarantees zero request failures if Redis goes down or is unconfigured.
 */
export class MemoryFallbackCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;

  /**
   * Initializes MemoryFallbackCache with maximum entry cap.
   *
   * @param maxEntries - Max key capacity before LRU eviction (default: 5000)
   */
  constructor(maxEntries = 5000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Retrieves an item from memory, evicting expired entries and updating LRU position.
   *
   * @typeParam T - Value type
   * @param key - Cache key string
   * @returns Value or null if expired/miss
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value as T;
  }

  /**
   * Stores a value in memory, evicting oldest item when max capacity is reached.
   *
   * @typeParam T - Value type
   * @param key - Cache key string
   * @param value - Value to cache
   * @param ttlSeconds - Optional TTL in seconds
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    // Evict oldest if limit reached
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
      }
    }

    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Removes an entry from the memory cache.
   *
   * @param key - Cache key string
   * @returns True if key was deleted, false otherwise
   */
  del(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clears all stored cache entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns current count of entries in the in-memory cache.
   *
   * @returns Size count
   */
  size(): number {
    return this.store.size;
  }
}

export const memoryFallbackCache = new MemoryFallbackCache();
