/**
 * ============================================================
 * scripts/test-analyser.js — Analyser Agent Test Script
 * ============================================================
 *
 * PURPOSE:
 * Tests the Analyser Agent with mock worker results and transcript.
 * Simulates what the Analyser receives after workers have fetched GWS data.
 *
 * USAGE:
 *   node scripts/test-analyser.js
 *   GEMINI_API_KEY=your_key node scripts/test-analyser.js
 * ============================================================
 */

'use strict';

const { fuseWorkerResults } = require('../agents/analyser-agent');

// Simulate worker results (what gmail-worker + drive-worker would return)
const mockWorkerResults = {
  gmail: [
    {
      id: 'msg-001',
      subject: 'RE: AcmeCorp Monitoring Proposal - Pricing',
      from: 'marcus.johnson@techventures.io',
      date: '2023-11-21',
      snippet: 'The $28k number looks competitive. Main concern is the migration effort...',
      body: 'Sarah, the pricing proposal looks good. Our CFO is asking about 3-year TCO. Also, our legal team needs the DPA before we can move forward. EU data residency is non-negotiable for us.'
    }
  ],
  drive: [
    {
      id: 'file-001',
      name: 'Datadog_vs_AcmeCorp_Battlecard_2024.pdf',
      mimeType: 'application/pdf',
      content: 'Datadog Enterprise pricing: $23/host/month base. Custom metrics: $0.05/100 metrics. For 200 hosts + custom metrics, typical bill: $48,000-55,000/month. AcmeCorp Enterprise: $28,000/month flat for up to 250 hosts. Unlimited custom metrics included.',
      modifiedTime: '2024-01-10T09:00:00Z'
    }
  ],
  sheets: [],
  calendar: []
};

const triggeringTranscript = "We're currently spending about $50k monthly on Datadog and the costs keep climbing as we scale.";

const meetingContext = {
  meetingId: 'test-meeting-001',
  participants: ['Sarah Chen', 'Marcus Johnson'],
  speaker: 'Marcus Johnson'
};

async function main() {
  console.log('=== Analyser Agent Test ===\n');
  console.log('Triggering transcript:', triggeringTranscript);
  console.log('\nWorker results loaded:');
  console.log(`  Gmail: ${mockWorkerResults.gmail.length} emails`);
  console.log(`  Drive: ${mockWorkerResults.drive.length} files`);
  console.log('');

  try {
    const cards = await fuseWorkerResults(mockWorkerResults, triggeringTranscript, meetingContext);
    console.log(`Generated ${cards.length} card(s):`);
    console.log(JSON.stringify(cards, null, 2));
  } catch (err) {
    console.error('Error fusing results:', err.message);
  }

  console.log('\n=== Test Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
