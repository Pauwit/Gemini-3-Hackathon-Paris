/**
 * ============================================================
 * routes/api-meetings.js — Meetings REST Endpoints
 * ============================================================
 *
 * PURPOSE:
 * Provides historical meeting data: past meetings, their cards,
 * documents, and transcripts. Returns mock data when USE_MOCK=true.
 *
 * DATA FLOW:
 * GET /api/meetings/* → mock-data/mock-data.json (mock) or DB (live)
 *
 * PROTOCOL REFERENCE: PROTOCOL.md section 4
 *   GET /api/meetings
 *   GET /api/meetings/:id/documents
 *   GET /api/meetings/:id/cards
 *   GET /api/meetings/:id/transcript
 *
 * DEPENDENCIES:
 *   express         — router
 *   ../config       — USE_MOCK flag
 *   ../mock-data/*  — mock JSON files
 * ============================================================
 */

'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const config = require('../config');
const dataStore = require('../async/data-store');

// Lazy-load mock data
let _mockData = null;
function getMockData() {
  if (!_mockData) {
    try {
      _mockData = require('../mock-data/mock-data.json');
    } catch (e) {
      _mockData = {};
    }
  }
  return _mockData;
}

let _mockTranscript = null;
function getMockTranscript() {
  if (!_mockTranscript) {
    try {
      _mockTranscript = require('../mock-data/mock-transcript.json');
    } catch (e) {
      _mockTranscript = [];
    }
  }
  return _mockTranscript;
}

/**
 * GET /api/meetings
 * Returns list of past meetings.
 */
router.get('/', (req, res) => {
  if (config.USE_MOCK) {
    const mockData = getMockData();
    return res.json({
      success: true,
      meetings: mockData.meetings || [],
    });
  }
  const meetings = dataStore.getMeetingsList().map(m => ({
    id:            m.id,
    title:         m.title,
    date:          m.date,
    duration:      m.duration,
    participants:  m.participants,
    cardCount:     m.cardCount || 0,
    documentCount: m.documentCount || 0,
  }));
  res.json({ success: true, meetings });
});

/**
 * GET /api/meetings/:meetingId/documents
 * Returns documents generated for a meeting.
 */
router.get('/:meetingId/documents', (req, res) => {
  const { meetingId } = req.params;
  if (config.USE_MOCK) {
    const mockData = getMockData();
    return res.json({
      success: true,
      documents: mockData.documents || [],
    });
  }
  const meeting = dataStore.getMeeting(meetingId);
  res.json({ success: true, documents: meeting?.documents || [] });
});

/**
 * GET /api/meetings/:meetingId/cards
 * Returns cards generated during a meeting.
 */
router.get('/:meetingId/cards', (req, res) => {
  const { meetingId } = req.params;
  if (config.USE_MOCK) {
    const mockData = getMockData();
    return res.json({
      success: true,
      cards: mockData.cards || [],
    });
  }
  const meeting = dataStore.getMeeting(meetingId);
  res.json({ success: true, cards: meeting?.cards || [] });
});

/**
 * GET /api/meetings/:meetingId/transcript
 * Returns transcript segments for a meeting.
 */
router.get('/:meetingId/transcript', (req, res) => {
  const { meetingId } = req.params;
  if (config.USE_MOCK) {
    return res.json({
      success: true,
      segments: getMockTranscript(),
    });
  }
  const meeting = dataStore.getMeeting(meetingId);
  res.json({ success: true, segments: meeting?.transcript || [] });
});

module.exports = router;
