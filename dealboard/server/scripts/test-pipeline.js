'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Setup environment variables from root dir
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { analyzeTranscript } = require('../agents/listener-agent');
const { processResearchRequest } = require('../workspace-researcher/index');
const { fuseWorkerResults } = require('../agents/analyser-agent');

const mockMeetingContext = {
  meetingId: 'mtg_test_123',
  platform: 'Google Meet',
  participants: ['Alice Smith', 'Bob Jones'],
  title: 'Project Phoenix Sync',
  context: 'Quarterly review and planning. Discussing Datadog alternatives and roadmap.'
};

const testTranscripts = [
  "Hi everyone, thanks for joining.", // Should not trigger
  "We are currently paying $50k/mo for Datadog and it's too expensive.", // Should trigger
];

async function runPipelineTests() {
  console.log("==================================================");
  console.log("   Meeting Processor Pipeline Test (End-to-End)   ");
  console.log("==================================================\n");

  for (const transcript of testTranscripts) {
    console.log(`\n\n>>> TESTING TRANSCRIPT: "${transcript}"\n`);
    
    // 1. Listener Agent
    console.log("--- 1. LISTENER AGENT ---");
    const decision = await analyzeTranscript(transcript, mockMeetingContext);
    console.log(JSON.stringify(decision, null, 2));

    if (decision.needs_context && decision.queries.length > 0) {
      // 2. Workspace Researcher
      console.log("\n--- 2. WORKSPACE RESEARCHER ---");
      const primaryQuery = decision.queries[0].query;
      console.log(`Querying Workspace: "${primaryQuery}"`);
      const workerResults = await processResearchRequest(primaryQuery);
      console.log(`Got workspace results: (Length: ${workerResults.length} chars)`);

      // 3. Analyser Agent
      console.log("\n--- 3. ANALYSER AGENT ---");
      const cards = await fuseWorkerResults(workerResults, transcript, mockMeetingContext);
      console.log(`Generated ${cards.length} cards:`);
      cards.forEach(card => {
        console.log(`\n[${card.label} / ${card.priority}] ${card.title}`);
        console.log(`Summary: ${card.summary}`);
        console.log(`Details:`, card.details);
      });
      
    } else {
      console.log("\n➔ Pipeline stopped: No context needed for this segment.");
    }
  }
}

if (require.main === module) {
  runPipelineTests().then(() => {
    console.log("\nTests terminés.");
    process.exit(0);
  });
}
