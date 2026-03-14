/**
 * get-google-token.js
 *
 * One-time script to get a Google OAuth refresh token.
 * Run: node get-google-token.js
 *
 * It will:
 * 1. Print an authorization URL → open it in your browser
 * 2. Start a local server on port 9999 to catch the callback
 * 3. Exchange the code for tokens
 * 4. Print the GOOGLE_REFRESH_TOKEN to add to your .env
 */

'use strict';

require('dotenv').config();

const http    = require('http');
const { google } = require('googleapis');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:9999/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Scopes needed for Gmail, Drive, Calendar, Sheets
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // forces refresh_token to be returned
});

console.log('\n📋  Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n⏳  Waiting for callback on http://localhost:9999/oauth2callback...\n');

// Start local server to catch the OAuth callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:9999');

  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('No code in callback');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2>✅ Success! You can close this tab and go back to the terminal.</h2>');

    console.log('\n✅  Tokens received!\n');
    console.log('Add this to your server/.env:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`\nAlso set:\nUSE_MOCK=false\n`);

    if (!tokens.refresh_token) {
      console.warn('\n⚠️  No refresh_token in response.');
      console.warn('   This happens if the account already authorized this app.');
      console.warn('   Go to https://myaccount.google.com/permissions, revoke DealBoard, then run this script again.\n');
    }

  } catch (err) {
    res.writeHead(500);
    res.end('Error exchanging code: ' + err.message);
    console.error('❌  Error:', err.message);
  }

  server.close();
});

server.listen(9999, () => {
  // server is ready
});
