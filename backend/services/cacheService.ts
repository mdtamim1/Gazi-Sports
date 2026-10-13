import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class InMemoryCache {
  private cache = new Map<string, { value: any; expiresAt: number }>();

  set(key: string, value: any, ttlSeconds: number) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  del(key: string) {
    this.cache.delete(key);
  }

  delPattern(pattern: string) {
    const cleanPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp('^' + cleanPattern + '$');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

const memoryCache = new InMemoryCache();
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const DEFAULT_TTL = parseInt(process.env.CACHE_TTL || '3600');

let redisClient: any = null;
let isRedisConnected = false;

// Attempt to connect to Redis server
if (process.env.REDIS_ENABLED !== 'false') {
  redisClient = createClient({ url: redisUrl });

  redisClient.on('error', (err: any) => {
    // Only warn once if connection is lost, prevent log spam
    if (isRedisConnected) {
      console.warn('⚠️ Redis connection lost. Operating on ultra-fast In-Memory Cache.');
    }
    isRedisConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('🔌 Connected to Redis cache server.');
    isRedisConnected = true;
  });

  redisClient.connect().catch(() => {
    console.warn('⚠️ Redis server unreachable. Operating on ultra-fast In-Memory Cache.');
    isRedisConnected = false;
  });
}

export const cacheService = {
  /**
   * Get value from cache:
   * Level 1: In-Memory RAM (0.001 ms, ultra-fast - instant)
   * Level 2: Redis (if available and not in RAM)
   */
  async get<T>(key: string): Promise<T | null> {
    // 1. Ultra-fast L1 RAM Cache check first (instant)
    const memVal = memoryCache.get(key);
    if (memVal !== null && memVal !== undefined) {
      return memVal as T;
    }

    // 2. L2 Redis check (if available)
    if (isRedisConnected && redisClient) {
      try {
        const data = await redisClient.get(key);
        if (data !== null) {
          const parsed = JSON.parse(data) as T;
          // Store in L1 RAM cache for future instant access
          memoryCache.set(key, parsed, 300);
          return parsed;
        }
      } catch (err) {
        // Silently ignore Redis error, RAM handles it
      }
    }
    return null;
  },

  /**
   * Set value in cache (writes instantly to L1 RAM and non-blocking L2 Redis)
   */
  async set(key: string, value: any, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    // Write instantly to L1 RAM cache
    memoryCache.set(key, value, ttlSeconds);

    // Asynchronously write to Redis without blocking the event loop
    if (isRedisConnected && redisClient) {
      try {
        const serialized = JSON.stringify(value);
        redisClient.set(key, serialized, { EX: ttlSeconds }).catch(() => {});
      } catch (err) {}
    }
  },

  /**
   * Delete specific key from cache
   */
  async del(key: string): Promise<void> {
    memoryCache.del(key);
    if (isRedisConnected && redisClient) {
      try {
        redisClient.del(key).catch(() => {});
      } catch (err) {}
    }
  },

  /**
   * Delete keys matching a pattern (e.g. "products:*")
   */
  async delPattern(pattern: string): Promise<void> {
    memoryCache.delPattern(pattern);
    if (isRedisConnected && redisClient) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          redisClient.del(keys).catch(() => {});
        }
      } catch (err) {}
    }
  },

  /**
   * Clear all L1 RAM cache
   */
  clearMemory(): void {
    memoryCache.clear();
  },

  /**
   * Wrapper helper: Checks if key exists, if not, runs fetchFn, caches result, and returns
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
    const freshData = await fetchFn();
    await this.set(key, freshData, ttlSeconds);
    return freshData;
  }
};
