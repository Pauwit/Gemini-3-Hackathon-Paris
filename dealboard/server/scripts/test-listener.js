/**
 * ============================================================
 * scripts/test-listener.js — Listener Agent Test Script
 * ============================================================
 *
 * PURPOSE:
 * Tests the Listener Agent with mock transcript data.
 * Runs immediately with: node scripts/test-listener.js
 *
 * USAGE:
 *   node scripts/test-listener.js
 *   GEMINI_API_KEY=your_key node scripts/test-listener.js
 * ============================================================
 */

'use strict';

const path = require('path');

// Load mock data
let mockTranscript;
try {
  mockTranscript = require('../mock-data/mock-transcript.json');
} catch (e) {
  console.error('[test-listener] Failed to load mock-transcript.json:', e.message);
  process.exit(1);
}

const { analyzeTranscript } = require('../agents/listener-agent');

async function main() {
  console.log('=== Listener Agent Test ===\n');
  console.log(`Loaded ${mockTranscript.length} transcript segments\n`);

  const meetingContext = {
    meetingId: 'test-meeting-001',
    title: 'AcmeCorp Q1 Sales Review with TechVentures',
    participants: ['Sarah Chen', 'Marcus Johnson', 'Priya Patel'],
    context: 'Sales call for enterprise monitoring solution — prospect evaluating vs Datadog',
  };

  // Test each segment that should trigger context fetching
  const triggerSegments = [4, 8, 11]; // indices of high-signal segments

  for (const idx of triggerSegments) {
    const segment = mockTranscript[idx];
    if (!segment) continue;

    console.log(`--- Segment ${idx + 1}: ${segment.speaker} ---`);
    console.log(`"${segment.text}"\n`);

    try {
      const result = await analyzeTranscript(segment.text, {
        ...meetingContext,
        recentHistory: mockTranscript.slice(Math.max(0, idx - 2), idx).map(s => s.text),
      });

      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Error analyzing segment:', err.message);
    }

    console.log('');
  }

  console.log('=== Test Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
