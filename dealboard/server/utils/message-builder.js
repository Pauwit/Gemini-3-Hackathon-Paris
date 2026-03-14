/**
 * ============================================================
 * utils/message-builder.js — PROTOCOL.md-Compliant Message Builder
 * ============================================================
 *
 * PURPOSE:
 * Factory functions that create correctly-shaped WebSocket message
 * envelopes. Ensures every message emitted by the server follows
 * the PROTOCOL.md format: { type, payload, timestamp }.
 * All server code that sends WebSocket messages should use
 * these builders rather than constructing objects manually.
 *
 * DATA FLOW:
 * server logic → messageBuilder.X() → envelope object → ws.send(JSON.stringify(envelope))
 *
 * PROTOCOL REFERENCE: PROTOCOL.md sections 2 and 3
 *
 * DEPENDENCIES: None (pure utility)
 * ============================================================
 */

'use strict';

/**
 * envelope — wraps a payload into a standard PROTOCOL.md message envelope
 * @param {string} type - Message type identifier (e.g. 'card', 'transcript')
 * @param {object} payload - Message-specific payload data
 * @returns {{ type: string, payload: object, timestamp: string }}
 */
function envelope(type, payload) {
  return {
    type,
    payload: payload || {},
    timestamp: new Date().toISOString(),
  };
}

/**
 * meetingState — builds a meeting-state message
 * @param {'idle'|'starting'|'active'|'stopping'|'ended'} state
 * @param {string} meetingId - Meeting identifier
 * @param {object} [extra] - Additional fields (startedAt, stoppedAt, participants, etc.)
 * @returns {object} PROTOCOL.md meeting-state envelope
 */
function meetingState(state, meetingId, extra = {}) {
  return envelope('meeting-state', {
    meetingId: meetingId || null,
    state,
    startedAt: extra.startedAt || null,
    stoppedAt: extra.stoppedAt || null,
    ...extra,
  });
}

/**
 * transcript — builds a transcript segment message
 * @param {string} text - Transcribed text content
 * @param {string} [speaker] - Speaker identifier (e.g. 'user', 'remote')
 * @param {boolean} [isFinal] - Whether this is a final (committed) transcript segment
 * @param {string} [segmentId] - Unique identifier for this segment
 * @returns {object} PROTOCOL.md transcript envelope
 */
function transcript(text, speaker = 'unknown', isFinal = false, segmentId = null) {
  return envelope('transcript', {
    text,
    speaker,
    isFinal,
    segmentId: segmentId || `seg-${Date.now()}`,
  });
}

/**
 * card — builds an AI insight card message
 * @param {object} cardData - Card payload as defined in PROTOCOL.md
 *   { cardId, type, title, body, priority, actions, sources, meetingId }
 * @returns {object} PROTOCOL.md card envelope
 */
function card(cardData) {
  return envelope('card', {
    cardId: cardData.cardId || `card-${Date.now()}`,
    type: cardData.type || 'insight',
    title: cardData.title || '',
    body: cardData.body || '',
    priority: cardData.priority || 'medium',
    actions: cardData.actions || [],
    sources: cardData.sources || [],
    meetingId: cardData.meetingId || null,
    generatedAt: cardData.generatedAt || new Date().toISOString(),
  });
}

/**
 * document — builds a generated document message
 * @param {object} docData - Document payload
 *   { meetingId, documentId, type, title, content, generatedAt }
 * @returns {object} PROTOCOL.md document envelope
 */
function document(docData) {
  return envelope('document', {
    meetingId: docData.meetingId || null,
    documentId: docData.documentId || `doc-${Date.now()}`,
    type: docData.type || 'summary',
    title: docData.title || 'Document',
    content: docData.content || '',
    generatedAt: docData.generatedAt || new Date().toISOString(),
  });
}

/**
 * pipelineStatus — builds a pipeline-status message for scan/analysis progress
 * @param {string} stage - Current pipeline stage (e.g. 'scanning', 'analysing', 'done', 'error')
 * @param {string} message - Human-readable status description
 * @param {boolean} [active] - Whether the pipeline is currently active
 * @param {string[]} [workersActive] - List of currently active worker names
 * @returns {object} PROTOCOL.md pipeline-status envelope
 */
function pipelineStatus(stage, message, active = true, workersActive = []) {
  return envelope('pipeline-status', {
    stage,
    message,
    active,
    workersActive,
  });
}

/**
 * error — builds an error message envelope
 * @param {string} code - Error code (e.g. 'PARSE_ERROR', 'AUTH_FAILED')
 * @param {string} message - Human-readable error description
 * @param {boolean} [recoverable] - Whether the client can recover without reconnecting
 * @returns {object} PROTOCOL.md error envelope
 */
function error(code, message, recoverable = true) {
  return envelope('error', {
    code,
    message,
    recoverable,
  });
}

module.exports = {
  envelope,
  meetingState,
  transcript,
  card,
  document,
  pipelineStatus,
  error,
};
