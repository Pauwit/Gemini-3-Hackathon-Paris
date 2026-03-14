/**
 * ============================================================
 * routes/api-insights.js — Insights, Workspace, and Chat REST API
 * ============================================================
 *
 * PURPOSE:
 * REST endpoints for reading AI-generated insights, browsing
 * workspace data, chatting with the AI assistant, and manually
 * triggering workspace scans. Consumed by the frontend dashboard.
 *
 * ENDPOINTS:
 *   GET  /api/insights            — all insights from data store
 *   GET  /api/insights/people     — people briefings only
 *   GET  /api/insights/projects   — project updates only
 *   GET  /api/insights/advice     — strategic advice only
 *   GET  /api/workspace           — current workspace snapshot
 *   POST /api/chat                — { message } → { answer, sources }
 *   POST /api/scanner/trigger     — manually trigger a scan cycle
 *
 * DATA FLOW:
 * Request → data-store / chat-handler / scanner → JSON response
 *
 * PROTOCOL REFERENCE: PROTOCOL.md section 4
 *
 * DEPENDENCIES:
 *   express         — router
 *   ../async/data-store    — getInsights, getWorkspace
 *   ../async/chat-handler  — handleChatMessage
 *   ../async/scanner       — runScanCycle
 *   ../utils/logger        — structured logging
 * ============================================================
 */

'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const dataStore = require('../async/data-store');
const { handleChatMessage } = require('../async/chat-handler');
const scanner = require('../async/scanner');

// ── Helper ────────────────────────────────────────────────────

/**
 * ok — sends a standard success JSON response
 * @param {object} res - Express response
 * @param {object} data - Response data
 * @param {number} [status=200]
 */
function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

/**
 * fail — sends a standard error JSON response
 * @param {object} res - Express response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {number} [status=500]
 */
function fail(res, code, message, status = 500) {
  res.status(status).json({ success: false, error: { code, message } });
}

// ── GET /api/insights ─────────────────────────────────────────

/**
 * GET /api/insights
 * Returns all insights: people briefings, project updates, and strategic advice.
 */
router.get('/insights', (req, res) => {
  try {
    const insights = dataStore.getInsights();
    ok(res, insights);
  } catch (err) {
    logger.error('[api-insights] GET /insights failed', { error: err.message });
    fail(res, 'INSIGHTS_ERROR', err.message);
  }
});

/**
 * GET /api/insights/people
 * Returns people briefings only.
 */
router.get('/insights/people', (req, res) => {
  try {
    const insights = dataStore.getInsights();
    ok(res, { peopleBriefings: insights.peopleBriefings || [] });
  } catch (err) {
    logger.error('[api-insights] GET /insights/people failed', { error: err.message });
    fail(res, 'INSIGHTS_ERROR', err.message);
  }
});

/**
 * GET /api/insights/projects
 * Returns project updates only.
 */
router.get('/insights/projects', (req, res) => {
  try {
    const insights = dataStore.getInsights();
    ok(res, { projectUpdates: insights.projectUpdates || [] });
  } catch (err) {
    logger.error('[api-insights] GET /insights/projects failed', { error: err.message });
    fail(res, 'INSIGHTS_ERROR', err.message);
  }
});

/**
 * GET /api/insights/advice
 * Returns strategic advice only.
 */
router.get('/insights/advice', (req, res) => {
  try {
    const insights = dataStore.getInsights();
    ok(res, { strategicAdvice: insights.strategicAdvice || [] });
  } catch (err) {
    logger.error('[api-insights] GET /insights/advice failed', { error: err.message });
    fail(res, 'INSIGHTS_ERROR', err.message);
  }
});

// ── GET /api/workspace ────────────────────────────────────────

/**
 * GET /api/workspace
 * Returns the current workspace snapshot: emails, documents, sheets, calendar.
 */
router.get('/workspace', (req, res) => {
  try {
    const workspace = dataStore.getWorkspace();
    ok(res, workspace);
  } catch (err) {
    logger.error('[api-insights] GET /workspace failed', { error: err.message });
    fail(res, 'WORKSPACE_ERROR', err.message);
  }
});

// ── POST /api/chat ────────────────────────────────────────────

/**
 * POST /api/chat
 * Body: { message: string }
 * Returns: { answer: string, sources: string[] }
 */
router.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return fail(res, 'INVALID_MESSAGE', 'Request body must include a non-empty "message" string.', 400);
  }

  try {
    logger.info('[api-insights] POST /chat received', { messageLength: message.length });
    const result = await handleChatMessage(message.trim());
    ok(res, result);
  } catch (err) {
    logger.error('[api-insights] POST /chat failed', { error: err.message });
    fail(res, 'CHAT_ERROR', err.message);
  }
});

// ── POST /api/scanner/trigger ─────────────────────────────────

/**
 * POST /api/scanner/trigger
 * Manually triggers a scan cycle without waiting for the interval.
 * Returns 202 Accepted immediately; scan runs asynchronously.
 */
router.post('/scanner/trigger', (req, res) => {
  try {
    if (scanner.isRunning()) {
      return ok(res, { triggered: false, message: 'Scan already in progress.' }, 202);
    }

    logger.info('[api-insights] Manual scan triggered via API');

    // Run scan asynchronously — do not await
    scanner.runScanCycle().catch(err => {
      logger.error('[api-insights] Manual scan failed', { error: err.message });
    });

    ok(res, { triggered: true, message: 'Scan cycle started.' }, 202);
  } catch (err) {
    logger.error('[api-insights] POST /scanner/trigger failed', { error: err.message });
    fail(res, 'SCANNER_ERROR', err.message);
  }
});

module.exports = router;
