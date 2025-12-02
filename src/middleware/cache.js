/**
 * Cache Middleware
 * Provides Redis-based caching functionality for API routes
 * Falls back to no-cache behavior if Redis is unavailable
 */

const logger = require('../utils/logger');

// Check if Redis client is available (optional dependency)
let redisClient = null;
let isRedisAvailable = false;

try {
  // Attempt to use Redis if available
  const redis = require('redis');
  
  // Create Redis client (will be initialized when needed)
  redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          logger.warn('Redis connection failed after 3 retries. Running without cache.');
          return false;
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  // Handle Redis connection events
  redisClient.on('error', (err) => {
    logger.warn('Redis Client Error:', err.message);
    isRedisAvailable = false;
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
    isRedisAvailable = true;
  });

  redisClient.on('ready', () => {
    isRedisAvailable = true;
  });

  // Connect to Redis (async, non-blocking)
  redisClient.connect().catch((err) => {
    logger.warn('Could not connect to Redis:', err.message);
    isRedisAvailable = false;
  });

} catch (error) {
  logger.warn('Redis module not available. Running without cache:', error.message);
  isRedisAvailable = false;
}

/**
 * Cache middleware factory
 * @param {number} duration - Cache duration in seconds (default: 300 = 5 minutes)
 * @returns {Function} Express middleware function
 */
const cache = (duration = 300) => {
  return async (req, res, next) => {
    // Skip caching if Redis is not available or for non-GET requests
    if (!isRedisAvailable || !redisClient || req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl || req.url}`;

    try {
      // Try to get cached response
      const cachedResponse = await redisClient.get(key);

      if (cachedResponse) {
        logger.debug(`Cache HIT for ${key}`);
        const data = JSON.parse(cachedResponse);
        return res.json(data);
      }

      logger.debug(`Cache MISS for ${key}`);

      // Store the original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (body) => {
        // Cache the response
        redisClient.setEx(key, duration, JSON.stringify(body))
          .catch(err => logger.warn('Failed to cache response:', err.message));

        // Send the response
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.warn('Cache middleware error:', error.message);
      next();
    }
  };
};

/**
 * Clear cache for specific pattern or all cache
 * @param {string} pattern - Pattern to match keys (default: 'cache:*')
 * @returns {Promise<number>} Number of keys deleted
 */
const clearCache = async (pattern = 'cache:*') => {
  if (!isRedisAvailable || !redisClient) {
    logger.debug('Redis not available, skipping cache clear');
    return 0;
  }

  try {
    const keys = await redisClient.keys(pattern);
    
    if (keys.length === 0) {
      logger.debug(`No cache keys found matching pattern: ${pattern}`);
      return 0;
    }

    const deleted = await redisClient.del(keys);
    logger.info(`Cleared ${deleted} cache entries matching pattern: ${pattern}`);
    return deleted;
  } catch (error) {
    logger.warn('Error clearing cache:', error.message);
    return 0;
  }
};

/**
 * Clear cache middleware
 * Clears cache for specific patterns after mutation operations
 */
const clearCacheMiddleware = (patterns = ['cache:*']) => {
  return async (req, res, next) => {
    // Store original json/send functions
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override to clear cache after successful response
    const clearAndRespond = (responseFunc) => {
      return async (body) => {
        // Only clear cache for successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          for (const pattern of patterns) {
            await clearCache(pattern);
          }
        }
        return responseFunc(body);
      };
    };

    res.json = clearAndRespond(originalJson);
    res.send = clearAndRespond(originalSend);

    next();
  };
};

// Graceful shutdown - close Redis connection
process.on('SIGTERM', async () => {
  if (redisClient && isRedisAvailable) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.warn('Error closing Redis connection:', error.message);
    }
  }
});

module.exports = {
  cache,
  clearCache,
  clearCacheMiddleware,
  isRedisAvailable: () => isRedisAvailable
};
