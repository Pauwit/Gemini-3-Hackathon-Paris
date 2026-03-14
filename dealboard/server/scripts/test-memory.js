/**
 * ============================================================
 * scripts/test-memory.js — Memory Agent Test Script
 * ============================================================
 *
 * PURPOSE:
 * Tests the Memory Agent's read and write operations.
 * Simulates a meeting-end event, then queries the graph.
 *
 * USAGE:
 *   node scripts/test-memory.js
 *   GEMINI_API_KEY=your_key node scripts/test-memory.js
 * ============================================================
 */

'use strict';

const { updateMemory, queryMemory } = require('../agents/memory-agent');

// Mock meeting-ended event
const mockEvent = {
  type: 'meeting-ended',
  data: {
    meetingId: 'test-meeting-001',
    title: 'AcmeCorp Q1 Sales Review with TechVentures',
    date: '2024-01-15T10:00:00Z',
    participants: ['Sarah Chen', 'Marcus Johnson', 'Priya Patel'],
    keyDecisions: [
      'TechVentures to evaluate phased migration from Datadog',
      'AcmeCorp to send SOC 2 Type II report and DPA by EOW',
      'Follow-up demo of Kubernetes integration scheduled for Jan 29'
    ],
    newPeople: [
      { name: 'Priya Patel', role: 'VP Engineering', company: 'TechVentures' }
    ]
  }
};

async function main() {
  console.log('=== Memory Agent Test ===\n');

  // Test updateMemory
  console.log('--- Test 1: updateMemory ---');
  console.log('Event:', mockEvent.type);
  try {
    await updateMemory(mockEvent);
    console.log('updateMemory completed (no error)\n');
  } catch (err) {
    console.error('updateMemory error:', err.message, '\n');
  }

  // Test queryMemory — known account
  console.log('--- Test 2: queryMemory (known account) ---');
  try {
    const result = await queryMemory('What do we know about TechVentures and Marcus Johnson?');
    console.log('Query result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('queryMemory error:', err.message);
  }

  // Test queryMemory — patterns
  console.log('\n--- Test 3: queryMemory (patterns) ---');
  try {
    const result = await queryMemory('What objection patterns have we seen from TechVentures?');
    console.log('Query result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('queryMemory error:', err.message);
  }

  console.log('\n=== Test Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
