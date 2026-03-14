/**
 * ============================================================
 * async/scanner.js — Async Background Workspace Scanner
 * ============================================================
 *
 * PURPOSE:
 * Runs a continuous background loop that periodically fetches
 * fresh workspace data (emails, documents, calendar, sheets)
 * and triggers AI insight regeneration. Keeps the data store
 * current so the frontend always has fresh context.
 *
 * LIFECYCLE:
 *   start(broadcastFn) → immediate scan → setInterval(ASYNC_SCAN_INTERVAL_MS)
 *   stop() → clears interval
 *
 * DATA FLOW:
 *   runScanCycle() → runFullScan() → update data-store → generateInsights() → broadcast
 *
 * PROTOCOL REFERENCE: PROTOCOL.md section 3 (pipeline-status message)
 *
 * DEPENDENCIES:
 *   ../workers/worker-orchestrator — runFullScan
 *   ./data-store                  — updateEmails, updateDocuments, updateCalendar, updateInsights
 *   ./insight-generator           — generateInsights
 *   ../config                     — ASYNC_SCAN_INTERVAL_MS, USE_MOCK, GEMINI_API_KEY
 *   ../utils/logger               — structured logging
 * ============================================================
 */

'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const { runFullScan } = require('../workers/worker-orchestrator');
const dataStore = require('./data-store');
const { generateInsights } = require('./insight-generator');

/** @type {NodeJS.Timeout|null} */
let scanInterval = null;

/** @type {Function|null} broadcastFn(type, payload) */
let _broadcast = null;

/** @type {boolean} */
let _scanning = false;

/**
 * broadcast — sends a WebSocket broadcast if broadcastFn is registered
 * @param {string} type - Message type
 * @param {object} payload - Message payload
 */
function broadcast(type, payload) {
  if (typeof _broadcast === 'function') {
    try {
      _broadcast(type, payload);
    } catch (err) {
      logger.warn('[scanner] Broadcast failed', { error: err.message });
    }
  }
}

/**
 * runScanCycle — performs a single full scan and insight regeneration cycle
 * Updates the data store with fresh workspace data and new insights.
 * @returns {Promise<void>}
 */
async function runScanCycle() {
  if (_scanning) {
    logger.info('[scanner] Scan already in progress — skipping');
    return;
  }

  _scanning = true;
  const scanStart = Date.now();

  logger.info('[scanner] Scan cycle starting');
  broadcast('pipeline-status', {
    stage: 'scanning',
    message: 'Background workspace scan starting...',
    active: true,
  });

  try {
    // Step 1: Fetch workspace data from all workers
    broadcast('pipeline-status', {
      stage: 'fetching',
      message: 'Fetching emails, documents, calendar...',
      active: true,
    });

    const scanResults = await runFullScan();

    // Step 2: Update data store
    if (scanResults.gmail && scanResults.gmail.raw) {
      dataStore.updateEmails(scanResults.gmail.raw);
    }
    if (scanResults.drive && scanResults.drive.raw) {
      dataStore.updateDocuments(scanResults.drive.raw);
    }
    if (scanResults.sheets && scanResults.sheets.raw) {
      dataStore.updateSheets(scanResults.sheets.raw);
    }
    if (scanResults.calendar && scanResults.calendar.raw) {
      dataStore.updateCalendar(scanResults.calendar.raw);
    }

    dataStore.incrementScanCount();

    const workspace = dataStore.getWorkspace();
    logger.info('[scanner] Workspace updated', {
      emails: workspace.emails.length,
      documents: workspace.documents.length,
      calendar: workspace.calendar.length,
    });

    // Step 3: Generate insights (skip if mock mode without API key)
    const skipInsights = config.USE_MOCK && !config.GEMINI_API_KEY;
    if (!skipInsights) {
      broadcast('pipeline-status', {
        stage: 'analysing',
        message: 'Generating AI insights...',
        active: true,
      });
    }

    const insights = await generateInsights(workspace);
    dataStore.updateInsights(insights);

    // Step 4: Persist to disk
    await dataStore.saveToDisk();

    const elapsed = Date.now() - scanStart;
    logger.info('[scanner] Scan cycle complete', { elapsedMs: elapsed });

    broadcast('pipeline-status', {
      stage: 'done',
      message: `Workspace scan complete (${elapsed}ms). Insights updated.`,
      active: false,
    });

  } catch (err) {
    logger.error('[scanner] Scan cycle failed', { error: err.message });
    broadcast('pipeline-status', {
      stage: 'error',
      message: `Scan failed: ${err.message}`,
      active: false,
    });
  } finally {
    _scanning = false;
  }
}

/**
 * start — begins the scanner loop: runs immediately then on interval
 * @param {Function} [broadcastFn] - Function to broadcast WebSocket messages broadcastFn(type, payload)
 */
function start(broadcastFn) {
  if (scanInterval) {
    logger.warn('[scanner] Already running — ignoring start()');
    return;
  }

  _broadcast = broadcastFn || null;

  logger.info('[scanner] Starting async scanner', {
    intervalMs: config.ASYNC_SCAN_INTERVAL_MS,
    useMock: config.USE_MOCK,
  });

  // Run immediately on startup
  runScanCycle().catch(err => {
    logger.error('[scanner] Initial scan failed', { error: err.message });
  });

  // Schedule recurring scans
  scanInterval = setInterval(() => {
    runScanCycle().catch(err => {
      logger.error('[scanner] Scheduled scan failed', { error: err.message });
    });
  }, config.ASYNC_SCAN_INTERVAL_MS);

  // Prevent interval from blocking process exit
  if (scanInterval.unref) scanInterval.unref();
}

/**
 * stop — stops the scanner interval
 */
function stop() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
    logger.info('[scanner] Async scanner stopped');
  }
}

/**
 * isRunning — returns true if a scan is currently in progress
 * @returns {boolean}
 */
function isRunning() {
  return _scanning;
}

module.exports = { start, stop, runScanCycle, isRunning };
