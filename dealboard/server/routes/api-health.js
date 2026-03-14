/**
 * ============================================================
 * routes/api-health.js — Health Check Endpoint
 * ============================================================
 *
 * PURPOSE:
 * Returns server health, version, and feature flag status.
 * Used by frontend to verify backend is reachable and discover
 * which features are enabled.
 *
 * DATA FLOW:
 * GET /api/health → config → JSON response
 *
 * PROTOCOL REFERENCE: PROTOCOL.md section 4
 *   GET /api/health → { success, version, mode, features }
 *
 * DEPENDENCIES:
 *   express     — router
 *   ../config   — feature flags and mode
 * ============================================================
 */

'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');

/**
 * GET /api/health
 * Returns server status, version, and enabled features.
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    version: '1.0',
    mode: config.MODE,
    timestamp: new Date().toISOString(),
    features: {
      vision: true,
      memory: config.ENABLE_MEMORY_AGENT,
      strategyAgent: config.ENABLE_STRATEGY_AGENT,
    },
  });
});

module.exports = router;
