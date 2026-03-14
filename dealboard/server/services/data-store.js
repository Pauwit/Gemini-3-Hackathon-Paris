/**
 * data-store.js — In-memory store with JSON persistence.
 * Holds workspace snapshot, generated insights, last scan time, and active user tokens.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DATA_DIR = path.join(__dirname, '../../../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

let store = {
  workspace: null,
  insights: null,
  lastScanTime: null,
  activeUser: null, // { accessToken, refreshToken, email, geminiApiKey }
};

function getInsights() { return store.insights; }
function getWorkspace() { return store.workspace; }
function getLastScanTime() { return store.lastScanTime; }
function getActiveUser() { return store.activeUser; }

function setActiveUser(user) {
  store.activeUser = {
    accessToken: user.accessToken,
    refreshToken: user.refreshToken,
    email: user.email,
    geminiApiKey: user.geminiApiKey || null,
  };
  logger.debug(`Active user updated: ${user.email}`);
}

function updateFromScan(workspace, insights) {
  store.workspace = workspace;
  store.insights = insights;
  store.lastScanTime = new Date().toISOString();
  saveToDisk();
}

function saveToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
    logger.debug('Store saved to disk');
  } catch (err) {
    logger.error('Failed to save store:', err.message);
  }
}

function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      // Restore workspace/insights/lastScanTime but not activeUser (tokens may be stale)
      store.workspace = data.workspace || null;
      store.insights = data.insights || null;
      store.lastScanTime = data.lastScanTime || null;
      logger.info('Store loaded from disk');
    }
  } catch (err) {
    logger.error('Failed to load store:', err.message);
  }
}

module.exports = {
  getInsights,
  getWorkspace,
  getLastScanTime,
  getActiveUser,
  setActiveUser,
  updateFromScan,
  saveToDisk,
  loadFromDisk,
};
