/**
 * ============================================================
 * agents/memory-agent.js — Memory Agent
 * ============================================================
 *
 * Maintains a persistent JSON knowledge graph across meetings.
 * Extracts people, decisions, patterns from meeting data using
 * Gemini Flash, and persists to MEMORY_STORE_PATH.
 *
 * DATA FLOW:
 * meeting-ended event → Gemini Flash (memory-prompt.txt)
 *   → extracted nodes/edges/patterns
 *   → merged into memory-store.json
 * ============================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const config = require('../config');

// ── Store path ───────────────────────────────────────────────

function getStorePath() {
  const p = config.MEMORY_STORE_PATH || './memory/memory-store.json';
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

// ── In-memory cache ──────────────────────────────────────────

let _store = null;

function defaultStore() {
  return {
    nodes:        [],
    edges:        [],
    patterns:     [],
    interactions: [],
    people:       {},   // { "Name": { id, role, company, ... } }
    decisions:    [],
    lastUpdated:  null,
  };
}

/**
 * loadStore — reads store from disk, initialises with mock data if empty
 */
function loadStore() {
  if (_store) return _store;

  const storePath = getStorePath();
  try {
    if (fs.existsSync(storePath)) {
      _store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      console.log('[memory-agent] Loaded store from disk', { path: storePath });
    }
  } catch (err) {
    console.warn('[memory-agent] Failed to load store — starting fresh', { error: err.message });
  }

  if (!_store || Object.keys(_store).length === 0) {
    // Seed with mock data so the UI always shows something useful
    _store = defaultStore();
    try {
      const mockPath = path.join(__dirname, '..', 'mock-data', 'mock-memory.json');
      const mock = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
      _store.interactions = mock.interactions || [];
      _store.people       = mock.people       || {};
      _store.decisions    = mock.decisions    || [];
      _store.patterns     = mock.patterns     || [];
      // Build initial nodes from mock people
      Object.entries(_store.people).forEach(([name, data]) => {
        _store.nodes.push({
          id:    data.id || `person-${name.replace(/\s+/g, '-').toLowerCase()}`,
          type:  'person',
          label: name,
          data,
        });
      });
      console.log('[memory-agent] Seeded with mock data');
    } catch {
      // no mock — start truly empty
    }
  }
  return _store;
}

/**
 * saveStore — persists store to disk
 */
