/**
 * ============================================================
 * agents/analyser-agent.js — Analyser Agent
 * ============================================================
 *
 * PURPOSE:
 * Receives aggregated results from GWS workers and fuses them
 * with the current transcript context to produce a single,
 * actionable Card. Maps results to the correct card label
 * (ALERT, BATTLECARD, CONTEXT, STRATEGY, INFO) and writes
 * structured details arrays.
 *
 * DATA FLOW:
 * workerResults + transcript → Gemini Flash (analyser-prompt.txt)
 *   → Card object
 *   → server.js broadcastToClient('card', ...)
 *
 * PROTOCOL REFERENCE: PROTOCOL.md section 3 (card message schema)
 *
 * DEPENDENCIES:
 *   ../tools/gemini-client  — LLM calls
 *   ../tools/skills-loader  — prompt loading
 *   ../config               — ANALYSER_MODEL
 * ============================================================
 */

'use strict';

const config = require('../config');

const fs = require('fs');
const path = require('path');
const { generateContent } = require('../tools/gemini-client');

/**
 * fuseWorkerResults
 * Synthesizes worker data and transcript context into a Card object.
 *
 * @param {object} workerResults - Aggregated results from worker-orchestrator
 *   { gmail: EmailResult[], drive: DriveResult[], sheets: SheetData, calendar: CalendarEvent[] }
 * @param {string} transcript - The triggering transcript segment
 * @param {object} context - Meeting context (meetingId, participants, history)
 * @returns {Promise<Card[]>} Array of Card objects (usually 1, occasionally 2-3)
 *
 * @example
 * const cards = await fuseWorkerResults(
 *   { gmail: [...], drive: [...] },
 *   "What is our pricing vs Datadog?",
 *   { meetingId: 'meeting-001' }
 * );
 */
async function fuseWorkerResults(workerResults, transcript, context) {
  const promptPath = path.join(__dirname, '..', config.PROMPTS_DIR, 'analyser-prompt.txt');
  const systemPrompt = fs.readFileSync(promptPath, 'utf8');

  const contextualPrompt = `
    ${systemPrompt}
    
    --- DATA ---
    Meeting Context: ${JSON.stringify(context)}
    Current Transcript Segment: "${transcript}"
    Worker Results (Workspace Researcher context): ${JSON.stringify(workerResults)}
    
    Remember: Your output MUST be ONLY valid JSON matching the Card schema and nothing else.
    Ensure "priority" is mapped correctly to the "label" type according to UI standards.
  `;

  try {
    const responseText = await generateContent(
      config.ANALYSER_MODEL, 
      contextualPrompt, 
      { responseMimeType: 'application/json', temperature: 0.2 }
    );
    
    // Attempt to parse JSON strictly - the prompt expects a single object, but we wrap it in array
    let parsed = JSON.parse(responseText);
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }
    
    // Validate and assign necessary IDs
    const cards = parsed.map(c => ({
      ...c,
      cardId: `card_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString()
    }));
    
    console.log(`[analyser-agent] Generated ${cards.length} cards.`);
    return cards;
  } catch (error) {
    console.error(`[analyser-agent] Failed to fuse worker results:`, error);
    return [];
  }
}

module.exports = { fuseWorkerResults };
