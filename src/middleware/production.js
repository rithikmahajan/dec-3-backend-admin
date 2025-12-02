/**
 * Production Middleware
 * Provides security, performance, and monitoring middleware for production environments
 */

const logger = require('../utils/logger');

// ========================================
// SECURITY HEADERS MIDDLEWARE
// ========================================

/**
 * Security Headers Middleware
 * Adds security-related HTTP headers to all responses
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (adjust as needed)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  
  next();
};

// ========================================
// RATE LIMITING MIDDLEWARE
// ========================================

/**
 * Simple in-memory rate limiter
 * For production, consider using express-rate-limit with Redis
 */
const rateLimitStore = new Map();

const apiRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `${ip}:${req.path}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // Max 100 requests per window

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [k, v] of rateLimitStore.entries()) {
      if (now - v.resetTime > windowMs) {
        rateLimitStore.delete(k);
      }
    }
  }

  let record = rateLimitStore.get(key);
  
  if (!record || now - record.resetTime > windowMs) {
    // New window
    record = {
      count: 1,
      resetTime: now
    };
    rateLimitStore.set(key, record);
    return next();
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    res.setHeader('Retry-After', Math.ceil((windowMs - (now - record.resetTime)) / 1000));
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
      retryAfter: Math.ceil((windowMs - (now - record.resetTime)) / 1000)
    });
  }

  // Increment counter
  record.count++;
  rateLimitStore.set(key, record);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', maxRequests - record.count);
  res.setHeader('X-RateLimit-Reset', new Date(record.resetTime + windowMs).toISOString());
  
  next();
};

// ========================================
// COMPRESSION MIDDLEWARE
// ========================================

/**
 * Compression Middleware Factory
 * Returns a compression middleware (uses compression package if available)
 */
const compressionMiddleware = () => {
  try {
    const compression = require('compression');
    return compression({
      filter: (req, res) => {
        // Don't compress responses with this request header
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Fallback to standard compression filter
        return compression.filter(req, res);
      },
      level: 6 // Compression level (0-9)
    });
  } catch (error) {
    logger.warn('Compression package not available, using passthrough middleware');
    // Return passthrough middleware if compression is not installed
    return (req, res, next) => next();
  }
};

// ========================================
// REQUEST LOGGER MIDDLEWARE
// ========================================

/**
 * Request Logger Middleware
 * Logs incoming requests with timing information
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    if (res.statusCode >= 500) {
      logger.error('Request Error:', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request Warning:', logData);
    } else if (process.env.NODE_ENV === 'development') {
      logger.debug('Request:', logData);
    }
  });

  next();
};

// ========================================
// ERROR HANDLER MIDDLEWARE
// ========================================

/**
 * Global Error Handler
 * Catches all errors and returns appropriate response
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl || req.url,
    method: req.method
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Don't leak error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500 
      ? 'Internal server error' 
      : err.message || 'An error occurred',
    ...(isProduction ? {} : { 
      stack: err.stack,
      error: err.toString() 
    })
  });
};

// ========================================
// NOT FOUND HANDLER MIDDLEWARE
// ========================================

/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl || req.url,
    method: req.method
  });
};

// ========================================
// HEALTH CHECK MIDDLEWARE
// ========================================

/**
 * Health Check Middleware
 * Simple health check endpoint (deprecated - use /api/health instead)
 */
const healthCheck = (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// ========================================
// TRUST PROXY MIDDLEWARE
// ========================================

/**
 * Trust Proxy Configuration
 * Configures Express to trust proxy headers
 */
const trustProxy = (app) => {
  // Trust first proxy (for load balancers, reverse proxies)
  app.set('trust proxy', 1);
  
  logger.info('Trust proxy configured');
};

// ========================================
// EXPORTS
// ========================================

module.exports = {
  securityHeaders,
  apiRateLimiter,
  compressionMiddleware,
  requestLogger,
  errorHandler,
  notFoundHandler,
  healthCheck,
  trustProxy
};
