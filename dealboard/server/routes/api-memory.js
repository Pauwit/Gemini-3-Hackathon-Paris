/**
 * ============================================================
 * routes/api-memory.js — Memory / Knowledge Graph REST Endpoints
 * ============================================================
 *
 * PURPOSE:
 * Exposes the persistent memory store built by the Memory Agent.
 * Frontend uses these endpoints to render the knowledge graph,
 * people profiles, pattern insights, and decision history.
 *
 * DATA FLOW:
 * GET /api/memory/* → memory/knowledge-graph.js → JSON response
 *
 * PROTOCOL REFERENCE: PROTOCOL.md section 4
 *   GET /api/memory/graph
 *   GET /api/memory/people
 *   GET /api/memory/patterns
 *   GET /api/memory/decisions
 *
 * DEPENDENCIES:
 *   express                  — router
 *   ../memory/knowledge-graph — graph queries (TODO: implement)
 *   ../config                — flags
 * ============================================================
 */

'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');

// Lazy-load mock memory data
let _mockMemory = null;
function getMockMemory() {
  if (!_mockMemory) {
    try {
      _mockMemory = require('../mock-data/mock-memory.json');
    } catch (e) {
      _mockMemory = { interactions: [], people: {}, decisions: [], patterns: [] };
    }
  }
  return _mockMemory;
}

/**
 * GET /api/memory/graph
 * Returns full knowledge graph (nodes + edges + stats).
 */
router.get('/graph', (req, res) => {
  // TODO: Delegate to knowledge-graph.js
  res.json({
    success: true,
    nodes: [],
    edges: [],
    stats: { totalNodes: 0, totalEdges: 0, totalMeetings: 0, lastUpdated: null },
  });
});

/**
 * GET /api/memory/people
 * Returns known people profiles extracted from meetings.
 */
router.get('/people', (req, res) => {
  if (config.USE_MOCK) {
    const mock = getMockMemory();
    const people = Object.entries(mock.people || {}).map(([name, data]) => ({
      name,
      ...data,
    }));
    return res.json({ success: true, people });
  }
  // TODO: Query knowledge graph for person nodes
  res.json({ success: true, people: [] });
});

/**
 * GET /api/memory/patterns
 * Returns detected behavioral/deal patterns across meetings.
 */
router.get('/patterns', (req, res) => {
  if (config.USE_MOCK) {
    const mock = getMockMemory();
    return res.json({ success: true, patterns: mock.patterns || [] });
  }
  // TODO: Query knowledge graph for pattern nodes
  res.json({ success: true, patterns: [] });
});

/**
 * GET /api/memory/decisions
 * Returns log of decisions made across meetings.
 */
router.get('/decisions', (req, res) => {
  if (config.USE_MOCK) {
    const mock = getMockMemory();
    return res.json({ success: true, decisions: mock.decisions || [] });
  }
  // TODO: Query knowledge graph for decision nodes
  res.json({ success: true, decisions: [] });
});

module.exports = router;
