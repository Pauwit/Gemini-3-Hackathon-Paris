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

const fs = require('fs');
const path = require('path');
const { generateContent } = require('../tools/gemini-client');

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
  const promptPath = path.join(__dirname, '..', config.PROMPTS_DIR, 'listener-prompt.txt');
  const systemPrompt = fs.readFileSync(promptPath, 'utf8');

  // We ask the LLM to format requests targeting the 'workspace-researcher'
  const contextualPrompt = `
    ${systemPrompt}
    
    --- DATA ---
    Context: ${JSON.stringify(context)}
    Current Transcript Segment: "${transcript}"
    
    Remember: Your output MUST be ONLY valid JSON matching the schema and nothing else.
    Important: If you need context, format your queries as instructions to the 'Workspace Researcher Agent'.
    The Researcher Agent has access to Gmail, Drive, Calendar, Meet, and Maps.
  `;

  try {
    const responseText = await generateContent(
      config.LISTENER_MODEL, 
      contextualPrompt, 
      { responseMimeType: 'application/json', temperature: 0.1 }
    );
    
    // Attempt to parse JSON strictly
    const parsed = JSON.parse(responseText);
    
    console.log(`[listener-agent] Decision: needs_context=${parsed.needs_context}`);
    if (parsed.needs_context) {
      console.log(`[listener-agent] Recommending queries:`, parsed.queries);
    }
    
    return {
      needs_context: !!parsed.needs_context,
      reason: parsed.reason || null,
      queries: parsed.queries || []
    };
  } catch (error) {
    console.error(`[listener-agent] Failed to analyze transcript:`, error);
    return {
      needs_context: false,
      reason: "Error parsing LLM response",
      queries: []
    };
  }
}

module.exports = { analyzeTranscript };
