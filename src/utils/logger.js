/**
 * Logger utility for production-safe logging
 * Provides structured logging with different log levels
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  /**
   * Log informational messages
   */
  info: (...args) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Log error messages
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log warning messages
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log success messages
   */
  success: (...args) => {
    console.log('[SUCCESS]', ...args);
  }
};

module.exports = logger;
