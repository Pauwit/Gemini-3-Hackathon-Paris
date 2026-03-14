/**
 * ============================================================
 * agents/memory-agent.js — Memory Agent
 * ============================================================
 *
 * PURPOSE:
 * Maintains persistent knowledge across meetings. Extracts
 * structured entities (people, companies, decisions, commitments)
 * from meeting events and updates the knowledge graph.
 * Also answers queries about past meetings and detected patterns.
 *
 * DATA FLOW:
 * meeting event → Gemini Flash (memory-prompt.txt)
 *   → extracted entities
 *   → knowledge-graph.js (addNode / addEdge)
 *
 * query → knowledge-graph.js → MemoryResult
 *
 * PROTOCOL REFERENCE: N/A (internal — exposed via /api/memory/*)
 *
 * DEPENDENCIES:
 *   ../tools/gemini-client    — LLM extraction
 *   ../memory/knowledge-graph — persistent graph storage
 *   ../config                 — MEMORY_MODEL, MEMORY_STORE_PATH
 * ============================================================
 */

'use strict';

const config = require('../config');

// TODO: Import dependencies when implemented
// const { generateContent } = require('../tools/gemini-client');
// const graph = require('../memory/knowledge-graph');

/**
 * updateMemory
 * Processes a meeting event and updates the knowledge graph.
 *
 * @param {object} event - Meeting event to process
 *   { type: 'meeting-ended'|'card-created'|'decision-made', data: object }
 * @returns {Promise<void>}
 *
 * @example
 * await updateMemory({
 *   type: 'meeting-ended',
 *   data: { meetingId: 'meeting-001', transcript: [...], cards: [...] }
 * });
 */
async function updateMemory(event) {
  // TODO: Load memory-prompt.txt
  // TODO: Extract entities with Gemini Flash
  // TODO: Call graph.addNode() / graph.addEdge() for each entity
  // TODO: Update pattern detection
  // TODO: Persist to memory-store.json

  console.log('[memory-agent] updateMemory called — TODO: implement', { eventType: event?.type });
}

/**
 * queryMemory
 * Queries the knowledge graph for context relevant to a question.
 *
 * @param {string} query - Natural language query about past meetings
 * @returns {Promise<MemoryResult>} Relevant context from graph
 *   { people: Person[], decisions: Decision[], patterns: Pattern[], summary: string }
 *
 * @example
 * const result = await queryMemory("What do we know about TechVentures?");
 * // result.people → [{ name: 'Marcus Johnson', role: 'CTO', ... }]
 */
async function queryMemory(query) {
  // TODO: Parse query intent with Gemini Flash
  // TODO: Call graph.query() with appropriate filters
  // TODO: Format and return result

  console.log('[memory-agent] queryMemory called — TODO: implement', { query });
  return {
    people: [],
    decisions: [],
    patterns: [],
    summary: null,
  };
}

module.exports = { updateMemory, queryMemory };
