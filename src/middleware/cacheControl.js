/**
 * Cache Control Middleware
 * Manages HTTP cache headers for different types of responses
 * Helps optimize performance by setting appropriate cache directives
 */

const logger = require('../utils/logger');

/**
 * Apply Cache Headers Middleware
 * Sets appropriate cache-control headers based on the request path and method
 */
const applyCacheHeaders = (req, res, next) => {
  // Only apply caching to GET requests
  if (req.method !== 'GET') {
    // Don't cache non-GET requests
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }

  const path = req.path.toLowerCase();

  // Static assets (images, fonts, etc.) - cache aggressively
  if (
    path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot|otf)$/i)
  ) {
    // Cache for 1 year (immutable assets)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return next();
  }

  // CSS and JavaScript files - cache with revalidation
  if (path.match(/\.(css|js)$/i)) {
    // Cache for 1 day but revalidate
    res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
    return next();
  }

  // API routes - different strategies based on endpoint
  if (path.startsWith('/api/')) {
    
    // Health check endpoints - short cache
    if (path.includes('/health') || path.includes('/ping')) {
      res.setHeader('Cache-Control', 'public, max-age=30'); // 30 seconds
      return next();
    }

    // Public catalog data (products, categories) - moderate cache
    if (
      path.includes('/items') ||
      path.includes('/categories') ||
      path.includes('/subcategories') ||
      path.includes('/banners') ||
      path.includes('/faqs') ||
      path.includes('/settings')
    ) {
      // Cache for 5 minutes
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
      return next();
    }

    // User-specific data (cart, wishlist, orders, profile) - no cache
    if (
      path.includes('/cart') ||
      path.includes('/wishlist') ||
      path.includes('/orders') ||
      path.includes('/user') ||
      path.includes('/profile') ||
      path.includes('/address') ||
      path.includes('/payment')
    ) {
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return next();
    }

    // Admin routes - never cache
    if (path.includes('/admin')) {
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return next();
    }

    // Auth routes - never cache
    if (path.includes('/auth') || path.includes('/login') || path.includes('/register')) {
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return next();
    }

    // Default for other API routes - short cache
    res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate'); // 1 minute
    return next();
  }

  // HTML pages - cache briefly
  if (path.match(/\.html?$/i) || path === '/') {
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes
    return next();
  }

  // Default - no cache for safety
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  next();
};

/**
 * No Cache Middleware
 * Explicitly prevents caching for specific routes
 */
const noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

/**
 * Public Cache Middleware
 * Sets public cache headers with custom max-age
 * @param {number} maxAge - Cache duration in seconds
 */
const publicCache = (maxAge = 300) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}, must-revalidate`);
    }
    next();
  };
};

/**
 * Private Cache Middleware
 * Sets private cache headers (user-specific data)
 * @param {number} maxAge - Cache duration in seconds
 */
const privateCache = (maxAge = 60) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `private, max-age=${maxAge}, must-revalidate`);
    } else {
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    }
    next();
  };
};

/**
 * Immutable Cache Middleware
 * For assets that never change (with hashed filenames)
 */
const immutableCache = (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
};

module.exports = {
  applyCacheHeaders,
  noCache,
  publicCache,
  privateCache,
  immutableCache
};
