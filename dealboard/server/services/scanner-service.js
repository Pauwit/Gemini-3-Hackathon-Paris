/**
 * scanner-service.js — Background workspace scanner.
 * Periodically fetches data from Gmail, Drive, and Calendar,
 * then sends it to Gemini to generate insights.
 */

const { google } = require('googleapis');
const config = require('../config');
const { generateInsights } = require('./insight-service');
const dataStore = require('./data-store');
const logger = require('../utils/logger');

const SCAN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
let scanInterval = null;

function createClients(user) {
  const auth = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.callbackUrl
  );
  auth.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });
  return {
    gmail: google.gmail({ version: 'v1', auth }),
    drive: google.drive({ version: 'v3', auth }),
    calendar: google.calendar({ version: 'v3', auth }),
  };
}

async function fetchRecentEmails(gmail) {
  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:important newer_than:1d',
      maxResults: 10,
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) return [];

    const details = await Promise.allSettled(
      messages.map(m => gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' }))
    );

    return details
      .filter(r => r.status === 'fulfilled')
      .map(r => {
        const msg = r.value.data;
        const headers = msg.payload?.headers || [];
        const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
        return {
          subject: get('Subject'),
          from: get('From'),
          date: get('Date'),
          snippet: msg.snippet || '',
        };
      });
  } catch (err) {
    logger.error('Scanner Gmail error:', err.message);
    return [];
  }
}

async function fetchRecentDocs(drive) {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const listRes = await drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.document' and modifiedTime > '${yesterday}' and trashed = false`,
      pageSize: 5,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    });

    const files = listRes.data.files || [];
    const results = [];

    for (const file of files.slice(0, 3)) {
      let content = '';
      try {
        const exportRes = await drive.files.export({ fileId: file.id, mimeType: 'text/plain' });
        content = (exportRes.data || '').toString().slice(0, 600);
      } catch {
        // Non-exportable files are skipped silently
      }
      results.push({ name: file.name, modifiedTime: file.modifiedTime, link: file.webViewLink, content });
    }

    return results;
  } catch (err) {
    logger.error('Scanner Drive error:', err.message);
    return [];
  }
}

async function fetchUpcomingEvents(calendar) {
  try {
    const now = new Date().toISOString();
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now,
      timeMax: weekFromNow,
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (res.data.items || []).map(event => ({
      summary: event.summary || '(No title)',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      attendees: (event.attendees || []).map(a => a.email).join(', '),
      description: (event.description || '').slice(0, 200),
    }));
  } catch (err) {
    logger.error('Scanner Calendar error:', err.message);
    return [];
  }
}

async function runScan(user) {
  if (!user) {
    logger.warn('Scanner: no active user, skipping scan');
    return null;
  }

  logger.info(`Scanner: starting scan for ${user.email}`);

  const clients = createClients(user);

  const [emails, docs, events] = await Promise.all([
    fetchRecentEmails(clients.gmail),
    fetchRecentDocs(clients.drive),
    fetchUpcomingEvents(clients.calendar),
  ]);

  const workspace = { emails, docs, events };
  logger.info(`Scanner: fetched ${emails.length} emails, ${docs.length} docs, ${events.length} events`);

  const insights = await generateInsights(user.geminiApiKey, workspace);
  dataStore.updateFromScan(workspace, insights);

  logger.info('Scanner: scan complete');
  return insights;
}

function startScanner() {
  dataStore.loadFromDisk();
  logger.info('Scanner: initialized (auto-scan every 15 min when user is active)');

  scanInterval = setInterval(async () => {
    const user = dataStore.getActiveUser();
    if (user?.geminiApiKey) {
      await runScan(user).catch(err => logger.error('Scheduled scan failed:', err.message));
    }
  }, SCAN_INTERVAL_MS);
}

function stopScanner() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
}

module.exports = { startScanner, stopScanner, runScan };
