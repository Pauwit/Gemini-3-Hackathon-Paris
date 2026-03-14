/**
 * ============================================================
 * tools/google-auth.js — Shared Google API Authentication
 * ============================================================
 *
 * PURPOSE:
 * Creates and exports pre-authenticated Google API clients for
 * Gmail, Drive, Sheets, and Calendar. All workers import from
 * here instead of creating their own auth clients.
 *
 * MOCK MODE:
 * When USE_MOCK=true or GOOGLE_REFRESH_TOKEN is not set, exports
 * null clients. Workers must check for null and use mock data.
 *
 * DATA FLOW:
 * config (OAuth credentials) → googleapis OAuth2Client
 *   → pre-authenticated clients → workers
 *
 * PROTOCOL REFERENCE: N/A
 *
 * DEPENDENCIES:
 *   googleapis — Google API Node.js client
 *   ../config  — GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 * ============================================================
 */

'use strict';

const config = require('../config');
const logger = require('../utils/logger');

let gmail = null;
let drive = null;
let sheets = null;
let calendar = null;

if (!config.USE_MOCK && config.GOOGLE_REFRESH_TOKEN) {
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
    auth.setCredentials({ refresh_token: config.GOOGLE_REFRESH_TOKEN });

    gmail = google.gmail({ version: 'v1', auth });
    drive = google.drive({ version: 'v3', auth });
    sheets = google.sheets({ version: 'v4', auth });
    calendar = google.calendar({ version: 'v3', auth });

    logger.info('[google-auth] Google API clients initialized');
  } catch (err) {
    logger.warn('[google-auth] Failed to initialize Google API clients — falling back to mock', { error: err.message });
  }
} else {
  logger.warn('[google-auth] Running without Google API credentials — USE_MOCK mode or missing GOOGLE_REFRESH_TOKEN');
}

module.exports = { gmail, drive, sheets, calendar };
