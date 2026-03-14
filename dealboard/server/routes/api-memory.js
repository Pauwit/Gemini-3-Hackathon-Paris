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
const { getMemoryStore } = require('../agents/memory-agent');

// Lazy-load mock memory data (fallback when store is empty)
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

/** Returns the memory store, always falls back to mock if empty */
function getStore() {
  return getMemoryStore();
}

/**
 * GET /api/memory/graph
 * Returns full knowledge graph (nodes + edges + stats).
 */
router.get('/graph', (req, res) => {
  const store = getStore();
  const mock  = getMockMemory();

  // Use store nodes/edges, fall back to building from mock if store is empty
  let nodes = store.nodes || [];
  let edges = store.edges || [];

  if (nodes.length === 0) {
    Object.entries(mock.people || {}).forEach(([name, data], i) => {
      const personId = data.id || `person-${i}`;
      nodes.push({ id: personId, type: 'person', label: name, data: { role: data.role, company: data.company } });
      if (data.company) {
        const companyId = `company-${data.company.replace(/\s+/g, '-').toLowerCase()}`;
        if (!nodes.find(n => n.id === companyId)) {
          nodes.push({ id: companyId, type: 'company', label: data.company, data: {} });
        }
        edges.push({ id: `edge-${personId}-${companyId}`, source: personId, target: companyId, type: 'works_at', data: {} });
      }
    });
    (mock.decisions || []).forEach((d) => {
      nodes.push({ id: d.id || `dec-${d.date}`, type: 'decision', label: d.description, data: { date: d.date, status: d.status } });
    });
  }

  const interactions = store.interactions?.length > 0 ? store.interactions : (mock.interactions || []);

  res.json({
    success: true,
    nodes,
    edges,
    stats: {
      totalNodes:    nodes.length,
      totalEdges:    edges.length,
      totalMeetings: interactions.length,
      lastUpdated:   store.lastUpdated || new Date().toISOString(),
    },
  });
});

/**
 * GET /api/memory/people
 * Returns known people profiles extracted from meetings.
 */
router.get('/people', (req, res) => {
  const store = getStore();
  const storePeople = Object.entries(store.people || {}).map(([name, data]) => ({ name, ...data }));

  if (storePeople.length > 0) {
    return res.json({ success: true, people: storePeople });
  }

  // Fallback: mock data
  const mock   = getMockMemory();
  const people = Object.entries(mock.people || {}).map(([name, data]) => ({ name, ...data }));
  res.json({ success: true, people });
});

/**
 * GET /api/memory/patterns
 * Returns detected behavioral/deal patterns across meetings.
 */
router.get('/patterns', (req, res) => {
  const store = getStore();
  const patterns = store.patterns?.length > 0 ? store.patterns : (getMockMemory().patterns || []);
  res.json({ success: true, patterns });
});

/**
 * GET /api/memory/decisions
 * Returns log of decisions made across meetings.
 */
router.get('/decisions', (req, res) => {
  const store = getStore();
  const decisions = store.decisions?.length > 0 ? store.decisions : (getMockMemory().decisions || []);
  res.json({ success: true, decisions });
});

module.exports = router;
