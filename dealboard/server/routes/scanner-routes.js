/**
 * scanner-routes.js — Manual scan trigger endpoint.
 */

const express = require('express');
const { runScan } = require('../services/scanner-service');
const dataStore = require('../services/data-store');
const logger = require('../utils/logger');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  next();
}

// POST /api/scanner/trigger
router.post('/api/scanner/trigger', requireAuth, async (req, res) => {
  const user = req.session.user;

  if (!user.geminiApiKey) {
    return res.status(400).json({
      success: false,
      error: 'Gemini API key not set. Please add it in Settings first.',
    });
  }

  // Store active user with latest tokens for scheduled scans
  dataStore.setActiveUser(user);

  try {
    await runScan(user);
    res.json({
      success: true,
      data: { message: 'Scan complete', lastScanTime: dataStore.getLastScanTime() },
    });
  } catch (err) {
    logger.error('Manual scan failed:', err.message);
    res.status(500).json({ success: false, error: 'Scan failed: ' + err.message });
  }
});

module.exports = router;
