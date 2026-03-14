/**
 * ============================================================
 * workspace-researcher/agent.js — Core Agent Logic
 * ============================================================
 *
 * PURPOSE:
 * Initializes the Google Generative AI (Gemini) client with the 
 * defined Workspace tools (Gmail, Drive, Calendar). Handles the 
 * function calling loop until a final Markdown response is 
 * formulated according to zero-hallucination constraints.
 * 
 * USE CASES:
 * - Instantiate the LLM with `RESEARCHER_MODEL`
 * - Provide system prompt constraints via `workspace-researcher-prompt.txt`
 * - Manage the invocation and recursive tool calling flow
 * ============================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

// Import Tools
const gmailTool = require('./tools/gmail');
const driveTool = require('./tools/drive');
const calendarTool = require('./tools/calendar');
const meetTool = require('./tools/meet');
const mapsTool = require('./tools/maps');

let genAI = null;

// The combined functions Map allows us to dynamically call the right tool
const availableFunctions = {
  [gmailTool.declaration.name]: gmailTool.execute,
  [driveTool.declaration.name]: driveTool.execute,
  [calendarTool.declaration.name]: calendarTool.execute,
  [meetTool.declaration.name]: meetTool.execute,
  [mapsTool.declaration.name]: mapsTool.execute,
};

// The tool definitions array for the Gemini API
const tools = [
  {
    functionDeclarations: [
      gmailTool.declaration,
      driveTool.declaration,
      calendarTool.declaration,
      meetTool.declaration,
      mapsTool.declaration
    ]
  }
];

/**
 * runWorkspaceResearch
 * 
 * @param {string} query Orchestrator's research request
 * @param {boolean} isDryRun Tests flag (default false) avoids live credentials
 * @returns {Promise<string>} The structured Markdown response
 */
async function runWorkspaceResearch(query, isDryRun = false) {
  if (!genAI) {
    if (!config.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing from environment/config.");
    }
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }

  const promptPath = path.join(__dirname, '..', config.PROMPTS_DIR, 'workspace-researcher-prompt.txt');
  const systemInstruction = fs.readFileSync(promptPath, 'utf8');

  // Initialize the model
  const model = genAI.getGenerativeModel({
    model: config.RESEARCHER_MODEL,
    systemInstruction,
    tools
  });

  const chat = model.startChat();
  
  // Start the prompt
  console.log(`[workspace-researcher/agent] Sending prompt to agent: "${query}"`);
  
  let attempts = 0;
  const maxAttempts = 5;
  let response = await chat.sendMessage(query);
  
  // Function calling loop
  while (attempts < maxAttempts) {
    const call = response.response.functionCalls() ? response.response.functionCalls()[0] : null;
    
    if (call) {
      const functionName = call.name;
      const args = call.args;
      
      console.log(`[workspace-researcher/agent] Tool Call => ${functionName}(${JSON.stringify(args)})`);
      
      const fn = availableFunctions[functionName];
      if (!fn) {
        throw new Error(`Unknown function call: ${functionName}`);
      }

      // Execute tool
      const apiResponse = await fn(args, isDryRun);
      
      console.log(`[workspace-researcher/agent] Tool Response Data => Returning to model...`);

      // Return result to model
      response = await chat.sendMessage([{
        functionResponse: {
          name: functionName,
          response: { 
            result: apiResponse 
          }
        }
      }]);
      attempts++;
    } else {
      // No more function calls, means the model produced the final output.
      break;
    }
  }

  return response.response.text();
}

module.exports = {
  runWorkspaceResearch
};
