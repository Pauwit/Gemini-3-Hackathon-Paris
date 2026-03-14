/**
 * workspace-service.js — Google Workspace sub-agents.
 * Each function is an independent agent that fetches data from one source.
 * They are called selectively by the orchestrator in chat-routes.js.
 */

const { google } = require('googleapis');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Creates authenticated Google API clients from the user's session tokens.
 */
function createGoogleClients(user) {
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

/**
 * Decodes a base64url-encoded Gmail message body.
 */
function decodeBase64(data) {
  if (!data) return '';
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Extracts plain text from a Gmail message payload recursively.
 */
function extractMessageText(payload, maxLen = 500) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data).slice(0, maxLen);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractMessageText(part, maxLen);
      if (text) return text;
    }
  }
  return '';
}

/**
 * Gmail sub-agent.
 * Searches emails by keyword. If query is "in:inbox" or empty, returns the most recent emails.
 *
 * @param {object} gmail - authenticated Gmail client
 * @param {string} query - search query (keywords or Gmail search syntax)
 */
async function gmailAgent(gmail, query) {
  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query || 'in:inbox',
      maxResults: 5,
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
          id: msg.id,
          subject: get('Subject'),
          from: get('From'),
          date: get('Date'),
          snippet: msg.snippet || '',
          body: extractMessageText(msg.payload),
        };
      });
  } catch (err) {
    logger.error('Gmail agent error:', err.message);
    return [];
  }
}

/**
 * Drive sub-agent.
 * Searches files by keyword and reads Google Docs content.
 *
 * @param {object} drive - authenticated Drive client
 * @param {string} query - keyword to search
 */
async function driveAgent(drive, query) {
  try {
    // Sanitize query: remove quotes and special chars that break the Drive API
    const safe = query.replace(/['"\\]/g, '').trim();
    const firstWord = safe.split(' ')[0];

    // Search both by file name and full text content
    const driveQuery = `(name contains '${firstWord}' or fullText contains '${firstWord}') and trashed = false`;
    logger.debug(`Drive query: ${driveQuery}`);

    const listRes = await drive.files.list({
      q: driveQuery,
      pageSize: 10,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    });

    const files = listRes.data.files || [];
    const results = [];

    for (const file of files.slice(0, 3)) {
      let content = '';
      if (file.mimeType === 'application/vnd.google-apps.document') {
        try {
          const exportRes = await drive.files.export({ fileId: file.id, mimeType: 'text/plain' });
          content = (exportRes.data || '').toString().slice(0, 800);
        } catch (exportErr) {
          logger.warn(`Could not export file ${file.name}:`, exportErr.message);
        }
      }
      results.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        link: file.webViewLink,
        content,
      });
    }

    return results;
  } catch (err) {
    logger.error('Drive agent error:', err.message, err.response?.data || '');
    return [];
  }
}

/**
 * Calendar sub-agent.
 * If a query is provided, searches by keyword across the past year + next year.
 * Otherwise fetches upcoming events for the next 7 days.
 *
 * @param {object} calendar - authenticated Calendar client
 * @param {string|true} query - search keyword or true for upcoming events only
 */
async function calendarAgent(calendar, query) {
  try {
    const hasKeyword = typeof query === 'string' && query.trim().length > 0;

    const params = {
      calendarId: 'primary',
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (hasKeyword) {
      // Search across past year and next year
      params.q = query;
      params.timeMin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      params.timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      logger.debug(`Calendar keyword search: "${query}" from ${params.timeMin} to ${params.timeMax}`);
    } else {
      // Default: upcoming 7 days
      params.timeMin = new Date().toISOString();
      params.timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    const res = await calendar.events.list(params);
    logger.debug(`Calendar results: ${(res.data.items || []).length} events`);

    return (res.data.items || []).map(event => ({
      id: event.id,
      summary: event.summary || '(No title)',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      attendees: (event.attendees || []).map(a => a.email).join(', '),
      description: (event.description || '').slice(0, 200),
      location: event.location || '',
    }));
  } catch (err) {
    logger.error('Calendar agent error:', err.message);
    return [];
  }
}

module.exports = { createGoogleClients, gmailAgent, driveAgent, calendarAgent };
