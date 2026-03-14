/**
 * chat-routes.js — Orchestrated chat pipeline.
 *
 * Flow:
 *   1. Orchestrator (Gemini) decides which sub-agents to invoke
 *   2. Selected sub-agents run in parallel to fetch workspace data
 *   3. Gemini answers using the aggregated context
 */

const express = require('express');
const { orchestrate, answerWithContext } = require('../services/gemini-service');
const { createGoogleClients, gmailAgent, driveAgent, calendarAgent } = require('../services/workspace-service');
const dataStore = require('../services/data-store');
const logger = require('../utils/logger');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated. Please sign in with Google first.' });
  }
  next();
}

function requireGemini(req, res, next) {
  if (!req.session.user.geminiApiKey) {
    return res.status(400).json({
      success: false,
      error: 'Gemini API key not set. Please go to Settings and add your Gemini API key.',
    });
  }
  next();
}

router.post('/api/chat', requireAuth, requireGemini, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false, error: 'Message required' });

  const question = message.trim();
  const { geminiApiKey } = req.session.user;
  logger.info(`Multi-Query Chat from ${req.session.user.email}: "${question.slice(0, 50)}"`);

  try {
    const workspace = dataStore.getWorkspace() || {};
    const knownEntities = [
      ...(workspace.docs || []).map(d => d.name),
      ...(workspace.projects || []).map(p => p.name)
    ];

    // 1. Orchestrate (Multi-query generation)
    const decision = await orchestrate(geminiApiKey, question, knownEntities);
    const { agents, queries, correctedQuestion } = decision;
    const finalQuestion = correctedQuestion || question;

    // 2. Prepare Parallel Execution
    const clients = createGoogleClients(req.session.user);
    const agentCalls = [];

    const addCalls = (type, qList, agentFn) => {
      const qs = Array.isArray(qList) ? qList : [qList];
      qs.forEach(q => agentCalls.push(agentFn(clients[type], q).then(r => ({ type, data: r }))));
    };

    if (agents.includes('gmail')) addCalls('gmail', queries.gmail, gmailAgent);
    if (agents.includes('drive')) addCalls('drive', queries.drive, driveAgent);
    if (agents.includes('calendar')) addCalls('calendar', queries.calendar, calendarAgent);

    // 3. Run all variations in parallel
    const allResults = await Promise.allSettled(agentCalls);

    // 4. Aggregate & Deduplicate
    const workspaceData = { emails: [], docs: [], events: [], sourcesUsed: [] };
    const seenIds = new Set();

    for (const result of allResults) {
      if (result.status !== 'fulfilled') continue;
      const { type, data } = result.value;
      if (!data) continue;

      data.forEach(item => {
        if (seenIds.has(item.id)) return;
        seenIds.add(item.id);
        if (type === 'gmail') workspaceData.emails.push(item);
        if (type === 'drive') workspaceData.docs.push(item);
        if (type === 'calendar') workspaceData.events.push(item);
      });
      if (data.length > 0) workspaceData.sourcesUsed.push(type.charAt(0).toUpperCase() + type.slice(1));
    }

    workspaceData.sourcesUsed = [...new Set(workspaceData.sourcesUsed)];

    // 5. Generate Answer
    const { answer, sources } = await answerWithContext(geminiApiKey, finalQuestion, workspaceData);
    res.json({ success: true, data: { answer, sources } });

  } catch (err) {
    logger.error('Multi-query chat error:', err.message);

    let errorMessage = 'Something went wrong. Please try again.';
    if (err.message?.includes('API key')) {
      errorMessage = 'Your Gemini API key appears to be invalid. Please update it in Settings.';
    } else if (err.message?.includes('quota')) {
      errorMessage = 'Gemini API quota exceeded. Please check your API key usage.';
    } else if (err.message?.includes('UNAUTHENTICATED')) {
      errorMessage = 'Google authentication expired. Please sign out and sign in again.';
    }

    res.status(500).json({ success: false, error: errorMessage });
  }
});

module.exports = router;
