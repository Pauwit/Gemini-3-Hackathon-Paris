/**
 * gemini-service.js — Gemini AI orchestration.
 *
 * Two-step pipeline:
 *   1. Orchestrator  — Gemini decides which sub-agents to call (gmail / drive / calendar)
 *   2. Answer        — Gemini answers using the aggregated workspace context
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

const ORCHESTRATOR_MODEL = 'gemini-2.5-flash'; // fast, just picks agents
const ANSWER_MODEL = 'gemini-2.5-pro';              // smarter, reasons with context

/**
 * Step 1 — Orchestrator.
 * Analyzes the question and returns which agents to invoke + their search queries.
 *
 * @returns {{ agents: string[], queries: { gmail?: string, drive?: string, calendar?: boolean }, reasoning: string }}
 */
async function orchestrate(apiKey, question) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: ORCHESTRATOR_MODEL });

  const prompt = `You are an AI orchestrator deciding which Google Workspace data sources to query in order to answer a user question.

Available sources:
- "gmail"    : user's emails — use for questions about emails, messages, conversations, invoices, newsletters
- "drive"    : user's Google Drive files — use for questions about documents, files, reports, spreadsheets, presentations
- "calendar" : user's Google Calendar — use for questions about meetings, events, schedule, agenda, availability

User question: "${question}"

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation outside the JSON):
{
  "agents": ["gmail"],
  "queries": {
    "gmail": "concise keyword search query for gmail",
    "drive": "concise keyword search query for drive",
    "calendar": true
  },
  "reasoning": "one sentence explaining your choice"
}

Rules:
- Only include in "agents" the sources that are actually relevant to the question
- For "gmail" and "drive", provide a short keyword search string
- For "calendar": use the boolean true for general schedule/agenda questions, or provide a keyword string when searching for a specific event (e.g. a birthday, a meeting with someone)
- IMPORTANT: always write search queries in the SAME language as the user's question — never translate to English
- If a source is not in "agents", omit its key from "queries"`;

  logger.debug('Orchestrator analyzing question...');
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Orchestrator returned invalid JSON');

  const decision = JSON.parse(jsonMatch[0]);
  logger.info(`Orchestrator decision: agents=${decision.agents.join(', ')} | ${decision.reasoning}`);
  return decision;
}

/**
 * Step 2 — Final answer.
 * Uses the aggregated workspace context to answer the user's question.
 *
 * @returns {{ answer: string, sources: string[] }}
 */
async function answerWithContext(apiKey, question, workspaceData) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: ANSWER_MODEL });

  const context = formatWorkspaceContext(workspaceData);
  const hasData = workspaceData.sourcesUsed.length > 0;

  const prompt = `You are a helpful AI assistant with access to a user's Google Workspace data.

${hasData
    ? `Here is the relevant data retrieved from the user's workspace:\n\n${context}`
    : 'No relevant workspace data was found for this question.'}

User question: "${question}"

Instructions:
- Answer based solely on the workspace data above
- Be concise and direct
- Mention which source (Gmail, Drive, Calendar) the information came from
- If the data doesn't contain the answer, say so clearly and suggest what the user could check
- Use plain text — bullet points are fine, but no markdown headers`;

  logger.debug('Generating final answer...');
  const result = await model.generateContent(prompt);
  const answer = result.response.text();
  logger.info('Final answer generated');

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
