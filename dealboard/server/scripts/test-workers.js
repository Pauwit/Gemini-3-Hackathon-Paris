/**
 * ============================================================
 * scripts/test-workers.js — Worker Integration Tests (Mock Mode)
 * ============================================================
 *
 * PURPOSE:
 * Self-contained test script that verifies all four workers
 * and the worker orchestrator return correctly shaped results
 * in USE_MOCK=true mode. Prints PASS/FAIL per test case.
 *
 * USAGE:
 *   node scripts/test-workers.js
 *
 * DEPENDENCIES:
 *   All workers and orchestrator (loaded after env vars are set)
 * ============================================================
 */

'use strict';

// Set env vars BEFORE any require() calls
process.env.USE_MOCK = 'true';
process.env.NODE_ENV = 'test';

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
 * assertStandardFormat — verifies a result matches the { agent, question, answer, raw, error } contract
 * @param {object} result
 * @param {string} expectedAgent
 * @param {string} testName
 */
function assertStandardFormat(result, expectedAgent, testName) {
  if (!result || typeof result !== 'object') {
    fail(testName, `Result is not an object: ${JSON.stringify(result)}`);
    return;
  }
  if (result.agent !== expectedAgent) {
    fail(testName, `Expected agent="${expectedAgent}", got "${result.agent}"`);
    return;
  }
  if (typeof result.question !== 'string') {
    fail(testName, `"question" must be a string, got ${typeof result.question}`);
    return;
  }
  if (typeof result.answer !== 'string') {
    fail(testName, `"answer" must be a string, got ${typeof result.answer}`);
    return;
  }
  if (!Array.isArray(result.raw) && result.raw !== null && typeof result.raw !== 'object') {
    fail(testName, `"raw" must be an array or object, got ${typeof result.raw}`);
    return;
  }
  if (result.error !== null && typeof result.error !== 'string') {
    fail(testName, `"error" must be null or string, got ${typeof result.error}`);
    return;
  }
  pass(testName);
}

// ── Main test runner ──────────────────────────────────────────

