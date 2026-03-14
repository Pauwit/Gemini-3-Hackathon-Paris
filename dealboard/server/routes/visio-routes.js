const express = require('express');
const { google } = require('googleapis');
const { createGoogleClients } = require('../services/workspace-service');
const logger = require('../utils/logger');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  next();
}

/**
 * POST /api/visio/create-meet
 * Creates an instant Google Meet link via Google Calendar API.
 */
router.post('/api/visio/create-meet', requireAuth, async (req, res) => {
  const user = req.session.user;
  const { calendar } = createGoogleClients(user);

  try {
    const event = {
      summary: 'Instant AI-Assisted Meeting',
      description: 'Powered by DealBoard AI Companion',
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() }, // 1 hour duration
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(7),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.hangoutLink;
    
    if (!meetLink) {
       throw new Error('Google did not return a Meet link. Ensure Conference data is enabled.');
    }

    res.json({
      success: true,
      data: {
        meetLink,
        eventId: response.data.id,
        summary: response.data.summary
      },
    });
  } catch (err) {
    logger.error('Failed to create Google Meet link:', err.message);
    res.status(500).json({ success: false, error: 'Meet creation failed: ' + err.message });
  }
});

module.exports = router;
