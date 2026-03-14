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

let gmail    = null;
let drive    = null;
let sheets   = null;
let calendar = null;
let _authedUser = null; // { email, name } of the connected user

/**
 * reinitialize — (re)initializes all Google API clients with a given refresh token.
 * Safe to call at runtime after OAuth callback.
 * @param {string} refreshToken
 * @param {{ email?: string, name?: string }} [userInfo]
 */
function reinitialize(refreshToken, userInfo = {}) {
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
    auth.setCredentials({ refresh_token: refreshToken });

    module.exports.gmail    = google.gmail({ version: 'v1', auth });
    module.exports.drive    = google.drive({ version: 'v3', auth });
    module.exports.sheets   = google.sheets({ version: 'v4', auth });
    module.exports.calendar = google.calendar({ version: 'v3', auth });
    module.exports._authedUser = userInfo;

    // Keep local vars in sync for the initial export
    gmail    = module.exports.gmail;
    drive    = module.exports.drive;
    sheets   = module.exports.sheets;
    calendar = module.exports.calendar;
    _authedUser = userInfo;

    logger.info('[google-auth] Google API clients (re)initialized', { email: userInfo.email });
  } catch (err) {
    logger.warn('[google-auth] Failed to (re)initialize Google API clients', { error: err.message });
  }
}

// Initialize on startup if credentials are already in env
if (!config.USE_MOCK && config.GOOGLE_REFRESH_TOKEN) {
  reinitialize(config.GOOGLE_REFRESH_TOKEN);
} else {
  logger.warn('[google-auth] Running without Google API credentials — USE_MOCK mode or missing GOOGLE_REFRESH_TOKEN');
}

module.exports = { gmail, drive, sheets, calendar, _authedUser, reinitialize };