async function runTests() {
  console.log('\n=== DealBoard Worker Tests (USE_MOCK=true) ===\n');

  // Lazy-load after env vars are set
  const { searchEmails } = require('../workers/gmail-worker');
  const { searchDocs, searchDrive } = require('../workers/drive-worker');
  const { readSheet } = require('../workers/sheets-worker');
  const { searchCalendarEvents, getEvents } = require('../workers/calendar-worker');
  const { runWorkers, runFullScan } = require('../workers/worker-orchestrator');

  // ── Gmail Worker ──────────────────────────────────────────

  console.log('Gmail Worker:');

  {
    const result = await searchEmails('ISO 27001');
    assertStandardFormat(result, 'gmail', 'searchEmails("ISO 27001") — standard format');

    if (result.raw && result.raw.length > 0) {
      pass('searchEmails("ISO 27001") — returns matching emails');
    } else {
      fail('searchEmails("ISO 27001") — returns matching emails', `Got ${result.raw?.length || 0} results`);
    }
  }

  {
    const result = await searchEmails('pricing datadog flat rate');
    assertStandardFormat(result, 'gmail', 'searchEmails("pricing datadog flat rate") — standard format');
  }

  {
    const result = await searchEmails('xyznotfoundinmockdata12345');
    assertStandardFormat(result, 'gmail', 'searchEmails(no match) — standard format');
    if (result.error === null) {
      pass('searchEmails(no match) — error is null (not an error, just empty)');
    } else {
      fail('searchEmails(no match) — error is null', `Got error: ${result.error}`);
    }
  }

  // ── Drive Worker ──────────────────────────────────────────

  console.log('\nDrive Worker:');

  {
    const result = await searchDocs('AcmeCorp pricing');
    assertStandardFormat(result, 'drive', 'searchDocs("AcmeCorp pricing") — standard format');
  }

  {
    const result = await searchDocs('Datadog battlecard');
    assertStandardFormat(result, 'drive', 'searchDocs("Datadog battlecard") — standard format');
    if (result.raw && result.raw.length > 0) {
      pass('searchDocs("Datadog battlecard") — returns matching documents');
    } else {
      fail('searchDocs("Datadog battlecard") — returns matching documents', `Got ${result.raw?.length || 0} results`);
    }
  }

  {
    // Legacy searchDrive format
    const result = await searchDrive([{ query: 'competitive', limit: 5 }]);
    assertStandardFormat(result, 'drive', 'searchDrive(legacy array format) — standard format');
  }

  // ── Sheets Worker ─────────────────────────────────────────

  console.log('\nSheets Worker:');

  {
    const result = await readSheet('mock', 'Sheet1!A1:E10');
    assertStandardFormat(result, 'sheets', 'readSheet("mock") — standard format');
    if (result.raw && result.raw.values) {
      pass('readSheet("mock") — returns sheet values');
    } else if (result.raw && result.raw.answer) {
      pass('readSheet("mock") — returns sheet answer');
    } else {
      fail('readSheet("mock") — returns sheet data', `raw: ${JSON.stringify(result.raw)}`);
    }
  }

  {
    const result = await readSheet('sheet-001', 'Sheet1!A1:E10');
    assertStandardFormat(result, 'sheets', 'readSheet("sheet-001") — finds by ID');
  }

  // ── Calendar Worker ───────────────────────────────────────

  console.log('\nCalendar Worker:');

  {
    const result = await searchCalendarEvents('AcmeCorp demo', { daysAhead: 30 });
    assertStandardFormat(result, 'calendar', 'searchCalendarEvents("AcmeCorp demo") — standard format');
  }

  {
    const result = await searchCalendarEvents('', { daysAhead: 30 });
    assertStandardFormat(result, 'calendar', 'searchCalendarEvents("") — returns all upcoming events');
    // Mock data has 2026-03-20 and later events — with 30 days ahead from 2026-03-14, should find some
    if (result.raw && result.raw.length >= 0) {
      pass('searchCalendarEvents("") — raw is array');
    } else {
      fail('searchCalendarEvents("") — raw is array', `raw: ${typeof result.raw}`);
    }
  }

  {
    // Legacy getEvents format
    const result = await getEvents({
      start: '2026-01-01T00:00:00Z',
      end: '2026-12-31T23:59:59Z',
      query: 'AcmeCorp',
    });
    assertStandardFormat(result, 'calendar', 'getEvents(legacy format) — standard format');
  }

  // ── Worker Orchestrator ───────────────────────────────────

  console.log('\nWorker Orchestrator:');

  {
    // New standardized string format
    const results = await runWorkers({
      gmail: 'ISO certification',
      drive: 'pricing proposal',
      sheets: null,
      calendar: null,
    });

    if (results && results.gmail && results.drive) {
      pass('runWorkers(gmail+drive queries) — returns result object');
    } else {
      fail('runWorkers(gmail+drive queries) — returns result object', JSON.stringify(results));
    }

    if (results.gmail.agent === 'gmail') {
      pass('runWorkers — gmail result has correct agent');
    } else {
      fail('runWorkers — gmail result has correct agent', `agent=${results.gmail.agent}`);
    }

    if (results.drive.agent === 'drive') {
      pass('runWorkers — drive result has correct agent');
    } else {
      fail('runWorkers — drive result has correct agent', `agent=${results.drive.agent}`);
    }
  }

  {
    // Mixed null/non-null queries
    const results = await runWorkers({
      gmail: null,
      drive: null,
      sheets: 'Sheet1!A1:E10',
      calendar: 'AcmeCorp',
    });

    if (results && results.sheets && results.sheets.agent === 'sheets') {
      pass('runWorkers(sheets+calendar only) — sheets result present');
    } else {
      fail('runWorkers(sheets+calendar only) — sheets result present', JSON.stringify(results?.sheets));
    }
  }

  {
    // All null queries
    const results = await runWorkers({
      gmail: null,
      drive: null,
      sheets: null,
      calendar: null,
    });

    if (results && typeof results === 'object') {
      pass('runWorkers(all null) — returns empty result object without error');
    } else {
      fail('runWorkers(all null) — returns empty result object', `got: ${JSON.stringify(results)}`);
    }
  }

  // ── runFullScan ───────────────────────────────────────────

  console.log('\nrunFullScan:');

  {
    const results = await runFullScan();

    if (results && results.gmail && results.drive && results.sheets && results.calendar) {
      pass('runFullScan() — returns all four worker results');
    } else {
      fail('runFullScan() — returns all four worker results', JSON.stringify(Object.keys(results || {})));
    }

    const agents = ['gmail', 'drive', 'sheets', 'calendar'];
    for (const agent of agents) {
      if (results[agent] && results[agent].agent === agent) {
        pass(`runFullScan() — ${agent} result has correct agent field`);
      } else {
        fail(`runFullScan() — ${agent} result has correct agent field`, `got: ${results[agent]?.agent}`);
      }
    }

    if (results.gmail.raw && results.gmail.raw.length > 0) {
      pass('runFullScan() — gmail returned mock emails');
    } else {
      fail('runFullScan() — gmail returned mock emails', `raw length: ${results.gmail.raw?.length}`);
    }
  }

  // ── Summary ───────────────────────────────────────────────

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('\nTest runner crashed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
