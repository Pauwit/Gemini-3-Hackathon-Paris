/**
 * status-routes.js — Connection status endpoint.
 * Returns the current state of Google and Gemini connections
 * so the frontend can display status indicators.
 */

const express = require('express');

const router = express.Router();

router.get('/api/status', (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.json({
      success: true,
      data: {
        google: { connected: false },
        gemini: { connected: false },
      },
    });
  }

  res.json({
    success: true,
    data: {
      google: {
        connected: !!user.accessToken,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      gemini: {
        connected: !!user.geminiApiKey,
      },
    },
  });
});

module.exports = router;
