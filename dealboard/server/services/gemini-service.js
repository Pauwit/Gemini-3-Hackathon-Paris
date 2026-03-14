/**
 * gemini-service.js — Gemini AI orchestration.
 *
 * Two-step pipeline:
 *   1. Orchestrator  — Gemini decides which sub-agents to call (gmail / drive / calendar)
 *   2. Answer        — Gemini answers using the aggregated workspace context
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

const ORCHESTRATOR_MODEL = 'gemini-3-flash-lite-preview';
const ANSWER_MODEL = 'gemini-3-flash-lite-preview';

/**
 * Step 1 — Orchestrator.
 * Analyzes the question and returns which agents to invoke + their search queries.
 * Now improved to handle transcription errors by cross-referencing known entity names.
 */
async function orchestrate(apiKey, question, knownEntities = []) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: ORCHESTRATOR_MODEL });

  const entityContext = knownEntities.length > 0 
    ? `Known files/projects: ${knownEntities.join(', ')}`
    : '';

  const prompt = `You are an AI orchestrator. The user is in a live meeting.
${entityContext}
User said: "${question}"

Task: Generate MULTIPLE parallel search queries to ensure we find the right data even if the transcript is slightly off.

Respond ONLY with a valid JSON object:
{
  "correctedQuestion": "cleaned transcript",
  "agents": ["gmail", "drive"],
  "queries": {
    "gmail": ["primary search", "alternative search 1", "alternative search 2"],
    "drive": ["primary search", "alternative search 1", "alternative search 2"],
    "calendar": true
  }
}

Rules:
- Provide 2-3 distinct queries per agent to cover different naming conventions.
- Use the known entities to guide the queries.`;

  logger.debug('Orchestrator generating multi-queries...');
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Orchestrator returned invalid JSON');

  return JSON.parse(jsonMatch[0]);
}

/**
 * Step 2 — Final answer.
 * Uses the aggregated workspace context to answer the user's question.
 */
async function answerWithContext(apiKey, question, workspaceData) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: ANSWER_MODEL });

  const context = formatWorkspaceContext(workspaceData);
  const hasData = workspaceData.sourcesUsed.length > 0;

  const prompt = `You are a live meeting assistant. Your job is to provide ULTRA-CONCISE insights.

${hasData
    ? `WORKSPACE DATA:\n${context}`
    : 'No data found.'}

USER TOPIC: "${question}"

STRICT RULES:
1. NO INTROS (No "Bonjour", "Based on...", "I found..."). Start directly with the fact.
2. ONE SENTENCE MAX for the core info.
3. Use a clear, short title.
4. If no specific data is found, respond with "NULL_VOID".
5. Mention the source (e.g., [Drive] or [Gmail]) at the end.

FORMAT:
TITLE: <Short Title>
INSIGHT: <One punchy sentence> (<Source>)`;

  logger.debug('Generating surgical live answer...');
  const result = await model.generateContent(prompt);
  let answer = result.response.text().trim();
  
  if (answer.includes('NULL_VOID')) return { answer: null, sources: [] };

  logger.info('Live answer generated');

  return {
    answer,
    sources: workspaceData.sourcesUsed,
  };
}

/**
 * Formats workspace data into a readable context string for the prompt.
 */
function formatWorkspaceContext({ emails, docs, events }) {
  const parts = [];

  if (emails.length > 0) {
    parts.push('=== GMAIL EMAILS ===');
    emails.forEach((email, i) => {
      parts.push(`Email ${i + 1}:`);
      parts.push(`  From: ${email.from}`);
      parts.push(`  Date: ${email.date}`);
      parts.push(`  Subject: ${email.subject}`);
      parts.push(`  Preview: ${email.snippet}`);
      if (email.body) parts.push(`  Body: ${email.body}`);
    });
  }

  if (docs.length > 0) {
    parts.push('\n=== GOOGLE DRIVE DOCUMENTS ===');
    docs.forEach((doc, i) => {
      parts.push(`Document ${i + 1}: ${doc.name}`);
      parts.push(`  Modified: ${doc.modifiedTime}`);
      if (doc.content) parts.push(`  Content: ${doc.content}`);
      if (doc.link) parts.push(`  Link: ${doc.link}`);
    });
  }

  if (events.length > 0) {
    parts.push('\n=== GOOGLE CALENDAR EVENTS ===');
    events.forEach((event, i) => {
      parts.push(`Event ${i + 1}: ${event.summary}`);
      parts.push(`  Start: ${event.start}`);
      parts.push(`  End: ${event.end}`);
      if (event.attendees) parts.push(`  Attendees: ${event.attendees}`);
      if (event.location) parts.push(`  Location: ${event.location}`);
      if (event.description) parts.push(`  Description: ${event.description}`);
    });
  }

  return parts.length > 0 ? parts.join('\n') : 'No relevant workspace data found.';
}

module.exports = { orchestrate, answerWithContext };
