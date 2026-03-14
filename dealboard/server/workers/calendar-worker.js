/**
 * ============================================================
 * workers/calendar-worker.js — Google Calendar GWS Worker
 * ============================================================
 *
 * PURPOSE:
 * Fetches relevant calendar events to provide meeting context:
 * past interactions with the prospect, upcoming follow-ups,
 * and attendee schedules. Enabled via ENABLE_CALENDAR_WORKER flag.
 *
 * DATA FLOW:
 * timeRange → gws-tools.js (gws calendar list)
 *   → raw JSON output
 *   → parsed CalendarEvent[]
 *   → worker-orchestrator.js
 *
 * PROTOCOL REFERENCE: N/A (internal worker)
 *
 * DEPENDENCIES:
 *   ../tools/gws-tools — CLI execution
 *   ../config          — GWS_COMMAND_TIMEOUT_MS, ENABLE_CALENDAR_WORKER
 * ============================================================
 */

'use strict';

const config = require('../config');

// TODO: Import gws-tools when implemented
// const { runGwsCommand } = require('../tools/gws-tools');

/**
 * getEvents
 * Retrieves calendar events within a time range.
 *
 * @param {object} timeRange - Time window to search
 *   { start: ISO8601 string, end: ISO8601 string, query?: string }
 * @returns {Promise<CalendarEvent[]>} Calendar events
 *   [{ id, title, start, end, attendees, description }]
 *
 * @example
 * const events = await getEvents({
 *   start: '2024-01-01T00:00:00Z',
 *   end: '2024-03-31T23:59:59Z',
 *   query: 'TechVentures'
 * });
 */
async function getEvents(timeRange) {
  if (!config.ENABLE_CALENDAR_WORKER) {
    console.log('[calendar-worker] Disabled via ENABLE_CALENDAR_WORKER flag');
    return [];
  }

  // TODO: Call runGwsCommand('calendar list', { start, end, query })
  // TODO: Parse and return CalendarEvent array

  console.log('[calendar-worker] getEvents called — TODO: implement', { timeRange });
  return [];
}

module.exports = { getEvents };
