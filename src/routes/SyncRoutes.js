/**
 * Sync Routes
 * Handles real-time synchronization between admin UI and backend
 * Used for cache invalidation, data refresh, and state synchronization
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/VerifyToken');
const checkAdminRole = require('../middleware/CheckAdminRole');
const { clearCache } = require('../middleware/cache');
const logger = require('../utils/logger');

// ========================================
// CACHE SYNC ROUTES
// ========================================

/**
 * Clear all cache
 * POST /api/sync/cache/clear
 * Admin only - clears all cached data
 */
router.post('/cache/clear', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const cleared = await clearCache('cache:*');
    
    logger.info('Cache cleared by admin', { 
      admin: req.user?.email || req.user?.id,
      itemsCleared: cleared 
    });

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      itemsCleared: cleared
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

/**
 * Clear specific cache pattern
 * POST /api/sync/cache/clear/:pattern
 * Admin only - clears cache matching specific pattern
 */
router.post('/cache/clear/:pattern', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const { pattern } = req.params;
    const cachePattern = `cache:*${pattern}*`;
    const cleared = await clearCache(cachePattern);
    
    logger.info('Cache pattern cleared by admin', { 
      admin: req.user?.email || req.user?.id,
      pattern: cachePattern,
      itemsCleared: cleared 
    });

    res.json({
      success: true,
      message: `Cache cleared for pattern: ${pattern}`,
      pattern: cachePattern,
      itemsCleared: cleared
    });
  } catch (error) {
    logger.error('Error clearing cache pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache pattern',
      error: error.message
    });
  }
});

// ========================================
// DATA SYNC ROUTES
// ========================================

/**
 * Trigger data refresh
 * POST /api/sync/refresh
 * Admin only - triggers a data refresh across the system
 */
router.post('/refresh', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const { entities } = req.body; // Array of entities to refresh: ['products', 'categories', etc.]
    
    // Clear cache for specified entities
    const results = {};
    if (entities && Array.isArray(entities)) {
      for (const entity of entities) {
        const cleared = await clearCache(`cache:*/${entity}*`);
        results[entity] = cleared;
      }
    } else {
      // Refresh all if no specific entities provided
      results.all = await clearCache('cache:*');
    }

    logger.info('Data refresh triggered by admin', { 
      admin: req.user?.email || req.user?.id,
      entities,
      results 
    });

    res.json({
      success: true,
      message: 'Data refresh triggered successfully',
      results
    });
  } catch (error) {
    logger.error('Error triggering data refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger data refresh',
      error: error.message
    });
  }
});

/**
 * Get sync status
 * GET /api/sync/status
 * Admin only - get current sync and cache status
 */
router.get('/status', verifyToken, checkAdminRole, async (req, res) => {
  try {
    const { isRedisAvailable } = require('../middleware/cache');
    
    const status = {
      timestamp: new Date().toISOString(),
      cache: {
        enabled: isRedisAvailable(),
        type: isRedisAvailable() ? 'redis' : 'none'
      },
      server: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message
    });
  }
});

/**
 * Ping endpoint for sync health check
 * GET /api/sync/ping
 * Public - simple health check for sync service
 */
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Sync service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
