/**
 * ============================================================
 * server.js — DealBoard AI Companion — Main Server Entry Point
 * ============================================================
 *
 * PURPOSE:
 * Express + WebSocket server that orchestrates the DealBoard AI pipeline.
 * Accepts audio/text input from the frontend, routes through AI agents,
 * and streams results (cards, transcripts, documents) back in real-time.
 *
 * DATA FLOW:
 * Frontend → WebSocket → message handler → agents/workers → broadcastToClient
 * Frontend → REST → routes/* → response
 *
 * PROTOCOL REFERENCE: PROTOCOL.md sections 1-4
 *
 * DEPENDENCIES:
 *   express, ws, cors — npm packages
 *   ./config.js       — all configuration
 *   ./routes/*        — REST route handlers
 * ============================================================
 */

'use strict';

const express = require('express');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const http = require('http');
const path = require('path');
const config = require('./config');
const { analyzeLiveSegment } = require('./services/live-companion');
const { generateMeetingRecapDocument } = require('./services/meeting-recap');
const { upsertMeetingRecord } = require('./storage/meetings-store');

// ── Routes ──────────────────────────────────────────────────
const healthRouter = require('./routes/api-health');
const meetingsRouter = require('./routes/api-meetings');
const memoryRouter = require('./routes/api-memory');

// ── App Setup ───────────────────────────────────────────────
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Mount REST routes
app.use('/api/health', healthRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/memory', memoryRouter);

// 404 fallback for unmatched REST routes
app.use((req, res) => {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404);
});

// ── HTTP + WebSocket Server ──────────────────────────────────
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

// Active meeting state (in-memory, single session for hackathon)
const meetingState = {
  meetingId: null,
  state: 'idle', // idle | starting | active | stopping | ended
  startedAt: null,
  stoppedAt: null,
  participants: [],
  title: '',
  context: '',
  transcript: [],
  cards: [],
};

// ── WebSocket Connection Handler ─────────────────────────────
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  log('info', `WebSocket client connected`, { ip: clientIp });

  // Send current meeting state on connect
  broadcastToClient(ws, 'meeting-state', {
    meetingId: meetingState.meetingId,
    state: meetingState.state,
    startedAt: meetingState.startedAt,
    stoppedAt: meetingState.stoppedAt,
  });

  ws.on('message', (rawData) => {
    let message;
    try {
      message = JSON.parse(rawData.toString());
    } catch (err) {
      log('warn', 'Failed to parse WebSocket message', { error: err.message });
      broadcastToClient(ws, 'error', {
        code: 'PARSE_ERROR',
        message: 'Invalid JSON in WebSocket message',
        recoverable: true,
      });
      return;
    }

    const { type, payload, timestamp } = message;
    log('info', `WS message received: ${type}`, { meetingId: payload?.meetingId, timestamp });

    // Silently ignore unknown message types (per PROTOCOL.md)
    switch (type) {
      case 'meeting-start':
        handleMeetingStart(ws, payload);
        break;

      case 'meeting-stop':
        handleMeetingStop(ws, payload);
        break;

      case 'audio-chunk':
        handleAudioChunk(ws, payload);
        break;

      case 'text-input':
        handleTextInput(ws, payload);
        break;

      case 'generate-documents':
        handleGenerateDocuments(ws, payload);
        break;

      default:
        // Per protocol: silently ignore unknown types
        log('info', `Ignoring unknown message type: ${type}`);
    }
  });

  ws.on('close', (code, reason) => {
    log('info', `WebSocket client disconnected`, { code, reason: reason.toString() });
  });

  ws.on('error', (err) => {
    log('error', `WebSocket error`, { error: err.message });
  });
});

// ── Message Handlers ─────────────────────────────────────────

function handleMeetingStart(ws, payload) {
  const { meetingId, title, participants, context } = payload;

  meetingState.meetingId = meetingId;
  meetingState.state = 'starting';
  meetingState.startedAt = new Date().toISOString();
  meetingState.stoppedAt = null;
  meetingState.title = title;
  meetingState.participants = participants || [];
  meetingState.context = context || '';
  meetingState.transcript = [];
  meetingState.cards = [];

  log('info', `Meeting starting: ${title}`, { meetingId });

  broadcastToClient(ws, 'meeting-state', {
    meetingId,
    state: 'starting',
    startedAt: meetingState.startedAt,
    stoppedAt: null,
  });

  // Simulate transition to active (in real impl, agents would signal this)
  setTimeout(() => {
    meetingState.state = 'active';
    broadcastToClient(ws, 'meeting-state', {
      meetingId,
      state: 'active',
      startedAt: meetingState.startedAt,
      stoppedAt: null,
    });
    log('info', `Meeting active: ${meetingId}`);
  }, 500);
}

