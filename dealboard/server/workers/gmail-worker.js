/**
 * ============================================================
 * workers/gmail-worker.js — Gmail GWS Worker
 * ============================================================
 *
 * PURPOSE:
 * Searches Gmail via the GWS CLI skill for emails relevant to
 * the current meeting topic. Returns structured email results
 * that the Analyser Agent uses to build cards.
 *
 * DATA FLOW:
 * queries[] → gws-tools.js (gws gmail search)
 *   → raw JSON output
 *   → parsed EmailResult[]
 *   → worker-orchestrator.js
 *
 * PROTOCOL REFERENCE: skills/gws-gmail/SKILL.md
 *
 * DEPENDENCIES:
 *   ../tools/gws-tools — CLI execution
 *   ../config          — GWS_COMMAND_TIMEOUT_MS
 * ============================================================
 */

'use strict';

const config = require('../config');

// TODO: Import gws-tools when implemented
// const { runGwsCommand } = require('../tools/gws-tools');

/**
 * searchEmails
 * Searches Gmail using the provided query strings.
 *
 * @param {object[]} queries - Array of search query objects
 *   [{ query: string, limit: number }]
 * @returns {Promise<EmailResult[]>} Matching email results
 *   [{ id, subject, from, date, snippet, body }]
 *
 * @example
 * const results = await searchEmails([
 *   { query: 'subject:pricing TechVentures', limit: 5 }
 * ]);
 */
async function searchEmails(queries) {
  // TODO: For each query, call runGwsCommand('gmail search', { query, limit })
  // TODO: Parse and flatten results
  // TODO: Handle auth errors and timeouts gracefully

  console.log('[gmail-worker] searchEmails called — TODO: implement', { queries });
  return [];
}

module.exports = { searchEmails };
