/**
 * ============================================================
 * workers/worker-orchestrator.js — Worker Orchestrator
 * ============================================================
 *
 * PURPOSE:
 * Coordinates parallel execution of all GWS workers (Gmail,
 * Drive, Sheets, Calendar). Receives query plans from the
 * Listener Agent and runs applicable workers concurrently,
 * merging results into a single WorkerResults object for
 * the Analyser Agent. Also provides runFullScan() for the
 * async scanner to refresh workspace data on a schedule.
 *
 * DATA FLOW:
 * queries (from listener-agent or scanner)
 *   → fan out to gmail-worker, drive-worker, sheets-worker, calendar-worker (parallel)
 *   → merge standardized results
 *   → { gmail, drive, sheets, calendar }
 *   → analyser-agent.js or async scanner
 *
 * PROTOCOL REFERENCE: PROTOCOL.md section 3 (pipeline-status message)
 *
 * DEPENDENCIES:
 *   ./gmail-worker    — Gmail searches
 *   ./drive-worker    — Drive searches
 *   ./sheets-worker   — Sheets reads
 *   ./calendar-worker — Calendar lookups
 *   ../config         — ENABLE_CALENDAR_WORKER, ASYNC_* settings
 *   ../utils/logger   — structured logging
 * ============================================================
 */

'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const { searchEmails } = require('./gmail-worker');
const { searchDocs, searchDrive } = require('./drive-worker');
const { readSheet } = require('./sheets-worker');
const { searchCalendarEvents, getEvents } = require('./calendar-worker');

/**
 * runWorkers
 * Executes all relevant workers in parallel for a set of queries.
 * Supports both new standardized format { gmail, drive, sheets, calendar }
 * and legacy array format for backward compatibility.
 *
 * @param {object} queries - Worker-specific query plans
 *   New format: { gmail?: string|null, drive?: string|null, sheets?: string|null, calendar?: string|null }
 *   Legacy format: { gmail?: [{query, limit}], drive?: [{query, limit}], sheets?: [{fileId, range}], calendar?: {start, end, query} }
 * @param {Function} [onStatus] - Optional callback for pipeline-status updates
 * @returns {Promise<{gmail, drive, sheets, calendar}>} Aggregated standardized results
 */
async function runWorkers(queries, onStatus) {
  const workersActive = [];
  const promises = {};

  // Handle new standardized string format
  if (queries.gmail != null && typeof queries.gmail === 'string') {
    workersActive.push('gmail-worker');
    promises.gmail = searchEmails(queries.gmail);
  } else if (Array.isArray(queries.gmail) && queries.gmail.length > 0) {
    // Legacy array format
    workersActive.push('gmail-worker');
    const q = queries.gmail[0];
    promises.gmail = searchEmails(q.query || '', q.limit);
  }

  if (queries.drive != null && typeof queries.drive === 'string') {
    workersActive.push('drive-worker');
    promises.drive = searchDocs(queries.drive);
  } else if (Array.isArray(queries.drive) && queries.drive.length > 0) {
    workersActive.push('drive-worker');
    promises.drive = searchDrive(queries.drive);
  }

  if (queries.sheets != null && typeof queries.sheets === 'string') {
    workersActive.push('sheets-worker');
    promises.sheets = readSheet('mock', queries.sheets);
  } else if (Array.isArray(queries.sheets) && queries.sheets.length > 0) {
    workersActive.push('sheets-worker');
    promises.sheets = Promise.all(
      queries.sheets.map(q => readSheet(q.fileId || q.spreadsheetId || 'mock', q.range))
    );
  }

  if (queries.calendar != null && config.ENABLE_CALENDAR_WORKER) {
    if (typeof queries.calendar === 'string') {
      workersActive.push('calendar-worker');
      promises.calendar = searchCalendarEvents(queries.calendar);
    } else if (typeof queries.calendar === 'object') {
      workersActive.push('calendar-worker');
      promises.calendar = getEvents(queries.calendar);
    }
  }

  if (onStatus && workersActive.length > 0) {
    onStatus(workersActive);
  }

  const nullResult = (agent) => ({ agent, question: `${agent}: (skipped)`, answer: '', raw: [], error: null });

  const results = await Promise.allSettled(
    Object.entries(promises).map(async ([key, promise]) => ({ key, data: await promise }))
  );

  const workerResults = {
    gmail: nullResult('gmail'),
    drive: nullResult('drive'),
    sheets: nullResult('sheets'),
    calendar: nullResult('calendar'),
  };

  for (const result of results) {
    if (result.status === 'fulfilled') {
      workerResults[result.value.key] = result.value.data;
    } else {
      logger.warn('[worker-orchestrator] Worker failed', { reason: result.reason?.message });
    }
  }

  return workerResults;
}

/**
 * runFullScan
 * Executes all four workers with broad queries for async background scanning.
 * Used by scanner.js to refresh the workspace data store.
 *
 * @param {object} [options] - Optional scan options
 * @param {number} [options.emailLookbackHours] - Hours of email history to fetch
 * @param {number} [options.calendarDaysAhead] - Days ahead to fetch calendar events
 * @returns {Promise<{gmail, drive, sheets, calendar}>} Full workspace snapshot results
 */
async function runFullScan(options = {}) {
  const emailLookbackHours = options.emailLookbackHours || config.ASYNC_EMAIL_LOOKBACK_HOURS;
  const calendarDaysAhead = options.calendarDaysAhead || config.ASYNC_CALENDAR_LOOKAHEAD_DAYS;

  logger.info('[worker-orchestrator] runFullScan starting', { emailLookbackHours, calendarDaysAhead });

  const emailQuery = `newer_than:${emailLookbackHours}h`;
  const driveQuery = 'modified recently';
  const sheetsId = 'sheet-001'; // discount policy grid
  const calendarQuery = '';

  const [gmailResult, driveResult, sheetsResult, calendarResult] = await Promise.allSettled([
    searchEmails(emailQuery, config.ASYNC_MAX_EMAILS_PER_SCAN),
    searchDocs(driveQuery, { maxResults: 20 }),
    readSheet(sheetsId, 'Sheet1!A1:E10'),
    searchCalendarEvents(calendarQuery, { daysAhead: calendarDaysAhead }),
  ]);

  const safe = (settled, agent) => {
    if (settled.status === 'fulfilled') return settled.value;
    logger.warn(`[worker-orchestrator] ${agent} failed in full scan`, { reason: settled.reason?.message });
    return { agent, question: `${agent}: full scan`, answer: '', raw: [], error: settled.reason?.message || 'unknown' };
  };

  const results = {
    gmail: safe(gmailResult, 'gmail'),
    drive: safe(driveResult, 'drive'),
    sheets: safe(sheetsResult, 'sheets'),
    calendar: safe(calendarResult, 'calendar'),
  };

  logger.info('[worker-orchestrator] runFullScan complete', {
    gmailCount: results.gmail.raw?.length || 0,
    driveCount: results.drive.raw?.length || 0,
    sheetsOk: !results.sheets.error,
    calendarCount: results.calendar.raw?.length || 0,
  });

  return results;
}

module.exports = { runWorkers, runFullScan };
