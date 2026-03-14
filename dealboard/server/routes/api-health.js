/**
 * ============================================================
 * routes/api-health.js — Health Check Endpoint
 * ============================================================
 *
 * PURPOSE:
 * Returns server health, version, and feature flag status.
 * Used by frontend to verify backend is reachable and discover
 * which features are enabled. Response format follows PROTOCOL.md.
 *
 * DATA FLOW:
 * GET /api/health → config → JSON response
 *
 * PROTOCOL REFERENCE: PROTOCOL.md section 4
 *   GET /api/health → { success, data: { status, mode, useMock, features, uptime } }
 *
 * DEPENDENCIES:
 *   express   — router
 *   ../config — feature flags and mode
 * ============================================================
 */

'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');

/** Server start time for uptime calculation */
const startTime = Date.now();

/**
 * GET /api/health
 * Returns server status, mode, feature flags, and uptime in seconds.
 */
router.get('/', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      mode: config.MODE,
      useMock: config.USE_MOCK,
      features: {
        visionAgent: true,
        strategyAgent: config.ENABLE_STRATEGY_AGENT,
        memoryAgent: config.ENABLE_MEMORY_AGENT,
        calendarWorker: config.ENABLE_CALENDAR_WORKER,
        asyncScanner: config.ENABLE_ASYNC_SCANNER,
        chat: config.ENABLE_CHAT,
      },
      uptime: uptimeSeconds,
    },
  });
});

module.exports = router;
