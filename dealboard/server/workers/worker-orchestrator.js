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
 * the Analyser Agent.
 *
 * DATA FLOW:
 * queries[] (from listener-agent)
 *   → fan out to gmail-worker, drive-worker, sheets-worker, calendar-worker (parallel)
 *   → merge results
 *   → { gmail, drive, sheets, calendar }
 *   → analyser-agent.js
 *
 * PROTOCOL REFERENCE: PROTOCOL.md section 3 (pipeline-status message)
 *
 * DEPENDENCIES:
 *   ./gmail-worker    — Gmail searches
 *   ./drive-worker    — Drive searches
 *   ./sheets-worker   — Sheets reads
 *   ./calendar-worker — Calendar lookups
 *   ../config         — ENABLE_CALENDAR_WORKER
 * ============================================================
 */

'use strict';

const config = require('../config');
const { searchEmails } = require('./gmail-worker');
const { searchDrive } = require('./drive-worker');
const { readSheet } = require('./sheets-worker');
const { getEvents } = require('./calendar-worker');

/**
 * runWorkers
 * Executes all relevant workers in parallel for a set of queries.
 *
 * @param {object} queries - Worker-specific query plans from listener-agent
 *   {
 *     gmail?: [{ query: string, limit: number }],
 *     drive?: [{ query: string, limit: number }],
 *     sheets?: [{ fileId: string, range: string }],
 *     calendar?: { start: string, end: string, query?: string }
 *   }
 * @param {Function} [onStatus] - Optional callback for pipeline-status updates
 *   Called with (workersActive: string[]) as workers start/finish
 * @returns {Promise<WorkerResults>} Aggregated results from all workers
 *   { gmail: EmailResult[], drive: DriveResult[], sheets: SheetData[], calendar: CalendarEvent[] }
 *
 * @example
 * const results = await runWorkers({
 *   gmail: [{ query: 'subject:pricing TechVentures', limit: 5 }],
 *   drive: [{ query: 'Datadog battlecard', limit: 3 }]
 * });
 */
async function runWorkers(queries, onStatus) {
  const workersActive = [];
  const promises = {};

  // Determine which workers to run
  if (queries.gmail?.length) {
    workersActive.push('gmail-worker');
    promises.gmail = searchEmails(queries.gmail);
  }
  if (queries.drive?.length) {
    workersActive.push('drive-worker');
    promises.drive = searchDrive(queries.drive);
  }
  if (queries.sheets?.length) {
    workersActive.push('sheets-worker');
    promises.sheets = Promise.all(queries.sheets.map(q => readSheet(q.fileId, q.range)));
  }
  if (queries.calendar && config.ENABLE_CALENDAR_WORKER) {
    workersActive.push('calendar-worker');
    promises.calendar = getEvents(queries.calendar);
  }

  // Notify caller which workers are active
  if (onStatus && workersActive.length > 0) {
    onStatus(workersActive);
  }

  // TODO: Run all workers concurrently with timeout + error isolation
  // TODO: Each worker failure should return [] not throw, to allow partial results

  const results = await Promise.allSettled(
    Object.entries(promises).map(async ([key, promise]) => ({ key, data: await promise }))
  );

  const workerResults = { gmail: [], drive: [], sheets: [], calendar: [] };
  for (const result of results) {
    if (result.status === 'fulfilled') {
      workerResults[result.value.key] = result.value.data;
    } else {
      console.warn('[worker-orchestrator] Worker failed:', result.reason);
    }
  }

  return workerResults;
}

module.exports = { runWorkers };
