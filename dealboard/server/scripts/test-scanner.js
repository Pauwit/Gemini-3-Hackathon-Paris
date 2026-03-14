/**
 * ============================================================
 * scripts/test-scanner.js — Scanner and Data Store Integration Tests
 * ============================================================
 *
 * PURPOSE:
 * Self-contained test script that verifies the async scanner,
 * data store persistence, meeting save/retrieve, and chat
 * history functionality in USE_MOCK=true mode.
 * Cleans up the test store file after completion.
 *
 * USAGE:
 *   node scripts/test-scanner.js
 *
 * DEPENDENCIES:
 *   async/data-store, async/scanner (loaded after env vars are set)
 * ============================================================
 */

'use strict';

// Set env vars BEFORE any require() calls
process.env.USE_MOCK = 'true';
process.env.NODE_ENV = 'test';
process.env.DATA_STORE_PATH = './data/test-store.json';
process.env.ENABLE_ASYNC_SCANNER = 'false'; // Don't start interval during tests

const path = require('path');
const fs = require('fs');

// ── Test utilities ────────────────────────────────────────────

let passed = 0;
let failed = 0;

function pass(name) {
  console.log(`  PASS  ${name}`);
  passed++;
}

function fail(name, reason) {
  console.error(`  FAIL  ${name}`);
  console.error(`        Reason: ${reason}`);
  failed++;
}

/**
 * assert — simple assertion helper
 * @param {boolean} condition
 * @param {string} testName
 * @param {string} [failMsg]
 */
function assert(condition, testName, failMsg = 'Assertion failed') {
  if (condition) {
    pass(testName);
  } else {
    fail(testName, failMsg);
  }
}

/**
 * cleanup — removes the test store file
 */
function cleanup() {
  const testStorePath = path.resolve(process.cwd(), './data/test-store.json');
  if (fs.existsSync(testStorePath)) {
    try {
      fs.unlinkSync(testStorePath);
      console.log('\n  [cleanup] Removed test store file:', testStorePath);
    } catch (err) {
      console.warn('\n  [cleanup] Could not remove test store file:', err.message);
    }
  }
}

// ── Main test runner ──────────────────────────────────────────

