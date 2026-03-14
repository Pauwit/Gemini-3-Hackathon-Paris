/**
 * auth-routes.js — Google OAuth routes.
 * Handles the sign-in flow: redirecting to Google, handling the callback,
 * storing tokens in session, and logout.
 */

const express = require('express');
const passport = require('passport');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

// Initiate Google OAuth flow
router.get('/auth/google', passport.authenticate('google', {
  scope: config.google.scopes,
  accessType: 'offline',
  prompt: 'consent',
}));

// OAuth callback after user approves
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${config.frontendUrl}/?error=auth_failed` }),
  (req, res) => {
    // Store the user in the session (passport puts it in req.user)
    req.session.user = req.user;
    logger.info(`OAuth callback success for ${req.user?.email}`);
    res.redirect(`${config.frontendUrl}/dashboard`);
  }
);

// Logout
router.post('/auth/logout', (req, res) => {
  const email = req.session.user?.email;
  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destroy error:', err);
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }
    logger.info(`User logged out: ${email}`);
    res.json({ success: true });
  });
});

// Check if user is logged in (used by frontend)
router.get('/auth/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  const { googleId, name, email, avatar, geminiApiKey } = req.session.user;
  res.json({ success: true, data: { googleId, name, email, avatar, hasGeminiKey: !!geminiApiKey } });
});

module.exports = router;
