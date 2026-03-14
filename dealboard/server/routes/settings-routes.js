/**
 * settings-routes.js — User settings management.
 * Handles saving the Gemini API key to the user's session
 * and validates it by making a test call to Gemini.
 */

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dataStore = require('../services/data-store');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware: require authentication for settings routes
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated. Please sign in with Google first.' });
  }
  next();
}

// Save Gemini API key
router.post('/api/settings', requireAuth, async (req, res) => {
  const { geminiApiKey } = req.body;

  if (!geminiApiKey || typeof geminiApiKey !== 'string' || !geminiApiKey.trim()) {
    return res.status(400).json({ success: false, error: 'Gemini API key is required' });
  }

  const key = geminiApiKey.trim();

  // Validate the key by making a minimal test call
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    await model.generateContent('Say "ok" in one word.');

    // Key is valid — store in session and update active user for scanner
    req.session.user.geminiApiKey = key;
    dataStore.setActiveUser(req.session.user);
    logger.info(`Gemini API key validated and stored for ${req.session.user.email}`);

    res.json({
      success: true,
      data: { geminiConnected: true },
    });
  } catch (err) {
    logger.error('Gemini API key validation failed:', err.message);
    res.status(400).json({
      success: false,
      error: 'Invalid Gemini API key. Please check your key and try again.',
    });
  }
});

// Get current settings (without exposing the key)
router.get('/api/settings', requireAuth, (req, res) => {
  const user = req.session.user;
  res.json({
    success: true,
    data: {
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      hasGeminiKey: !!user.geminiApiKey,
    },
  });
});

module.exports = router;
