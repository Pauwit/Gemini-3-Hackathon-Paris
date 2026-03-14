/**
 * ============================================================
 * async/data-store.js — Central In-Memory Store with JSON Persistence
 * ============================================================
 *
 * PURPOSE:
 * Single source of truth for all workspace data, meeting history,
 * AI-generated insights, and chat history. Maintains data in memory
 * for fast access and persists to disk as a JSON file so data
 * survives server restarts. All async modules read/write through here.
 *
 * STORE STRUCTURE:
 *   workspace: { emails, documents, sheets, calendar, lastScanTime }
 *   meetings:  [{ id, title, startedAt, ... }]
 *   insights:  { peopleBriefings, projectUpdates, strategicAdvice, lastGeneratedAt }
 *   chat:      [{ role, content, timestamp }]
 *   meta:      { createdAt, lastUpdatedAt, totalScans }
 *
 * DATA FLOW:
 * scanner → updateEmails/updateDocuments/updateCalendar
 * insight-generator → updateInsights
 * chat-handler → pushChatMessage / getChatHistory
 * routes → getInsights / getWorkspace / getMeeting
 *
 * PROTOCOL REFERENCE: N/A
 *
 * DEPENDENCIES:
 *   fs, path (Node built-ins)
 *   ../config — DATA_STORE_PATH
 *   ../utils/logger — structured logging
 * ============================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// ── In-memory store ──────────────────────────────────────────

let store = {
  workspace: {
    emails: [],
    documents: [],
    sheets: [],
    calendar: [],
    lastScanTime: null,
  },
  meetings: [],
  insights: {
    peopleBriefings: [],
    projectUpdates: [],
    strategicAdvice: [],
    lastGeneratedAt: null,
  },
  chat: [],
  meta: {
    createdAt: null,
    lastUpdatedAt: null,
    totalScans: 0,
  },
};

/**
 * getStorePath — resolves absolute path for the JSON persistence file
 * @returns {string}
 */
function getStorePath() {
  const storePath = config.DATA_STORE_PATH || './data/store.json';
  return path.isAbsolute(storePath) ? storePath : path.resolve(process.cwd(), storePath);
}

/**
 * initialize — loads existing store from disk if present, otherwise creates fresh
 * @returns {Promise<void>}
 */
async function initialize() {
  const storePath = getStorePath();
  try {
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, 'utf-8');
      const loaded = JSON.parse(raw);
      // Merge loaded data with default structure to handle schema additions
      store = {
        workspace: { ...store.workspace, ...loaded.workspace },
        meetings: loaded.meetings || [],
        insights: { ...store.insights, ...loaded.insights },
        chat: loaded.chat || [],
        meta: { ...store.meta, ...loaded.meta },
      };
      logger.info('[data-store] Loaded from disk', { path: storePath });
    } else {
      store.meta.createdAt = new Date().toISOString();
      store.meta.lastUpdatedAt = new Date().toISOString();
      logger.info('[data-store] Initialized fresh store', { path: storePath });
    }
  } catch (err) {
    logger.warn('[data-store] Failed to load from disk — starting fresh', { error: err.message });
    store.meta.createdAt = new Date().toISOString();
    store.meta.lastUpdatedAt = new Date().toISOString();
  }
}

/**
 * saveToDisk — persists current store state to DATA_STORE_PATH
 * Creates parent directories if they don't exist.
 * @returns {Promise<void>}
 */
async function saveToDisk() {
  const storePath = getStorePath();
  try {
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    store.meta.lastUpdatedAt = new Date().toISOString();
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
    logger.info('[data-store] Saved to disk', { path: storePath });
  } catch (err) {
    logger.error('[data-store] Failed to save to disk', { error: err.message });
  }
}

// ── Workspace updates ────────────────────────────────────────

/**
 * updateEmails — replaces the email list in the workspace
 * @param {object[]} emails - Array of email objects
 */
function updateEmails(emails) {
  store.workspace.emails = Array.isArray(emails) ? emails : [];
  store.workspace.lastScanTime = new Date().toISOString();
}

/**
 * updateDocuments — replaces the documents list in the workspace
 * @param {object[]} docs - Array of document objects
 */
