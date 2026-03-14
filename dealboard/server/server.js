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

require('dotenv').config();

const express = require('express');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const http = require('http');
const path = require('path');
const config = require('./config');

// ── Routes ──────────────────────────────────────────────────
const healthRouter = require('./routes/api-health');
const meetingsRouter = require('./routes/api-meetings');
const memoryRouter = require('./routes/api-memory');
const insightsRouter = require('./routes/api-insights');

// ── Async Brain ──────────────────────────────────────────────
const dataStore = require('./async/data-store');
const scanner = require('./async/scanner');

// ── App Setup ───────────────────────────────────────────────
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Mount REST routes
app.use('/api/health', healthRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/memory', memoryRouter);
app.use('/api', insightsRouter);

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

  meetingState.state = 'stopping';
  meetingState.stoppedAt = new Date().toISOString();

  log('info', `Meeting stopping: ${meetingId}`, { reason });

  broadcastToClient(ws, 'meeting-state', {
    meetingId,
    state: 'stopping',
    startedAt: meetingState.startedAt,
    stoppedAt: meetingState.stoppedAt,
  });

  setTimeout(() => {
    meetingState.state = 'ended';
    broadcastToClient(ws, 'meeting-state', {
      meetingId,
      state: 'ended',
      startedAt: meetingState.startedAt,
      stoppedAt: meetingState.stoppedAt,
    });
    log('info', `Meeting ended: ${meetingId}`);
  }, 500);
}

function handleAudioChunk(ws, payload) {
  const { chunkIndex, sampleRate, channels } = payload;
  // TODO: Route to listener-agent for transcription via Gemini Live
  // For now, acknowledge receipt silently
  if (chunkIndex % 100 === 0) {
    log('info', `Audio chunk ${chunkIndex}`, { sampleRate, channels });
  }
}

function handleTextInput(ws, payload) {
  const { text, meetingId } = payload;
  log('info', `Text input received`, { meetingId, text: text.substring(0, 80) });

  // Emit pipeline status
  broadcastToClient(ws, 'pipeline-status', {
    meetingId,
    stage: 'analysing',
    workersActive: [],
    message: `Processing: "${text.substring(0, 60)}..."`,
  });

  // TODO: Route to listener-agent → analyser-agent pipeline
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

server.listen(config.PORT, async () => {
  log('info', `DealBoard server running on port ${config.PORT}`, {
    mode: config.MODE,
    useMock: config.USE_MOCK,
    wsPath: '/ws',
  });
  log('info', `REST API: http://localhost:${config.PORT}/api/health`);
  log('info', `WebSocket: ws://localhost:${config.PORT}/ws`);

  // Initialize data store and start async scanner if enabled
  try {
    await dataStore.initialize();
    log('info', 'Data store initialized');

    if (config.ENABLE_ASYNC_SCANNER) {
      scanner.start(broadcastToAll);
      log('info', 'Async scanner started', { intervalMs: config.ASYNC_SCAN_INTERVAL_MS });
    } else {
      log('info', 'Async scanner disabled (ENABLE_ASYNC_SCANNER=false)');
    }
  } catch (err) {
    log('error', 'Failed to initialize data store or scanner', { error: err.message });
  }
});

server.on('error', (err) => {
  log('error', 'Server error', { error: err.message });
  process.exit(1);
});

module.exports = { app, server, broadcastToAll };
