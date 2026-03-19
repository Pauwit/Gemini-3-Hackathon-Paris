/**
 * recap-routes.js — Generate a structured meeting recap from a transcript.
 *
 * POST /api/meeting/recap
 *   body: { segments: [{ timestamp, text }] }
 *   returns: { summary, decisions, actionItems, keyTopics, nextSteps }
 */

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dataStore = require('../services/data-store');
const logger = require('../utils/logger');

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

async function generateWithFallback(apiKey, callFn) {
  let lastErr;
  for (const modelName of FALLBACK_MODELS) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      return await callFn(model);
    } catch (err) {
      lastErr = err;
      const isUnavailable = err.message?.includes('503') || err.message?.includes('high demand')
        || err.message?.includes('overloaded') || err.message?.includes('404')
        || err.message?.includes('no longer available') || err.message?.includes('not found');
      if (!isUnavailable) throw err;
      logger.warn(`[Recap] Model ${modelName} unavailable, trying next fallback...`);
    }
  }
  throw lastErr;
}

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }
  next();
}

router.post('/api/meeting/recap', requireAuth, async (req, res) => {
  try {
    const { segments } = req.body;
    const geminiKey = req.session.user.geminiApiKey;

    if (!geminiKey) {
      return res.status(400).json({ success: false, error: 'Gemini API key not configured.' });
    }
    if (!segments || segments.length === 0) {
      return res.status(400).json({ success: false, error: 'No transcript segments provided.' });
    }

    const fullTranscript = segments.map(s => `[${s.timestamp}] ${s.text}`).join('\n');

    const result = await generateWithFallback(geminiKey, (model) => model.generateContent(`You are a business assistant expert in sales meetings. The transcript may be in French, English, or mixed — always respond in ENGLISH.
Analyze this meeting transcript and generate a structured recap.

TRANSCRIPT:
${fullTranscript}

Generate a valid JSON with this EXACT structure (no markdown, just raw JSON):
{
  "summary": "Meeting summary in 2-3 sentences",
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": [{"who": "First name or role", "what": "Action to take", "deadline": "Deadline if mentioned or null"}],
  "keyTopics": ["Topic 1", "Topic 2"],
  "nextSteps": ["Next step 1", "Next step 2"]
}

Respond ONLY with the raw JSON.`));

    const raw = result.response.text().trim();

    let recap;
    try {
      // Strip potential markdown code fences
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      recap = JSON.parse(cleaned);
    } catch {
      recap = {
        summary: raw,
        decisions: [],
        actionItems: [],
        keyTopics: [],
        nextSteps: [],
      };
    }

    // Persist into insights store (only if a scan has run and insights exist)
    const currentInsights = dataStore.getInsights();
    if (currentInsights) {
      if (!Array.isArray(currentInsights.meetingSummaries)) {
        currentInsights.meetingSummaries = [];
      }
      const meetingDate = new Date();
      currentInsights.meetingSummaries.unshift({
        title: `Meeting – ${meetingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        date: meetingDate.toISOString(),
        participants: [],
        transcriptSegments: segments.length,
        ...recap,
      });
      // Cap to last 10 summaries
      currentInsights.meetingSummaries = currentInsights.meetingSummaries.slice(0, 10);
      dataStore.saveToDisk();
    }

    logger.info(`[Recap] Generated for ${req.session.user.email}`);
    res.json({ success: true, data: recap });
  } catch (err) {
    logger.error('Recap error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to generate recap.' });
  }
});

module.exports = router;
