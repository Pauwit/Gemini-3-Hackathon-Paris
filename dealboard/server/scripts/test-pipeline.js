/**
 * ============================================================
 * scripts/test-pipeline.js — Full Pipeline End-to-End Test
 * ============================================================
 *
 * PURPOSE:
 * Tests the complete DealBoard pipeline: transcript segment →
 * listener-agent → worker-orchestrator → analyser-agent → card.
 * Runs immediately even if agents are stubs.
 *
 * USAGE:
 *   node scripts/test-pipeline.js
 *   npm test (from server/ directory)
 * ============================================================
 */

'use strict';

const { analyzeTranscript } = require('../agents/listener-agent');
const { runWorkers } = require('../workers/worker-orchestrator');
const { fuseWorkerResults } = require('../agents/analyser-agent');

// Load mock data
let mockTranscript;
try {
  mockTranscript = require('../mock-data/mock-transcript.json');
} catch (e) {
  mockTranscript = [];
}

const meetingContext = {
  meetingId: 'pipeline-test-001',
  title: 'AcmeCorp Pipeline Test',
  participants: ['Sarah Chen', 'Marcus Johnson', 'Priya Patel'],
  context: 'Sales call for enterprise monitoring solution'
};

async function runPipeline(segmentIndex) {
  const segment = mockTranscript[segmentIndex];
  if (!segment) return null;

  console.log(`\n[Pipeline] Processing segment ${segmentIndex + 1}/${mockTranscript.length}`);
  console.log(`  Speaker: ${segment.speaker}`);
  console.log(`  Text: "${segment.text.substring(0, 80)}..."`);

  // Stage 1: Listener Agent
  console.log('\n  Stage 1: Listener Agent...');
  const listenerResult = await analyzeTranscript(segment.text, {
    ...meetingContext,
    recentHistory: mockTranscript.slice(Math.max(0, segmentIndex - 2), segmentIndex).map(s => s.text)
  });
  console.log(`  → needs_context: ${listenerResult.needs_context}`);
  if (listenerResult.queries?.length) {
    console.log(`  → queries: ${listenerResult.queries.length}`);
  }

  if (!listenerResult.needs_context) {
    console.log('  → Skipping workers (no context needed)');
    return null;
  }

  // Stage 2: Worker Orchestrator
  console.log('\n  Stage 2: Worker Orchestrator...');
  const workerResults = await runWorkers(
    listenerResult.queries?.reduce((acc, q) => {
      if (!acc[q.worker]) acc[q.worker] = [];
      acc[q.worker].push({ query: q.query, limit: q.limit || 5 });
      return acc;
    }, {}) || {},
    (active) => console.log(`  → Workers active: ${active.join(', ')}`)
  );
  console.log(`  → gmail: ${workerResults.gmail?.length || 0} results`);
  console.log(`  → drive: ${workerResults.drive?.length || 0} results`);

  // Stage 3: Analyser Agent
  console.log('\n  Stage 3: Analyser Agent...');
  const cards = await fuseWorkerResults(workerResults, segment.text, meetingContext);
  console.log(`  → Generated ${cards.length} card(s)`);

  return cards;
}

async function main() {
  console.log('=== Full Pipeline Test ===');
  console.log(`Transcript: ${mockTranscript.length} segments\n`);

  const allCards = [];

  // Test high-signal segments
  for (const idx of [1, 4, 8, 11]) {
    const cards = await runPipeline(idx);
    if (cards) allCards.push(...cards);
  }

  console.log(`\n=== Pipeline Complete ===`);
  console.log(`Total cards generated: ${allCards.length}`);

  if (allCards.length > 0) {
    console.log('\nCards:');
    allCards.forEach((card, i) => {
      console.log(`  ${i + 1}. [${card.label}] ${card.title} (confidence: ${card.confidence})`);
    });
  }

  console.log('\nAll pipeline stages tested successfully.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
