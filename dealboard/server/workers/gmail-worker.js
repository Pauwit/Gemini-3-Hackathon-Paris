/**
 * ============================================================
 * workers/gmail-worker.js — Gmail Worker
 * ============================================================
 *
 * PURPOSE:
 * Searches Gmail for emails relevant to current meeting context.
 * Returns a standardized result object for the Analyser Agent.
 * In mock mode, filters pre-loaded mock emails by keyword.
 * In live mode, uses the Gmail API via google-auth.js.
 *
 * STANDARD RETURN FORMAT:
 * { agent, question, answer, raw, error }
 *
 * DATA FLOW:
 * query → [mock filter | Gmail API] → standardized result
 *
 * PROTOCOL REFERENCE: N/A (internal worker)
 *
 * DEPENDENCIES:
 *   ../tools/google-auth — pre-authenticated Gmail client
 *   ../config            — USE_MOCK, ASYNC_MAX_EMAILS_PER_SCAN
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
 * searchEmails — searches Gmail for emails matching a query string
 * @param {string} query - Search keywords or Gmail query syntax
 * @param {number} [maxResults] - Maximum number of results to return
 * @returns {Promise<{agent: string, question: string, answer: string, raw: array, error: string|null}>}
 */
async function searchEmails(query, maxResults = config.ASYNC_MAX_EMAILS_PER_SCAN) {
  const question = `Gmail: ${query}`;

  try {
    if (config.USE_MOCK) {
      const mockData = getMockData();
      // Strip Gmail-specific operators (newer_than:, older_than:, from:, etc.)
      // to extract plain keywords for mock filtering
      const cleanedQuery = query
        .replace(/\b(newer_than|older_than|from|to|subject|in|label|has|filename|after|before):\S*/gi, '')
        .trim();
      const keywords = cleanedQuery.toLowerCase().split(/\s+/).filter(k => k.length > 1);

      const filtered = (mockData.emails || []).filter(email => {
        // If no meaningful keywords remain after stripping operators, return all emails
        if (keywords.length === 0) return true;
        const text = `${email.subject} ${email.body} ${email.snippet}`.toLowerCase();
        return keywords.some(k => text.includes(k));
      }).slice(0, maxResults);

      const answer = filtered.length > 0
        ? filtered.map(e => `[${e.date}] From: ${e.from} | Subject: ${e.subject} | ${e.snippet}`).join('\n')
        : 'No matching emails found in mock data.';

      logger.info('[gmail-worker] Mock search complete', { query, found: filtered.length });
      return { agent: 'gmail', question, answer, raw: filtered, error: null };
    }

    // Live mode — use Google Gmail API
    const { gmail } = require('../tools/google-auth');
    if (!gmail) {
      return { agent: 'gmail', question, answer: 'Gmail client not configured.', raw: [], error: 'NO_AUTH' };
    }

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messages = listRes.data.messages || [];
    const emails = [];

    for (const msg of messages.slice(0, 10)) {
      const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const headers = msgRes.data.payload?.headers || [];
      const getHeader = name => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      let body = '';
      const parts = msgRes.data.payload?.parts || [];
      const textPart = parts.find(p => p.mimeType === 'text/plain') || msgRes.data.payload;
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }

      emails.push({
        id: msg.id,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        date: getHeader('Date'),
        snippet: msgRes.data.snippet || '',
        body: body.substring(0, 2000),
      });
    }

    const answer = emails.length > 0
      ? emails.map(e => `[${e.date}] From: ${e.from} | Subject: ${e.subject} | ${e.snippet}`).join('\n')
      : 'No matching emails found.';

    logger.info('[gmail-worker] Live search complete', { query, found: emails.length });
    return { agent: 'gmail', question, answer, raw: emails, error: null };

  } catch (err) {
    logger.error('[gmail-worker] searchEmails failed', { error: err.message });
    return { agent: 'gmail', question, answer: '', raw: [], error: err.message };
  }
}

module.exports = { searchEmails };
