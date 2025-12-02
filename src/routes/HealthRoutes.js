/**
 * Health Routes
 * Provides health check and server status endpoints
 * Used for monitoring, load balancers, and uptime checks
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ========================================
// HEALTH CHECK ROUTES
// ========================================

/**
 * Basic health check
 * GET /api/health
 * Public endpoint - returns basic server health status
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Detailed health check
 * GET /api/health/detailed
 * Returns detailed health information including database status
 */
router.get('/detailed', async (req, res) => {
  try {
    const healthStatus = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100) + '%'
        }
      },
      database: {
        status: 'unknown',
        connected: false
      }
    };

    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthStatus.database.status = 'connected';
      healthStatus.database.connected = true;
      healthStatus.database.name = mongoose.connection.name;
      healthStatus.database.host = mongoose.connection.host;
    } else if (mongoose.connection.readyState === 2) {
      healthStatus.database.status = 'connecting';
      healthStatus.database.connected = false;
    } else if (mongoose.connection.readyState === 0) {
      healthStatus.database.status = 'disconnected';
      healthStatus.database.connected = false;
      healthStatus.status = 'degraded';
    }

    // Check cache availability
    try {
      const { isRedisAvailable } = require('../middleware/cache');
      healthStatus.cache = {
        enabled: isRedisAvailable(),
        type: isRedisAvailable() ? 'redis' : 'none'
      };
    } catch (error) {
      healthStatus.cache = {
        enabled: false,
        type: 'none'
      };
    }

    res.json(healthStatus);
  } catch (error) {
    logger.error('Error in detailed health check:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Ping endpoint
 * GET /api/health/ping
 * Minimal response for quick health checks
 */
router.get('/ping', (req, res) => {
  res.send('pong');
});

/**
 * Ready check
 * GET /api/health/ready
 * Returns 200 if server is ready to accept traffic
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        ready: false,
        message: 'Database not connected'
      });
    }

    res.json({
      success: true,
      ready: true,
      message: 'Server is ready'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      ready: false,
      message: 'Server not ready',
      error: error.message
    });
  }
});

/**
 * Live check
 * GET /api/health/live
 * Returns 200 if server process is alive
 */
router.get('/live', (req, res) => {
  res.json({
    success: true,
    alive: true,
    message: 'Server is alive',
    uptime: process.uptime()
  });
});

/**
 * Database status
 * GET /api/health/db
 * Returns database connection status
 */
router.get('/db', (req, res) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const dbStatus = {
    status: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    connected: mongoose.connection.readyState === 1
  };

  if (mongoose.connection.readyState === 1) {
    dbStatus.name = mongoose.connection.name;
    dbStatus.host = mongoose.connection.host;
  }

  const statusCode = mongoose.connection.readyState === 1 ? 200 : 503;
  
  res.status(statusCode).json({
    success: mongoose.connection.readyState === 1,
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
