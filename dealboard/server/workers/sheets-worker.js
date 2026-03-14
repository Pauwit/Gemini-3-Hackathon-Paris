/**
 * ============================================================
 * workers/sheets-worker.js — Google Sheets GWS Worker
 * ============================================================
 *
 * PURPOSE:
 * Reads structured data from Google Sheets — pricing tables,
 * CRM data, discount rules, competitor comparisons — and
 * returns it in a usable format for the Analyser Agent.
 *
 * DATA FLOW:
 * fileId + range → gws-tools.js (gws sheets read)
 *   → raw JSON output
 *   → parsed SheetData
 *   → worker-orchestrator.js
 *
 * PROTOCOL REFERENCE: skills/gws-sheets-read/SKILL.md
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
 * readSheet
 * Reads a range of cells from a Google Sheet.
 *
 * @param {string} fileId - Google Sheets file ID
 * @param {string} range - Cell range in A1 notation (e.g. 'Sheet1!A1:D20')
 * @returns {Promise<SheetData>} Sheet contents
 *   { values: string[][], range: string }
 *
 * @example
 * const data = await readSheet('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', 'Pricing!A1:F50');
 * // data.values[0] → ['Plan', 'Price/mo', 'Hosts', 'Metrics', ...]
 */
async function readSheet(fileId, range) {
  // TODO: Call runGwsCommand('sheets read', { id: fileId, range })
  // TODO: Parse JSON output into SheetData structure

  console.log('[sheets-worker] readSheet called — TODO: implement', { fileId, range });
  return { values: [], range };
}

module.exports = { readSheet };
