/**
 * ============================================================
 * agents/listener-agent.js — Listener Agent
 * ============================================================
 *
 * PURPOSE:
 * Monitors live meeting transcript segments in real-time.
 * Decides whether additional GWS context is needed based on
 * what is being discussed (competitor mentions, pricing claims,
 * technical assertions, customer objections).
 * Outputs structured queries for the Worker Orchestrator.
 *
 * DATA FLOW:
 * transcript segment → Gemini Flash (listener-prompt.txt)
 *   → { needs_context, reason, queries[] }
 *   → worker-orchestrator.js (if needs_context)
 *
 * PROTOCOL REFERENCE: N/A (internal pipeline)
 *
 * DEPENDENCIES:
 *   ../tools/gemini-client  — LLM calls
 *   ../tools/skills-loader  — prompt loading
 *   ../config               — LISTENER_MODEL
 * ============================================================
 */

'use strict';

const config = require('../config');

// TODO: Import gemini-client and skills-loader when implemented
// const { generateContent } = require('../tools/gemini-client');
// const { loadSkill } = require('../tools/skills-loader');

/**
 * analyzeTranscript
 * Analyzes a transcript segment to determine if GWS context fetch is needed.
 *
 * @param {string} transcript - The latest transcript segment text
 * @param {object} context - Meeting context (meetingId, participants, history)
 * @returns {Promise<{needs_context: boolean, reason: string|null, queries: object[]}>}
 *
 * @example
 * const result = await analyzeTranscript(
 *   "We're paying $50k/mo for Datadog and it keeps climbing",
 *   { meetingId: 'meeting-001', participants: ['Marcus Johnson'] }
 * );
 * // result.needs_context === true
 * // result.queries[0].worker === 'gmail-worker'
 */
async function analyzeTranscript(transcript, context) {
  // TODO: Load listener-prompt.txt
  // TODO: Build prompt with transcript + context
  // TODO: Call Gemini Flash model
  // TODO: Parse JSON response
  // TODO: Return structured result

  console.log('[listener-agent] analyzeTranscript called — TODO: implement');
  return {
    needs_context: false,
    reason: null,
    queries: [],
  };
}

module.exports = { analyzeTranscript };