async function runTests() {
  console.log('\n=== DealBoard Scanner & Data Store Tests (USE_MOCK=true) ===\n');

  // Ensure clean state
  cleanup();

  // Lazy-load after env vars are set
  const dataStore = require('../async/data-store');
  const { runScanCycle } = require('../async/scanner');

  // ── Data Store Initialization ────────────────────────────

  console.log('Data Store — Initialization:');

  {
    await dataStore.initialize();
    pass('initialize() — completes without error');

    const store = dataStore.getFullStore();
    assert(store && typeof store === 'object', 'initialize() — returns object from getFullStore()');
    assert(Array.isArray(store.workspace.emails), 'initialize() — workspace.emails is array');
    assert(Array.isArray(store.meetings), 'initialize() — meetings is array');
    assert(store.meta && store.meta.createdAt, 'initialize() — meta.createdAt is set');
  }

  // ── Workspace Updates ────────────────────────────────────

  console.log('\nData Store — Workspace Updates:');

  {
    const testEmails = [
      { id: 'test-1', subject: 'Test Email', from: 'test@test.com', body: 'Hello world', date: '2026-01-01' }
    ];
    dataStore.updateEmails(testEmails);
    const workspace = dataStore.getWorkspace();
    assert(workspace.emails.length === 1, 'updateEmails() — stores emails');
    assert(workspace.emails[0].id === 'test-1', 'updateEmails() — correct email stored');
    assert(workspace.lastScanTime !== null, 'updateEmails() — sets lastScanTime');
  }

  {
    const testDocs = [
      { id: 'doc-1', name: 'Test Document', content: 'Some content', mimeType: 'text/plain' }
    ];
    dataStore.updateDocuments(testDocs);
    const workspace = dataStore.getWorkspace();
    assert(workspace.documents.length === 1, 'updateDocuments() — stores documents');
  }

  {
    const testEvents = [
      { id: 'cal-1', title: 'Test Meeting', start: '2026-03-20T14:00:00Z', attendees: [] }
    ];
    dataStore.updateCalendar(testEvents);
    const workspace = dataStore.getWorkspace();
    assert(workspace.calendar.length === 1, 'updateCalendar() — stores events');
  }

  // ── Persistence ───────────────────────────────────────────

  console.log('\nData Store — Persistence:');

  {
    await dataStore.saveToDisk();
    const testStorePath = path.resolve(process.cwd(), './data/test-store.json');
    const exists = fs.existsSync(testStorePath);
    assert(exists, 'saveToDisk() — creates JSON file');

    if (exists) {
      const raw = fs.readFileSync(testStorePath, 'utf-8');
      let parsed;
      try {
        parsed = JSON.parse(raw);
        pass('saveToDisk() — file contains valid JSON');
      } catch {
        fail('saveToDisk() — file contains valid JSON', 'JSON.parse threw');
        parsed = null;
      }

      if (parsed) {
        assert(
          parsed.workspace && Array.isArray(parsed.workspace.emails),
          'saveToDisk() — persisted workspace.emails array'
        );
      }
    }
  }

  // ── Meeting Save/Retrieve ─────────────────────────────────

  console.log('\nData Store — Meetings:');

  {
    const testMeeting = {
      id: 'meeting-test-001',
      title: 'AcmeCorp Technical Demo',
      startedAt: '2026-03-20T14:00:00Z',
      state: 'ended',
      participants: ['sarah.chen@ourcompany.com', 'thomas.martin@acmecorp.com'],
    };

    dataStore.saveMeeting(testMeeting);
    const retrieved = dataStore.getMeeting('meeting-test-001');
    assert(retrieved !== null, 'saveMeeting() + getMeeting() — round-trips meeting');
    assert(retrieved?.title === 'AcmeCorp Technical Demo', 'getMeeting() — correct title');
    assert(retrieved?.state === 'ended', 'getMeeting() — correct state');

    // Test upsert
    dataStore.saveMeeting({ id: 'meeting-test-001', state: 'active' });
    const updated = dataStore.getMeeting('meeting-test-001');
    assert(updated?.state === 'active', 'saveMeeting() upsert — updates existing meeting');
    assert(updated?.title === 'AcmeCorp Technical Demo', 'saveMeeting() upsert — preserves existing fields');

    const list = dataStore.getMeetingsList();
    assert(list.length >= 1, 'getMeetingsList() — returns non-empty list');
  }

  {
    // Missing ID should not throw
    try {
      dataStore.saveMeeting({ title: 'No ID Meeting' });
      pass('saveMeeting(no id) — does not throw');
    } catch (err) {
      fail('saveMeeting(no id) — does not throw', err.message);
    }
  }

  // ── Chat History ──────────────────────────────────────────

  console.log('\nData Store — Chat History:');

  {
    dataStore.pushChatMessage({ role: 'user', content: 'What is the deal status?' });
    dataStore.pushChatMessage({ role: 'assistant', content: 'The AcmeCorp deal is at risk but progressing.' });
    dataStore.pushChatMessage({ role: 'user', content: 'What should I do next?' });

    const history = dataStore.getChatHistory(10);
    assert(history.length >= 3, 'pushChatMessage() + getChatHistory() — stores and retrieves messages');
    assert(history[0].role === 'user', 'getChatHistory() — first message is user');
    assert(typeof history[0].timestamp === 'string', 'getChatHistory() — messages have timestamps');
  }

  {
    // getChatHistory limit
    const limited = dataStore.getChatHistory(2);
    assert(limited.length === 2, 'getChatHistory(limit=2) — respects limit');
  }

  // ── Insights ──────────────────────────────────────────────

  console.log('\nData Store — Insights:');

  {
    const testInsights = {
      peopleBriefings: [{ id: 'p-1', name: 'Test Person', title: 'CTO', company: 'TestCo', summary: 'Test' }],
      projectUpdates: [{ id: 'proj-1', name: 'Test Deal', status: 'on_track', summary: 'Going well' }],
      strategicAdvice: [{ id: 'a-1', priority: 'high', title: 'Do something', advice: 'Do it now' }],
      lastGeneratedAt: new Date().toISOString(),
    };

    dataStore.updateInsights(testInsights);
    const insights = dataStore.getInsights();
    assert(insights.peopleBriefings.length === 1, 'updateInsights() + getInsights() — stores people briefings');
    assert(insights.projectUpdates.length === 1, 'updateInsights() + getInsights() — stores project updates');
    assert(insights.strategicAdvice.length === 1, 'updateInsights() + getInsights() — stores strategic advice');
    assert(insights.lastGeneratedAt !== null, 'updateInsights() — sets lastGeneratedAt');
  }

  // ── Full Scan Cycle ───────────────────────────────────────

  console.log('\nScanner — runScanCycle():');

  {
    // Reset workspace to empty first to verify scan populates it
    dataStore.updateEmails([]);
    dataStore.updateDocuments([]);
    dataStore.updateCalendar([]);

    let scanError = null;
    try {
      await runScanCycle();
      pass('runScanCycle() — completes without error');
    } catch (err) {
      scanError = err;
      fail('runScanCycle() — completes without error', err.message);
    }

    if (!scanError) {
      const workspace = dataStore.getWorkspace();
      assert(Array.isArray(workspace.emails), 'runScanCycle() — workspace.emails is array after scan');
      assert(workspace.emails.length > 0, 'runScanCycle() — workspace populated with mock emails');
      assert(Array.isArray(workspace.documents), 'runScanCycle() — workspace.documents is array after scan');
      assert(workspace.documents.length > 0, 'runScanCycle() — workspace populated with mock documents');

      const insights = dataStore.getInsights();
      assert(
        insights.peopleBriefings.length > 0 || insights.strategicAdvice.length > 0,
        'runScanCycle() — insights populated after scan'
      );
    }
  }

  {
    // Verify data was persisted after scan
    const testStorePath = path.resolve(process.cwd(), './data/test-store.json');
    const exists = fs.existsSync(testStorePath);
    assert(exists, 'runScanCycle() — persists store to disk after scan');
  }

  // ── Cleanup ───────────────────────────────────────────────

  cleanup();

  // ── Summary ───────────────────────────────────────────────

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('\nTest runner crashed:', err.message);
  console.error(err.stack);
  cleanup();
  process.exit(1);
});
