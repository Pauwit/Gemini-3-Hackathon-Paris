/**
 * ============================================================
 * utils/logger.js — Structured Logger
 * ============================================================
 *
 * PURPOSE:
 * Provides consistent timestamped, leveled logging throughout
 * the server. All modules should import and use this instead
 * of calling console.log directly (except server.js bootstrap).
 *
 * DATA FLOW:
 * any module → logger.info/warn/error(message, data)
 *   → formatted string → console.log/warn/error
 *
 * PROTOCOL REFERENCE: N/A
 *
 * DEPENDENCIES: None (pure utility)
 * ============================================================
 */

'use strict';

/**
 * log
 * Core logging function with timestamp, level, and optional data.
 *
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} message - Human-readable message
 * @param {object} [data] - Optional structured data to include
 */
function log(level, message, data = {}) {
  const ts = new Date().toISOString();
  const dataStr = Object.keys(data).length ? ' ' + JSON.stringify(data) : '';
  const line = `[${ts}] [${level.toUpperCase()}] ${message}${dataStr}`;

  switch (level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

/** @param {string} message @param {object} [data] */
function info(message, data) { log('info', message, data); }

/** @param {string} message @param {object} [data] */
function warn(message, data) { log('warn', message, data); }

/** @param {string} message @param {object} [data] */
function error(message, data) { log('error', message, data); }

/** @param {string} message @param {object} [data] */
function debug(message, data) { log('debug', message, data); }

module.exports = { log, info, warn, error, debug };