function handleMeetingStop(ws, payload) {
  const { meetingId, reason } = payload;

  const snapshot = {
    meetingId,
    title: meetingState.title,
    participants: [...(meetingState.participants || [])],
    startedAt: meetingState.startedAt,
    stoppedAt: new Date().toISOString(),
    transcript: [...(meetingState.transcript || [])],
    cards: [...(meetingState.cards || [])],
  };

  meetingState.state = 'stopping';
  meetingState.stoppedAt = snapshot.stoppedAt;

  log('info', `Meeting stopping: ${meetingId}`, { reason });

  broadcastToClient(ws, 'meeting-state', {
    meetingId,
    state: 'stopping',
    startedAt: meetingState.startedAt,
    stoppedAt: meetingState.stoppedAt,
  });

  broadcastToClient(ws, 'pipeline-status', {
    meetingId,
    stage: 'analysing',
    workersActive: ['strategy-agent'],
    message: 'Generating meeting recap and saving artifacts…',
  });

  setTimeout(async () => {
    meetingState.state = 'ended';
    broadcastToClient(ws, 'meeting-state', {
      meetingId,
      state: 'ended',
      startedAt: meetingState.startedAt,
      stoppedAt: meetingState.stoppedAt,
    });

    try {
      const recapDocument = await generateMeetingRecapDocument({
        meetingId: snapshot.meetingId,
        title: snapshot.title,
        participants: snapshot.participants,
        transcript: snapshot.transcript,
        cards: snapshot.cards,
        generatedAt: snapshot.stoppedAt,
      });

      const documents = recapDocument ? [recapDocument] : [];

      upsertMeetingRecord({
        meetingId: snapshot.meetingId,
        title: snapshot.title,
        participants: snapshot.participants,
        startedAt: snapshot.startedAt,
        stoppedAt: snapshot.stoppedAt,
        cards: snapshot.cards,
        transcript: snapshot.transcript,
        documents,
      });

      if (recapDocument) {
        broadcastToClient(ws, 'document', recapDocument);
      }

      broadcastToClient(ws, 'pipeline-status', {
        meetingId,
        stage: 'done',
        workersActive: [],
        message: 'Meeting recap saved.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save meeting recap';
      log('error', 'Meeting recap persistence failed', { meetingId, error: message });

      broadcastToClient(ws, 'pipeline-status', {
        meetingId,
        stage: 'error',
        workersActive: [],
        message: 'Meeting ended, but recap saving failed.',
      });
    }

    log('info', `Meeting ended: ${meetingId}`);
  }, 500);
}

function handleAudioChunk(ws, payload) {
  const { chunkIndex, sampleRate, channels } = payload;

  // Audio chunks are still accepted while transcript text is ingested
  // through text-input events for low-latency live coaching.
  if (chunkIndex % 100 === 0) {
    log('info', `Audio chunk ${chunkIndex}`, { sampleRate, channels });
  }
}

async function handleTextInput(ws, payload) {
  const { text, meetingId, speaker, source } = payload;
  const safeText = String(text || '').trim();

  if (!safeText) {
    return;
  }

  const effectiveMeetingId = meetingId || meetingState.meetingId;
  const effectiveSpeaker = speaker || 'Live Speaker';

  log('info', 'Text input received', {
    meetingId: effectiveMeetingId,
    source: source || 'unknown',
    text: safeText.substring(0, 80),
  });

  const transcriptSegment = {
    meetingId: effectiveMeetingId,
    segmentId: `seg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    speaker: effectiveSpeaker,
    text: safeText,
    isFinal: true,
    timestamp: new Date().toISOString(),
  };

  meetingState.transcript.push(transcriptSegment);
  broadcastToClient(ws, 'transcript', transcriptSegment);

  // Emit pipeline status
  broadcastToClient(ws, 'pipeline-status', {
    meetingId: effectiveMeetingId,
    stage: 'listening',
    workersActive: ['companion-agent'],
    message: 'Listening and understanding the latest segment…',
  });

  try {
    broadcastToClient(ws, 'pipeline-status', {
      meetingId: effectiveMeetingId,
      stage: 'analysing',
      workersActive: ['companion-agent', 'fact-verifier'],
      message: `Analyzing: "${safeText.substring(0, 60)}${safeText.length > 60 ? '…' : ''}"`,
    });

    const analysis = await analyzeLiveSegment(safeText, {
      meetingId: effectiveMeetingId,
      title: meetingState.title,
      participants: meetingState.participants,
      context: meetingState.context,
      transcriptLength: meetingState.transcript.length,
      lastSpeaker: effectiveSpeaker,
    });

    const cards = Array.isArray(analysis.cards) ? analysis.cards : [];

    for (const card of cards) {
      const normalizedCard = {
        meetingId: effectiveMeetingId,
        cardId: `card-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        label: card.label || 'INFO',
        title: card.title,
        summary: card.summary,
        details: Array.isArray(card.details) ? card.details : [],
        confidence: typeof card.confidence === 'number' ? Math.max(0, Math.min(1, card.confidence)) : 0.72,
        triggeredBy: safeText,
        timestamp: new Date().toISOString(),
      };

      meetingState.cards.push(normalizedCard);
      broadcastToClient(ws, 'card', normalizedCard);
    }

    broadcastToClient(ws, 'pipeline-status', {
      meetingId: effectiveMeetingId,
      stage: 'done',
      workersActive: [],
      message: `Companion updated (${analysis.modelUsed}).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Live companion analysis failed';

    broadcastToClient(ws, 'pipeline-status', {
      meetingId: effectiveMeetingId,
      stage: 'error',
      workersActive: [],
      message: 'AI companion failed to process this segment. Try again.',
    });

    broadcastToClient(ws, 'error', {
      code: 'COMPANION_ANALYSIS_ERROR',
      message,
      recoverable: true,
    });
  }
}

function handleGenerateDocuments(ws, payload) {
  const { meetingId, types } = payload;
  log('info', `Generate documents requested`, { meetingId, types });

  broadcastToClient(ws, 'pipeline-status', {
    meetingId,
    stage: 'analysing',
    workersActive: ['strategy-agent'],
    message: `Generating ${types.join(', ')}...`,
  });

  // TODO: Route to strategy-agent
  // Placeholder: send a stub document after delay
  setTimeout(() => {
    types.forEach((docType, i) => {
      setTimeout(() => {
        broadcastToClient(ws, 'document', {
          meetingId,
          documentId: `doc-${Date.now()}-${i}`,
          type: docType,
          title: `${docType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
          content: `# ${docType}\n\n_Document generation not yet implemented. Strategy agent TODO._\n`,
          generatedAt: new Date().toISOString(),
        });
      }, i * 300);
    });

    broadcastToClient(ws, 'pipeline-status', {
      meetingId,
      stage: 'done',
      workersActive: [],
      message: 'Documents generated',
    });
  }, 1000);
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * broadcastToClient — sends a typed WS message envelope to a single client
 * @param {WebSocket} ws
 * @param {string} type
 * @param {object} payload
 */
