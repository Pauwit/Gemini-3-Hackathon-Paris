/**
 * logger.js — Simple timestamped logging utility.
 * Wraps console.log/error with timestamps and level labels.
 */

function timestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (...args) => console.log(`[${timestamp()}] [INFO]`, ...args),
  error: (...args) => console.error(`[${timestamp()}] [ERROR]`, ...args),
  warn: (...args) => console.warn(`[${timestamp()}] [WARN]`, ...args),
  debug: (...args) => console.log(`[${timestamp()}] [DEBUG]`, ...args),
};

module.exports = logger;
