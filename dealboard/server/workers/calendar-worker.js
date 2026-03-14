/**
 * ============================================================
 * workers/calendar-worker.js — Google Calendar Worker
 * ============================================================
 *
 * PURPOSE:
 * Fetches relevant calendar events to provide meeting context:
 * upcoming demos, follow-ups, and pipeline review deadlines.
 * Returns standardized result objects for the Analyser Agent.
 * In mock mode, returns events from mock-workspace.json filtered by date.
 * In live mode, uses the Calendar API via google-auth.js.
 *
 * STANDARD RETURN FORMAT:
 * { agent, question, answer, raw, error }
 *
 * DATA FLOW:
 * query + options → [mock filter | Calendar API] → standardized result
 *
 * PROTOCOL REFERENCE: N/A (internal worker)
 *
 * DEPENDENCIES:
 *   ../tools/google-auth — pre-authenticated Calendar client
 *   ../config            — USE_MOCK, ENABLE_CALENDAR_WORKER, ASYNC_CALENDAR_LOOKAHEAD_DAYS
 *   ../utils/logger      — structured logging
 * ============================================================
 */

'use strict';

const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * getMockData — loads mock workspace data (cached by Node require)
 * @returns {object} Parsed mock-workspace.json
 */
function getMockData() {
  return require(path.join(__dirname, '..', 'mock-data', 'mock-workspace.json'));
}

/**
 * searchCalendarEvents — fetches calendar events matching a query and date window
 * @param {string} query - Search keywords to filter events by title/description
 * @param {object} [options] - Optional filter options
 * @param {number} [options.daysAhead] - Number of days ahead to look (default: ASYNC_CALENDAR_LOOKAHEAD_DAYS)
 * @param {string} [options.timeMin] - ISO8601 start time (overrides daysAhead)
 * @param {string} [options.timeMax] - ISO8601 end time
 * @returns {Promise<{agent: string, question: string, answer: string, raw: array, error: string|null}>}
 */
async function searchCalendarEvents(query, options = {}) {
  const question = `Calendar: ${query || 'upcoming events'}`;

  if (!config.ENABLE_CALENDAR_WORKER) {
    logger.info('[calendar-worker] Disabled via ENABLE_CALENDAR_WORKER flag');
    return { agent: 'calendar', question, answer: 'Calendar worker is disabled.', raw: [], error: null };
  }

  try {
    const daysAhead = options.daysAhead || config.ASYNC_CALENDAR_LOOKAHEAD_DAYS;
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const timeMin = options.timeMin ? new Date(options.timeMin) : now;
    const timeMax = options.timeMax ? new Date(options.timeMax) : futureDate;

    if (config.USE_MOCK) {
      const mockData = getMockData();
      const keywords = (query || '').toLowerCase().split(/\s+/).filter(k => k.length > 1);

      const filtered = (mockData.calendar || []).filter(event => {
        const eventStart = new Date(event.start);
        const withinWindow = eventStart >= timeMin && eventStart <= timeMax;

        if (keywords.length === 0) return withinWindow;

        const text = `${event.title} ${event.description || ''}`.toLowerCase();
        return withinWindow && keywords.some(k => text.includes(k));
      });

      const answer = filtered.length > 0
        ? filtered.map(e => `[${e.start}] ${e.title} — ${(e.description || '').substring(0, 100)}`).join('\n')
        : `No calendar events found in the next ${daysAhead} days.`;

      logger.info('[calendar-worker] Mock search complete', { query, found: filtered.length });
      return { agent: 'calendar', question, answer, raw: filtered, error: null };
    }

    // Live mode — use Google Calendar API
    const { calendar } = require('../tools/google-auth');
    if (!calendar) {
      return { agent: 'calendar', question, answer: 'Calendar client not configured.', raw: [], error: 'NO_AUTH' };
    }

    const listParams = {
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 20,
    };
    if (query) listParams.q = query;

    const res = await calendar.events.list(listParams);
    const items = res.data.items || [];

    const events = items.map(item => ({
      id: item.id,
      title: item.summary || '(no title)',
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      attendees: (item.attendees || []).map(a => a.email),
      description: (item.description || '').substring(0, 500),
      location: item.location || '',
    }));

    const answer = events.length > 0
      ? events.map(e => `[${e.start}] ${e.title} — ${e.description.substring(0, 100)}`).join('\n')
      : `No calendar events found in the next ${daysAhead} days.`;

    logger.info('[calendar-worker] Live search complete', { query, found: events.length });
    return { agent: 'calendar', question, answer, raw: events, error: null };

  } catch (err) {
    logger.error('[calendar-worker] searchCalendarEvents failed', { error: err.message });
    return { agent: 'calendar', question, answer: '', raw: [], error: err.message };
  }
}

/**
 * getEvents — legacy alias for backward compatibility with worker-orchestrator
 * @param {object} timeRange - { start, end, query }
 * @returns {Promise<{agent, question, answer, raw, error}>}
 */
async function getEvents(timeRange) {
  if (!config.ENABLE_CALENDAR_WORKER) {
    logger.info('[calendar-worker] Disabled via ENABLE_CALENDAR_WORKER flag');
    return { agent: 'calendar', question: 'Calendar: (disabled)', answer: 'Calendar worker is disabled.', raw: [], error: null };
  }
  return searchCalendarEvents(timeRange.query || '', {
    timeMin: timeRange.start,
    timeMax: timeRange.end,
  });
}

module.exports = { searchCalendarEvents, getEvents };
