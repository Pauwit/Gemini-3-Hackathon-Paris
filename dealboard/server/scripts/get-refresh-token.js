/**
 * get-refresh-token.js — One-time OAuth2 authorization script
 *
 * Run once to get a Google refresh token. Spins up a local HTTP server
 * on port 9999 to catch the OAuth callback, then prints the refresh token
 * to add to your .env file.
 *
 * Usage: node scripts/get-refresh-token.js
 */

'use strict';

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

const authUrl = auth.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

// Spin up a local server to catch the redirect
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (!parsed.query.code) {
    res.end('No code found.');
    return;
  }

  const code = parsed.query.code;

  try {
    const { tokens } = await auth.getToken(code);

    res.end('<h2>Success! You can close this tab.</h2>');
    server.close();

    console.log('\n✅  Authorization successful!\n');
    console.log('Add this line to your server/.env:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nThen set USE_MOCK=false and restart the server.');
    process.exit(0);
  } catch (err) {
    res.end('Error: ' + err.message);
    console.error('Token exchange failed:', err.message);
    process.exit(1);
  }
});

server.listen(9999, () => {
  console.log('Opening browser for Google authorization...\n');
  console.log('If it does not open automatically, paste this URL in your browser:\n');
  console.log(authUrl);
  console.log('\nWaiting for authorization...');

  // Try to open browser automatically
  const { exec } = require('child_process');
  const platform = process.platform;
  const cmd = platform === 'win32' ? `start ""  "${authUrl}"`
    : platform === 'darwin' ? `open "${authUrl}"`
    : `xdg-open "${authUrl}"`;
  exec(cmd);
});
