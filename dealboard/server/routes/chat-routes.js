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

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  const question = message.trim();
  const { geminiApiKey } = req.session.user;
  logger.info(`Chat from ${req.session.user.email}: "${question.slice(0, 80)}"`);

  try {
    // Step 1 — Orchestrator decides which agents to call
    const decision = await orchestrate(geminiApiKey, question);
    const { agents, queries } = decision;

    // Step 2 — Run selected sub-agents in parallel
    const clients = createGoogleClients(req.session.user);
    const agentCalls = [];

    if (agents.includes('gmail')) {
      agentCalls.push(
        gmailAgent(clients.gmail, queries.gmail).then(emails => ({ type: 'gmail', emails }))
      );
    }
    if (agents.includes('drive')) {
      agentCalls.push(
        driveAgent(clients.drive, queries.drive).then(docs => ({ type: 'drive', docs }))
      );
    }
    if (agents.includes('calendar')) {
      logger.debug(`Calendar query: ${JSON.stringify(queries.calendar)}`);
      agentCalls.push(
        calendarAgent(clients.calendar, queries.calendar).then(events => ({ type: 'calendar', events }))
      );
    }

    const agentResults = await Promise.allSettled(agentCalls);

    // Step 3 — Aggregate results
    const workspaceData = { emails: [], docs: [], events: [], sourcesUsed: [] };

    for (const result of agentResults) {
      if (result.status !== 'fulfilled') continue;
      const { type, emails, docs, events } = result.value;
      if (type === 'gmail' && emails.length > 0) {
        workspaceData.emails = emails;
        workspaceData.sourcesUsed.push('Gmail');
      }
      if (type === 'drive' && docs.length > 0) {
        workspaceData.docs = docs;
        workspaceData.sourcesUsed.push('Drive');
      }
      if (type === 'calendar' && events.length > 0) {
        workspaceData.events = events;
        workspaceData.sourcesUsed.push('Calendar');
      }
    }

    logger.info(`Agents used: ${workspaceData.sourcesUsed.join(', ') || 'none'}`);

    // Step 4 — Generate final answer
    const { answer, sources } = await answerWithContext(geminiApiKey, question, workspaceData);

    res.json({ success: true, data: { answer, sources } });

  } catch (err) {
    logger.error('Chat pipeline error:', err.message);

    let errorMessage = 'Something went wrong. Please try again.';
    if (err.message?.includes('API key')) {
      errorMessage = 'Your Gemini API key appears to be invalid. Please update it in Settings.';
    } else if (err.message?.includes('quota')) {
      errorMessage = 'Gemini API quota exceeded. Please check your API key usage.';
    } else if (err.message?.includes('UNAUTHENTICATED') || err.message?.includes('401')) {
      errorMessage = 'Google authentication expired. Please sign out and sign in again.';
    }

    res.status(500).json({ success: false, error: errorMessage });
  }
});

module.exports = router;
