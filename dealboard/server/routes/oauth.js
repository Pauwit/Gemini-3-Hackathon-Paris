'use strict';

const express = require('express');
const router  = express.Router();
const { google } = require('googleapis');
const config  = require('../config');
const logger  = require('../utils/logger');
const dataStore = require('../async/data-store');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI,
  );
}

// Redirect URI must match what's registered in Google Cloud Console
// AND what the server actually listens on
const REDIRECT_URI = 'http://localhost:3001/auth/callback';

/**
 * GET /auth/google
 * Redirects the user to Google's OAuth consent screen.
 */
router.get('/google', (req, res) => {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth not configured (missing CLIENT_ID or CLIENT_SECRET)' });
  }

  const oauth2Client = makeOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  logger.info('[oauth] Redirecting to Google consent screen');
  res.redirect(authUrl);
});

/**
 * GET /auth/callback
 * Handles the OAuth callback from Google.
 * Exchanges the code for tokens, reinitializes Google clients,
 * saves the refresh token, then redirects back to the frontend.
 */
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    logger.warn('[oauth] User denied access or error returned', { error });
    return res.redirect(`${FRONTEND_URL}/auth?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/auth?error=no_code`);
  }

  try {
    const oauth2Client = makeOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      logger.warn('[oauth] No refresh_token — user may have already authorized. Revoke at myaccount.google.com/permissions');
    }

    // Fetch user profile
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    logger.info('[oauth] OAuth success', { email: userInfo.email });

    // Reinitialize all Google API clients with real credentials
    const { reinitialize } = require('../tools/google-auth');
    reinitialize(tokens.refresh_token || tokens.access_token, {
      email: userInfo.email,
      name:  userInfo.name,
    });

    // Disable mock mode at runtime
    config.USE_MOCK = false;

    // Persist refresh token in data store so it survives restarts
    if (tokens.refresh_token) {
      const store = dataStore.getFullStore();
      store.googleRefreshToken = tokens.refresh_token;
      store.googleUser = { email: userInfo.email, name: userInfo.name };
      await dataStore.saveToDisk();
    }

    // Trigger an immediate workspace scan with real data
    const scanner = require('../async/scanner');
    scanner.runScanCycle().catch(() => {});

    // Redirect back to frontend with user info
    const params = new URLSearchParams({
      auth:   'true',
      name:   userInfo.name  || '',
      email:  userInfo.email || '',
      avatar: userInfo.picture || '',
    });
    res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);

  } catch (err) {
    logger.error('[oauth] Token exchange failed', { error: err.message });
    res.redirect(`${FRONTEND_URL}/auth?error=${encodeURIComponent(err.message)}`);
  }
});

module.exports = router;
