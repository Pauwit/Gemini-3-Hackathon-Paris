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
const oauthRouter = require('./routes/oauth');
const { analyzeTranscript } = require('./agents/listener-agent');
const { processResearchRequest } = require('./workspace-researcher/index');
const { fuseWorkerResults } = require('./agents/analyser-agent');
const { generateDocuments } = require('./agents/strategy-agent');
const { updateMemory }     = require('./agents/memory-agent');
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
app.use('/auth', oauthRouter);

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
  platform: 'Google Meet',
};

// Per-meeting accumulators (reset on meeting-start)
const activeMeetingCards = [];
const activeMeetingTranscripts = [];
const activeMeetingDocuments = {}; // documentId → document

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
  meetingState.platform = 'Google Meet';

  // Reset per-meeting accumulators
  activeMeetingCards.length = 0;
  activeMeetingTranscripts.length = 0;
  Object.keys(activeMeetingDocuments).forEach(k => delete activeMeetingDocuments[k]);

  log('info', `Meeting starting: ${title}`, { meetingId, platform: meetingState.platform });

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

  // Compute duration in minutes
  const startMs = meetingState.startedAt ? new Date(meetingState.startedAt).getTime() : Date.now();
  const durationMins = Math.round((Date.now() - startMs) / 60000) || 1;

  // Persist meeting record to data store
  const meetingRecord = {
    id:            meetingId,
    title:         meetingState.title,
    date:          meetingState.startedAt,
    duration:      durationMins,
    participants:  meetingState.participants,
    cardCount:     activeMeetingCards.length,
    documentCount: Object.keys(activeMeetingDocuments).length,
    cards:         [...activeMeetingCards],
    transcript:    [...activeMeetingTranscripts],
    documents:     Object.values(activeMeetingDocuments),
    endedAt:       meetingState.stoppedAt,
  };
  dataStore.saveMeeting(meetingRecord);
  dataStore.saveToDisk().catch(err => log('error', 'Failed to persist meeting', { error: err.message }));
  log('info', `Meeting saved to store: ${meetingId}`, { cards: activeMeetingCards.length });

  // Trigger memory extraction async (non-blocking)
  updateMemory({
    type: 'meeting-ended',
    data: meetingRecord,
  }).catch(err => log('warn', 'Memory agent failed', { error: err.message }));

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

async function handleTextInput(ws, payload) {
  const { text, meetingId, speaker, isFinal, segmentId } = payload;
  log('info', `Text input received`, { meetingId, text: text.substring(0, 80) });

  // Accumulate transcript segment
  const segment = {
    meetingId:  meetingId || meetingState.meetingId,
    segmentId:  segmentId || `seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    speaker:    speaker || 'Speaker',
    text,
    isFinal:    isFinal !== false,
    timestamp:  new Date().toISOString(),
  };
  activeMeetingTranscripts.push(segment);

  // Broadcast transcript segment to frontend
  broadcastToClient(ws, 'transcript', segment);

  // 1. Emit pipeline status - Listener
  broadcastToClient(ws, 'pipeline-status', {
    meetingId,
    stage: 'listener',
    workersActive: [],
    message: `Analyzing transcript...`,
  });

  try {
    // 2. Pass transcript segment to Listener
    const decision = await analyzeTranscript(text, meetingState);
    
    if (decision.needs_context && decision.queries.length > 0) {
      log('info', `Listener decided context is needed`, { queries: decision.queries.length });
      
      // 3. Emit pipeline status - Workers
      broadcastToClient(ws, 'pipeline-status', {
        meetingId,
        stage: 'workers',
        workersActive: ['workspace-researcher'],
        message: `Searching Workspace info for context...`,
      });

      // 4. Execute standard workspace research for each query
      // For simplicity/safety, we grab the first query
      const primaryQuery = decision.queries[0].query;
      const workerResults = await processResearchRequest(primaryQuery);
      
      // 5. Emit pipeline status - Analyser
      broadcastToClient(ws, 'pipeline-status', {
        meetingId,
        stage: 'analyser',
        workersActive: [],
        message: `Synthesizing intelligence cards...`,
      });
      
      // 6. Fuse worker results into an AI Card
      const cards = await fuseWorkerResults(workerResults, text, meetingState);
      
      // 7. Stream cards to clients and accumulate
      for (const card of cards) {
        // Enforce the triggerSegmentId for UI alignment if provided by the client
        card.triggerSegmentId = payload.segmentId || null;
        card.meetingId = meetingId || meetingState.meetingId;
        activeMeetingCards.push(card);
        broadcastToClient(ws, 'card', card);
        log('info', `Broadcasted Card: ${card.label}`, { summary: card.summary });
      }
    } else {
      log('info', `Listener decided NO context is needed.`);
    }

  } catch (error) {
    log('error', `Pipeline failed processing text-input:`, { error: error.message });
  } finally {
    // 8. Reset pipeline to idle
    broadcastToClient(ws, 'pipeline-status', {
      meetingId,
      stage: 'idle',
      workersActive: [],
      message: ``,
    });
  }
}

async function handleGenerateDocuments(ws, payload) {
  const { meetingId, types } = payload;
  log('info', `Generate documents requested`, { meetingId, types });

  broadcastToClient(ws, 'pipeline-status', {
    meetingId,
    stage: 'analysing',
    workersActive: ['strategy-agent'],
    message: `Generating ${types.join(', ')} with Gemini Pro…`,
  });

  // Build meeting data from accumulated state
  const storedMeeting = dataStore.getMeeting(meetingId);
  const meetingData = {
    meetingId,
    title:        storedMeeting?.title || meetingState.title || 'Meeting',
    participants: storedMeeting?.participants || meetingState.participants || [],
    startedAt:    storedMeeting?.date || meetingState.startedAt,
    transcript:   storedMeeting?.transcript?.length > 0
                    ? storedMeeting.transcript
                    : [...activeMeetingTranscripts],
    cards:        storedMeeting?.cards?.length > 0
                    ? storedMeeting.cards
                    : [...activeMeetingCards],
  };

  try {
    const documents = await generateDocuments(meetingData, types);

    for (const doc of documents) {
      activeMeetingDocuments[doc.documentId] = doc;
      broadcastToClient(ws, 'document', doc);
      log('info', `Document sent: ${doc.type}`);
    }

    // Persist documents to the stored meeting record
    if (storedMeeting) {
      storedMeeting.documents = Object.values(activeMeetingDocuments);
      storedMeeting.documentCount = storedMeeting.documents.length;
      dataStore.saveMeeting(storedMeeting);
      dataStore.saveToDisk().catch(() => {});
    }

    broadcastToClient(ws, 'pipeline-status', {
      meetingId,
      stage: 'done',
      workersActive: [],
      message: `${documents.length} documents ready`,
    });
  } catch (err) {
    log('error', `Strategy agent failed`, { error: err.message });
    broadcastToClient(ws, 'pipeline-status', {
      meetingId,
      stage: 'error',
      workersActive: [],
      message: 'Document generation failed',
    });
    broadcastToClient(ws, 'error', {
      code: 'STRATEGY_AGENT_ERROR',
      message: err.message,
      recoverable: true,
    });
  }
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