function broadcastToClient(ws, type, payload) {
  if (ws.readyState === ws.OPEN) {
    const envelope = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    ws.send(JSON.stringify(envelope));
  }
}

/**
 * broadcastToAll — sends a typed WS message to every connected client
 * @param {string} type
 * @param {object} payload
 */
function broadcastToAll(type, payload) {
  wss.clients.forEach((client) => {
    broadcastToClient(client, type, payload);
  });
}

/**
 * sendSuccess — standard success REST response
 */
function sendSuccess(res, data, status = 200) {
  res.status(status).json({ success: true, ...data });
}

/**
 * sendError — standard error REST response
 */
function sendError(res, code, message, status = 500) {
  res.status(status).json({ success: false, error: { code, message } });
}

// Expose helpers for routes
app.locals.sendSuccess = sendSuccess;
app.locals.sendError = sendError;
app.locals.broadcastToAll = broadcastToAll;

// ── Logger ────────────────────────────────────────────────────

function log(level, message, data = {}) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  const dataStr = Object.keys(data).length ? ' ' + JSON.stringify(data) : '';
  console.log(`${prefix} ${message}${dataStr}`);
}

// ── Start Server ──────────────────────────────────────────────

server.listen(config.PORT, () => {
  log('info', `DealBoard server running on port ${config.PORT}`, {
    mode: config.MODE,
    useMock: config.USE_MOCK,
    wsPath: '/ws',
  });
  log('info', `REST API: http://localhost:${config.PORT}/api/health`);
  log('info', `WebSocket: ws://localhost:${config.PORT}/ws`);
});

server.on('error', (err) => {
  log('error', 'Server error', { error: err.message });
  process.exit(1);
});

module.exports = { app, server, broadcastToAll };
