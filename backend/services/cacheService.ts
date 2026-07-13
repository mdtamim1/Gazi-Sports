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
      console.warn('⚠️ Redis connection lost. Falling back to In-Memory Cache.');
    }
    isRedisConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('🔌 Connected to Redis cache server.');
    isRedisConnected = true;
  });

  redisClient.connect().catch(() => {
    console.warn('⚠️ Redis server unreachable. Falling back to In-Memory Cache.');
    isRedisConnected = false;
  });
}

export const cacheService = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (isRedisConnected && redisClient) {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
      }
    } catch (err) {
      console.error(`Error reading key "${key}" from Redis:`, err);
    }
    // Fallback to memory
    return memoryCache.get(key) as T;
  },

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    const serialized = JSON.stringify(value);
    try {
      if (isRedisConnected && redisClient) {
        await redisClient.set(key, serialized, {
          EX: ttlSeconds
        });
        return;
      }
    } catch (err) {
      console.error(`Error writing key "${key}" to Redis:`, err);
    }
    // Fallback to memory
    memoryCache.set(key, value, ttlSeconds);
  },

  /**
   * Delete specific key from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (isRedisConnected && redisClient) {
        await redisClient.del(key);
        return;
      }
    } catch (err) {
      console.error(`Error deleting key "${key}" from Redis:`, err);
    }
    memoryCache.del(key);
  },

  /**
   * Delete keys matching a pattern (e.g. "products:*")
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      if (isRedisConnected && redisClient) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
        return;
      }
    } catch (err) {
      console.error(`Error deleting pattern "${pattern}" from Redis:`, err);
    }
    memoryCache.delPattern(pattern);
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
