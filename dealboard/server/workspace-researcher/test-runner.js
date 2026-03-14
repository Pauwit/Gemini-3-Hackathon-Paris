/**
 * ============================================================
 * workspace-researcher/test-runner.js — Test Suite 
 * ============================================================
 *
 * PURPOSE:
 * Provides a standalone test script to validate the Workspace
 * Researcher Agent's capabilities strictly using mock data
 * without risking changes to real user data.
 * 
 * USE CASES:
 * - Run isolated tests on the terminal: `node test-runner.js`
 * ============================================================
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Setup environment variables from root dir
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { runWorkspaceResearch } = require('./agent');

async function runTests() {
  console.log("==============================================");
  console.log("   Workspace Researcher Agent - DRY RUN API   ");
  console.log("==============================================\n");

  const testQueries = [
    "Trouve moi les emails de alice@partner.com, et donne moi un résumé des événements que j'ai aujourd'hui avec elle.",
    "Cherche le document 'Project Phoenix' sur mondrive et dis-moi de quoi il s'agit, puis regarde si j'ai un événement nommé 'Project Phoenix' pour lequel être prêt.",
    "Donne-moi le résumé de la réunion Meet 'Project Phoenix Kickoff'. Quelles ont été les décisions marquantes ?",
    "Calcule-moi le temps de trajet en voiture entre '10 rue de la Paix, Paris' et 'Station F, Paris'."
  ];

  for (const query of testQueries) {
    console.log(`\n\n>>> TESTING QUERY: "${query}"\n`);
    try {
      // isDryRun flag = true
      const result = await runWorkspaceResearch(query, true);
      console.log("=== RÉPONSE DE L'AGENT ===\n");
      console.log(result);
      console.log("\n==========================");
    } catch (error) {
      console.error("ERREUR:", error);
    }
  }
}

// Execute tests if file is run directly
if (require.main === module) {
  runTests().then(() => {
    console.log("\nTests terminés.");
    process.exit(0);
  });
}

module.exports = {
  runTests
};
