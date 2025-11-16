import { Request, Response, NextFunction } from 'express';

// Simple in-memory cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache cleanup interval (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > value.ttl) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  keyGenerator?: (req: Request) => string;
}

/**
 * Cache middleware for GET requests
 * Usage: app.get('/api/data', cacheMiddleware({ ttl: 60000 }), handler)
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const ttl = options.ttl || 5 * 60 * 1000; // Default 5 minutes
  const keyGenerator = options.keyGenerator || ((req: Request) => {
    return `${req.method}:${req.path}:${JSON.stringify(req.query)}:${(req.user as any)?.id || 'anonymous'}`;
  });

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Cache hit - return cached data
      return res.json(cached.data);
    }

    // Cache miss - intercept response
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      // Store in cache
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
      });
      return originalJson(data);
    };

    next();
  };
};

/**
 * Clear cache for specific pattern
 */
export const clearCache = (pattern?: string) => {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
};
