/**
 * insights-routes.js — REST endpoints for workspace insights.
 */

const express = require('express');
const dataStore = require('../services/data-store');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  next();
}

// GET /api/insights — all insights + last scan time
router.get('/api/insights', requireAuth, (req, res) => {
  const insights = dataStore.getInsights();
  const lastScanTime = dataStore.getLastScanTime();

  res.json({
    success: true,
    data: {
      people: insights?.people || [],
      projects: insights?.projects || [],
      advice: insights?.advice || [],
      calendar: insights?.calendar || [],
      meetingSummaries: insights?.meetingSummaries || [],
      lastScanTime,
    },
  });
});

router.get('/api/insights/people', requireAuth, (req, res) => {
  const insights = dataStore.getInsights();
  res.json({ success: true, data: { people: insights?.people || [] } });
});

router.get('/api/insights/projects', requireAuth, (req, res) => {
  const insights = dataStore.getInsights();
  res.json({ success: true, data: { projects: insights?.projects || [] } });
});

router.get('/api/insights/advice', requireAuth, (req, res) => {
  const insights = dataStore.getInsights();
  res.json({ success: true, data: { advice: insights?.advice || [] } });
});

router.get('/api/insights/calendar', requireAuth, (req, res) => {
  const insights = dataStore.getInsights();
  res.json({ success: true, data: { events: insights?.calendar || [] } });
});

module.exports = router;