function updateDocuments(docs) {
  store.workspace.documents = Array.isArray(docs) ? docs : [];
}

/**
 * updateSheets — replaces the sheets data in the workspace
 * @param {object} sheetsData - Sheet data object or array
 */
function updateSheets(sheetsData) {
  store.workspace.sheets = sheetsData ? [sheetsData] : [];
}

/**
 * updateCalendar — replaces the calendar events in the workspace
 * @param {object[]} events - Array of calendar event objects
 */
function updateCalendar(events) {
  store.workspace.calendar = Array.isArray(events) ? events : [];
}

/**
 * getWorkspace — returns the full workspace snapshot
 * @returns {object} { emails, documents, sheets, calendar, lastScanTime }
 */
function getWorkspace() {
  return store.workspace;
}

// ── Meetings ─────────────────────────────────────────────────

/**
 * getMeetingsList — returns all meetings sorted by most recent first
 * @returns {object[]}
 */
function getMeetingsList() {
  return [...store.meetings].sort((a, b) => {
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return tb - ta;
  });
}

/**
 * getMeeting — retrieves a single meeting by ID
 * @param {string} id - Meeting ID
 * @returns {object|null}
 */
function getMeeting(id) {
  return store.meetings.find(m => m.id === id) || null;
}

/**
 * saveMeeting — upserts a meeting record (insert or update by id)
 * @param {object} meeting - Meeting object with at least { id }
 */
function saveMeeting(meeting) {
  if (!meeting || !meeting.id) {
    logger.warn('[data-store] saveMeeting called without id');
    return;
  }
  const idx = store.meetings.findIndex(m => m.id === meeting.id);
  if (idx >= 0) {
    store.meetings[idx] = { ...store.meetings[idx], ...meeting };
  } else {
    store.meetings.push(meeting);
  }
}

// ── Insights ─────────────────────────────────────────────────

/**
 * updateInsights — replaces insights with new AI-generated data
 * @param {object} insights - { peopleBriefings, projectUpdates, strategicAdvice }
 */
function updateInsights(insights) {
  if (!insights) return;
  store.insights = {
    peopleBriefings: insights.peopleBriefings || [],
    projectUpdates: insights.projectUpdates || [],
    strategicAdvice: insights.strategicAdvice || [],
    lastGeneratedAt: insights.lastGeneratedAt || new Date().toISOString(),
  };
}

/**
 * getInsights — returns the current insights snapshot
 * @returns {object} { peopleBriefings, projectUpdates, strategicAdvice, lastGeneratedAt }
 */
function getInsights() {
  return store.insights;
}

// ── Chat history ──────────────────────────────────────────────

/**
 * pushChatMessage — appends a message to the chat history
 * @param {{ role: string, content: string, timestamp?: string }} msg
 */
function pushChatMessage(msg) {
  if (!msg || !msg.content) return;
  store.chat.push({
    role: msg.role || 'user',
    content: msg.content,
    timestamp: msg.timestamp || new Date().toISOString(),
  });
  // Keep last 200 messages to avoid unbounded growth
  if (store.chat.length > 200) {
    store.chat = store.chat.slice(-200);
  }
}

/**
 * getChatHistory — returns recent chat messages
 * @param {number} [limit=50] - Maximum number of messages to return (most recent first)
 * @returns {object[]}
 */
function getChatHistory(limit = 50) {
  return store.chat.slice(-limit);
}

// ── Meta ──────────────────────────────────────────────────────

/**
 * incrementScanCount — increments totalScans counter
 */
function incrementScanCount() {
  store.meta.totalScans = (store.meta.totalScans || 0) + 1;
}

/**
 * getFullStore — returns complete store snapshot (for debugging)
 * @returns {object}
 */
function getFullStore() {
  return store;
}

module.exports = {
  initialize,
  saveToDisk,
  updateEmails,
  updateDocuments,
  updateSheets,
  updateCalendar,
  getWorkspace,
  getMeetingsList,
  getMeeting,
  saveMeeting,
  updateInsights,
  getInsights,
  pushChatMessage,
  getChatHistory,
  incrementScanCount,
  getFullStore,
};
