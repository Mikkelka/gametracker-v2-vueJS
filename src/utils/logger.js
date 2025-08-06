// src/utils/logger.js
const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

class Logger {
  constructor() {
    this.isDevelopment = isDevelopment;
    this.isProduction = isProduction;
  }

  debug(...args) {
    if (this.isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args) {
    if (this.isDevelopment) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args) {
    // Warnings are shown in both development and production
    console.warn('[WARN]', ...args);
  }

  error(...args) {
    // Errors are always shown but sanitized in production
    if (this.isDevelopment) {
      console.error('[ERROR]', ...args);
    } else {
      // In production, only log generic error messages to avoid exposing sensitive info
      console.error('[ERROR]', 'An error occurred. Check application logs for details.');
      
      // Optionally send to error reporting service
      // this.sendToErrorService(...args);
    }
  }

  // Method for sending errors to external service (placeholder)
  sendToErrorService(error, context = {}) {
    if (this.isProduction) {
      // Here you could integrate with services like Sentry, LogRocket, etc.
      // For now, we'll just store it locally or send to your own endpoint
      
      const errorData = {
        message: error?.message || String(error),
        stack: error?.stack || null,
        context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      
      // Example: Send to your error reporting endpoint
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // }).catch(() => {}); // Silently fail to avoid recursive errors
    }
  }
}

export const logger = new Logger();

// Convenience exports
export const { debug, info, warn, error } = logger;