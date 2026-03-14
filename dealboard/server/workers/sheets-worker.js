/**
 * ============================================================
 * workers/sheets-worker.js — Google Sheets Worker
 * ============================================================
 *
 * PURPOSE:
 * Reads structured data from Google Sheets — pricing tables,
 * discount rules, competitor comparisons. Returns standardized
 * result objects for the Analyser Agent.
 * In mock mode, returns the first sheet entry from mock-workspace.json.
 * In live mode, uses the Sheets API via google-auth.js.
 *
 * STANDARD RETURN FORMAT:
 * { agent, question, answer, raw, error }
 *
 * DATA FLOW:
 * spreadsheetId + range → [mock data | Sheets API] → standardized result
 *
 * PROTOCOL REFERENCE: N/A (internal worker)
 *
 * DEPENDENCIES:
 *   ../tools/google-auth — pre-authenticated Sheets client
 *   ../config            — USE_MOCK
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
 * formatSheetValues — converts 2D array of cell values into a readable string table
 * @param {string[][]} values - 2D array of cell values
 * @returns {string} Formatted table string
 */
function formatSheetValues(values) {
  if (!values || values.length === 0) return '(empty sheet)';
  return values.map(row => row.join(' | ')).join('\n');
}

/**
 * readSheet — reads a range of cells from a Google Sheet
 * @param {string} spreadsheetId - Google Sheets file ID (or 'mock' for mock mode)
 * @param {string} [range] - Cell range in A1 notation (e.g. 'Sheet1!A1:E10')
 * @returns {Promise<{agent: string, question: string, answer: string, raw: object, error: string|null}>}
 */
async function readSheet(spreadsheetId, range) {
  const question = `Sheets: ${spreadsheetId} ${range || ''}`.trim();

  try {
    if (config.USE_MOCK) {
      const mockData = getMockData();
      const sheets = mockData.sheets || [];

      // Find by ID or return first
      const sheet = sheets.find(s => s.id === spreadsheetId) || sheets[0];

      if (!sheet) {
        return { agent: 'sheets', question, answer: 'No sheet data in mock.', raw: null, error: null };
      }

      const answer = `Sheet: ${sheet.name}\n${formatSheetValues(sheet.values)}`;
      logger.info('[sheets-worker] Mock read complete', { spreadsheetId, sheetName: sheet.name });
      return { agent: 'sheets', question, answer, raw: sheet, error: null };
    }

    // Live mode — use Google Sheets API
    const { sheets } = require('../tools/google-auth');
    if (!sheets) {
      return { agent: 'sheets', question, answer: 'Sheets client not configured.', raw: null, error: 'NO_AUTH' };
    }

    const effectiveRange = range || 'Sheet1!A1:Z100';
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: effectiveRange,
    });

    const values = res.data.values || [];
    const answer = values.length > 0
      ? formatSheetValues(values)
      : 'Sheet is empty or range has no data.';

    const raw = { id: spreadsheetId, range: effectiveRange, values };
    logger.info('[sheets-worker] Live read complete', { spreadsheetId, rows: values.length });
    return { agent: 'sheets', question, answer, raw, error: null };

  } catch (err) {
    logger.error('[sheets-worker] readSheet failed', { error: err.message });
    return { agent: 'sheets', question, answer: '', raw: null, error: err.message };
  }
}

module.exports = { readSheet };