async function saveStore() {
  const storePath = getStorePath();
  try {
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _store.lastUpdated = new Date().toISOString();
    fs.writeFileSync(storePath, JSON.stringify(_store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[memory-agent] Failed to save store', { error: err.message });
  }
}

// ── System prompt ────────────────────────────────────────────

let _systemPrompt = null;
function getSystemPrompt() {
  if (!_systemPrompt) {
    const promptPath = path.join(__dirname, '..', config.PROMPTS_DIR, 'memory-prompt.txt');
    try {
      _systemPrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch {
      _systemPrompt = 'Extract entities (people, decisions, patterns) from the meeting data. Return valid JSON.';
    }
  }
  return _systemPrompt;
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * buildEventContext — formats a meeting-ended event into a text prompt
 */
function buildEventContext(event) {
  const { data } = event;
  const transcript = Array.isArray(data.transcript)
    ? data.transcript.map(s => `[${s.speaker || 'Unknown'}]: ${s.text}`).join('\n')
    : 'No transcript.';
  const cards = Array.isArray(data.cards) && data.cards.length > 0
    ? data.cards.map(c => `- [${c.label}] ${c.title}: ${c.summary}`).join('\n')
    : 'No cards.';

  return `
MEETING: ${data.title || 'Untitled'}
DATE: ${data.startedAt || new Date().toISOString()}
PARTICIPANTS: ${(data.participants || []).join(', ')}
MEETING ID: ${data.meetingId}

TRANSCRIPT:
${transcript}

INTELLIGENCE CARDS:
${cards}
`.trim();
}

/**
 * mergeNodes — upserts nodes into store by id
 */
function mergeNodes(newNodes) {
  const store = loadStore();
  for (const n of (newNodes || [])) {
    const idx = store.nodes.findIndex(existing => existing.id === n.id);
    if (idx >= 0) {
      store.nodes[idx] = { ...store.nodes[idx], ...n };
    } else {
      store.nodes.push(n);
    }
  }
}

/**
 * mergeEdges — upserts edges into store by id
 */
function mergeEdges(newEdges) {
  const store = loadStore();
  for (const e of (newEdges || [])) {
    const idx = store.edges.findIndex(existing => existing.id === e.id);
    if (idx >= 0) {
      store.edges[idx] = { ...store.edges[idx], ...e };
    } else {
      store.edges.push(e);
    }
  }
}

/**
 * mergePatterns — upserts patterns by id
 */
function mergePatterns(newPatterns) {
  const store = loadStore();
  for (const p of (newPatterns || [])) {
    const idx = store.patterns.findIndex(existing => existing.id === p.id);
    if (idx >= 0) {
      store.patterns[idx] = { ...store.patterns[idx], ...p };
    } else {
      store.patterns.push(p);
    }
  }
}

/**
 * syncPeopleFromNodes — rebuilds the `people` map from person-type nodes
 */
function syncPeopleFromNodes() {
  const store = loadStore();
  for (const node of store.nodes) {
    if (node.type === 'person') {
      const existing = store.people[node.label] || {};
      store.people[node.label] = {
        id:            node.id,
        role:          node.data?.role          || existing.role          || '',
        company:       node.data?.company       || existing.company       || '',
        decisionMaker: node.data?.decisionMaker ?? existing.decisionMaker ?? false,
        preferences:   node.data?.preferences   || existing.preferences   || [],
        concerns:      node.data?.concerns      || existing.concerns      || [],
        lastSeen:      node.data?.lastSeen      || existing.lastSeen      || new Date().toISOString(),
        relationship:  node.data?.relationship  || existing.relationship  || '',
      };
    }
  }
}

// ── Public API ───────────────────────────────────────────────

/**
 * updateMemory — processes a meeting-ended event and updates the knowledge graph
 * @param {object} event - { type: 'meeting-ended', data: { meetingId, title, participants, transcript[], cards[] } }
 */
async function updateMemory(event) {
  if (!event || event.type !== 'meeting-ended') return;

  const store = loadStore();

  // Always record the interaction
  const interaction = {
    id:           `interaction-${event.data.meetingId}`,
    meetingId:    event.data.meetingId,
    date:         event.data.startedAt || new Date().toISOString(),
    title:        event.data.title || 'Meeting',
    participants: event.data.participants || [],
    outcome:      '',
  };
  const existingIdx = store.interactions.findIndex(i => i.meetingId === event.data.meetingId);
  if (existingIdx >= 0) {
    store.interactions[existingIdx] = interaction;
  } else {
    store.interactions.push(interaction);
  }

  // If no transcript, nothing to extract
  if (!event.data.transcript || event.data.transcript.length === 0) {
    await saveStore();
    return;
  }

  if (!config.GEMINI_API_KEY) {
    console.warn('[memory-agent] No GEMINI_API_KEY — skipping extraction, using mock data');
    await saveStore();
    return;
  }

  try {
    const { callGemini } = require('../tools/gemini-client');
    const systemPrompt = getSystemPrompt();
    const context = buildEventContext(event);

    // Include existing nodes as context to avoid duplicates
    const existingContext = store.nodes.length > 0
      ? `\nEXISTING NODES (do not duplicate, update instead):\n${JSON.stringify(store.nodes.slice(0, 20), null, 2)}`
      : '';

    const prompt = `${systemPrompt}

TASK: Extract entities, decisions, and patterns from this meeting. Return updateMemory JSON format.

${context}
${existingContext}`;

    console.log('[memory-agent] Calling Gemini for extraction...');
    const result = await callGemini(prompt, systemPrompt, config.MEMORY_MODEL);

    let parsed;
    if (typeof result === 'object' && result !== null) {
      parsed = result;
    } else {
      try { parsed = JSON.parse(String(result)); } catch { parsed = {}; }
    }

    // Merge into store
    mergeNodes(parsed.nodes || []);
    mergeEdges(parsed.edges || []);
    mergePatterns(parsed.patterns || []);

    // Extract decisions from decision-type nodes
    for (const node of (parsed.nodes || [])) {
      if (node.type === 'decision') {
        const dec = {
          id:          node.id,
          date:        node.data?.date || new Date().toISOString(),
          meetingId:   event.data.meetingId,
          description: node.label,
          madeBy:      node.data?.madeBy || '',
          status:      node.data?.status || 'pending',
        };
        const dIdx = store.decisions.findIndex(d => d.id === dec.id);
        if (dIdx >= 0) store.decisions[dIdx] = dec;
        else store.decisions.push(dec);
      }
    }

    syncPeopleFromNodes();
    await saveStore();

    console.log('[memory-agent] Memory updated', {
      nodes:    store.nodes.length,
      patterns: store.patterns.length,
      decisions: store.decisions.length,
    });
  } catch (err) {
    console.error('[memory-agent] updateMemory failed', err.message);
    // Still save what we have (the new interaction)
    await saveStore();
  }
}

/**
 * queryMemory — returns relevant context from graph for a query string
 * @param {string} query
 * @returns {{ people: object[], decisions: object[], patterns: object[], summary: string }}
 */
async function queryMemory(query) {
  const store = loadStore();
  const q = (query || '').toLowerCase();

  // Simple keyword filter
  const people = Object.entries(store.people).map(([name, data]) => ({
    id:            data.id,
    name,
    role:          data.role,
    company:       data.company,
    decisionMaker: data.decisionMaker,
    preferences:   data.preferences,
    concerns:      data.concerns,
    lastSeen:      data.lastSeen,
    relationship:  data.relationship,
  })).filter(p => !q || `${p.name} ${p.company} ${p.role}`.toLowerCase().includes(q));

  const decisions = store.decisions.filter(d =>
    !q || `${d.description} ${d.madeBy}`.toLowerCase().includes(q)
  );

  const patterns = store.patterns.filter(p =>
    !q || `${p.description} ${p.type}`.toLowerCase().includes(q)
  );

  return { people, decisions, patterns, summary: null };
}

/**
 * getMemoryStore — returns the full in-memory store snapshot (for API routes)
 */
function getMemoryStore() {
  return loadStore();
}

module.exports = { updateMemory, queryMemory, getMemoryStore };
