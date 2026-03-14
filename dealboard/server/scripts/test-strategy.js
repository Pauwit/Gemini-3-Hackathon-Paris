/**
 * ============================================================
 * scripts/test-strategy.js — Strategy Agent Test Script
 * ============================================================
 *
 * PURPOSE:
 * Tests the Strategy Agent with a complete mock meeting dataset.
 * Generates all four document types and prints them to console.
 *
 * USAGE:
 *   node scripts/test-strategy.js
 *   GEMINI_API_KEY=your_key node scripts/test-strategy.js
 *   node scripts/test-strategy.js --type summary
 * ============================================================
 */

'use strict';

const { generateDocuments } = require('../agents/strategy-agent');

// Load mock data
let mockTranscript;
try {
  mockTranscript = require('../mock-data/mock-transcript.json');
} catch (e) {
  mockTranscript = [];
}

let mockMemory;
try {
  mockMemory = require('../mock-data/mock-memory.json');
} catch (e) {
  mockMemory = {};
}

// Build a complete meeting data object
const mockMeetingData = {
  meetingId: 'test-meeting-001',
  title: 'AcmeCorp Q1 Sales Review with TechVentures',
  date: '2024-01-15T10:00:00Z',
  duration: 60,
  participants: ['Sarah Chen', 'Marcus Johnson', 'Priya Patel'],
  transcript: mockTranscript,
  cards: [
    {
      cardId: 'card-001',
      label: 'BATTLECARD',
      title: 'Datadog Cost Comparison',
      summary: 'TechVentures pays $50k/mo for Datadog. Our equivalent plan is $28k/mo — 44% savings.',
      confidence: 0.92
    },
    {
      cardId: 'card-002',
      label: 'ALERT',
      title: 'EU Compliance Blocker',
      summary: 'SOC 2 Type II report and DPA required before contract sign-off.',
      confidence: 0.95
    }
  ],
  memoryContext: mockMemory
};

// Allow filtering document type via CLI arg
const args = process.argv.slice(2);
const typeIndex = args.indexOf('--type');
const documentTypes = typeIndex >= 0 && args[typeIndex + 1]
  ? [args[typeIndex + 1]]
  : ['summary', 'follow-up-email', 'strategy-brief', 'decision-log'];

async function main() {
  console.log('=== Strategy Agent Test ===\n');
  console.log(`Meeting: ${mockMeetingData.title}`);
  console.log(`Transcript: ${mockTranscript.length} segments`);
  console.log(`Cards: ${mockMeetingData.cards.length}`);
  console.log(`Generating: ${documentTypes.join(', ')}\n`);

  try {
    const documents = await generateDocuments(mockMeetingData, documentTypes);
    console.log(`Generated ${documents.length} document(s):\n`);

    for (const doc of documents) {
      console.log(`--- ${doc.type}: ${doc.title} ---`);
      console.log(doc.content);
      console.log('');
    }
  } catch (err) {
    console.error('Error generating documents:', err.message);
  }

  console.log('=== Test Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
