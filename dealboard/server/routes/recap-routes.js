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

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(`Tu es un assistant business expert en réunions commerciales.
Analyse cette transcription de réunion et génère un recap structuré.

TRANSCRIPTION:
${fullTranscript}

Génère un JSON valide avec cette structure EXACTE (sans markdown, juste le JSON):
{
  "summary": "Résumé de la réunion en 2-3 phrases",
  "decisions": ["Décision 1", "Décision 2"],
  "actionItems": [{"who": "Prénom ou rôle", "what": "Action à faire", "deadline": "Échéance si mentionnée ou null"}],
  "keyTopics": ["Sujet abordé 1", "Sujet abordé 2"],
  "nextSteps": ["Prochaine étape 1", "Prochaine étape 2"]
}

Réponds UNIQUEMENT avec le JSON brut.`);

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
      currentInsights.meetingSummaries.unshift({
        date: new Date().toISOString(),
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
