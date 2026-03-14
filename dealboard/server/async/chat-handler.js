/**
 * ============================================================
 * async/chat-handler.js — AI Chat Handler
 * ============================================================
 *
 * PURPOSE:
 * Processes chat messages from the user by building a rich
 * context from workspace data + insights + recent chat history,
 * then calling Gemini to generate a grounded answer.
 * Stores both the user message and AI response in the data store.
 *
 * MOCK MODE:
 * When USE_MOCK=true AND no GEMINI_API_KEY is set, returns canned
 * responses matched by keyword from the current insights.
 *
 * DATA FLOW:
 * userMessage → buildChatContext() → callGemini() → answer
 *   → pushChatMessage(user) → pushChatMessage(assistant) → { answer, sources }
 *
 * PROTOCOL REFERENCE: N/A
 *
 * DEPENDENCIES:
 *   ./data-store           — getWorkspace, getInsights, getChatHistory, pushChatMessage
 *   ../tools/gemini-client — callGemini
 *   ../config              — USE_MOCK, GEMINI_API_KEY
 *   ../utils/logger        — structured logging
 * ============================================================
 */

'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const dataStore = require('./data-store');

/** Maximum total context characters sent to Gemini for chat */
const CHAT_CONTEXT_BUDGET = 6000;

/**
 * truncate — truncates a string to maxLen characters
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || '';
  return str.substring(0, maxLen) + '...';
}

/**
 * buildChatContext — assembles workspace, insights, and recent chat into a context string
 * @param {string} userMessage - The current user question
 * @returns {string} Assembled context for the prompt
 */
function buildChatContext(userMessage) {
  const workspace = dataStore.getWorkspace();
  const insights = dataStore.getInsights();
  const chatHistory = dataStore.getChatHistory(10);

  const parts = [];

  // Recent emails
  if (workspace.emails && workspace.emails.length > 0) {
    const emailSummary = workspace.emails.slice(0, 4).map(e =>
      `[${e.date || '?'}] From: ${e.from || '?'} | ${e.subject || '?'}: ${truncate(e.snippet || e.body || '', 200)}`
    ).join('\n');
    parts.push(`=== RECENT EMAILS ===\n${emailSummary}`);
  }

  // Documents
  if (workspace.documents && workspace.documents.length > 0) {
    const docSummary = workspace.documents.slice(0, 3).map(d =>
      `DOC: ${d.name || '?'}\n${truncate(d.content || '', 300)}`
    ).join('\n---\n');
    parts.push(`=== DOCUMENTS ===\n${docSummary}`);
  }

  // People briefings
  if (insights.peopleBriefings && insights.peopleBriefings.length > 0) {
    const peopleSummary = insights.peopleBriefings.map(p =>
      `${p.name} (${p.title}, ${p.company}): ${p.summary} Concerns: ${(p.keyConcerns || []).join(', ')}`
    ).join('\n');
    parts.push(`=== PEOPLE BRIEFINGS ===\n${peopleSummary}`);
  }

  // Strategic advice
  if (insights.strategicAdvice && insights.strategicAdvice.length > 0) {
    const adviceSummary = insights.strategicAdvice.slice(0, 4).map(a =>
      `[${a.priority?.toUpperCase() || 'INFO'}] ${a.title}: ${a.advice}`
    ).join('\n');
    parts.push(`=== STRATEGIC ADVICE ===\n${adviceSummary}`);
  }

  // Project updates
  if (insights.projectUpdates && insights.projectUpdates.length > 0) {
    const projectSummary = insights.projectUpdates.map(p =>
      `Project: ${p.name} | Status: ${p.status} | ${p.summary}`
    ).join('\n');
    parts.push(`=== PROJECT UPDATES ===\n${projectSummary}`);
  }

  // Recent chat history
  if (chatHistory.length > 0) {
    const historyText = chatHistory.map(m =>
      `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${truncate(m.content, 200)}`
    ).join('\n');
    parts.push(`=== RECENT CONVERSATION ===\n${historyText}`);
  }

  const fullContext = parts.join('\n\n');
  return truncate(fullContext, CHAT_CONTEXT_BUDGET);
}

/**
 * getCannedResponse — returns a mock response based on keyword matching in insights
 * Used when USE_MOCK=true and no API key is available.
 * @param {string} userMessage - User's question
 * @returns {{ answer: string, sources: string[] }}
 */
function getCannedResponse(userMessage) {
  const msg = userMessage.toLowerCase();
  const insights = dataStore.getInsights();

  // Try to find relevant strategic advice
  const relevantAdvice = (insights.strategicAdvice || []).find(a => {
    const text = `${a.title} ${a.advice} ${a.rationale}`.toLowerCase();
    const words = msg.split(/\s+/).filter(w => w.length > 3);
    return words.some(w => text.includes(w));
  });

  if (relevantAdvice) {
    return {
      answer: `**${relevantAdvice.title}**\n\n${relevantAdvice.advice}\n\n*Rationale:* ${relevantAdvice.rationale}\n\n*Recommended action:* ${relevantAdvice.action}`,
      sources: ['strategic-advice'],
    };
  }

  // Try to find relevant person briefing
  const relevantPerson = (insights.peopleBriefings || []).find(p => {
    const text = `${p.name} ${p.title} ${p.company}`.toLowerCase();
    return msg.includes(p.name.toLowerCase()) || msg.includes(p.company.toLowerCase());
  });

  if (relevantPerson) {
    return {
      answer: `**${relevantPerson.name}** (${relevantPerson.title}, ${relevantPerson.company})\n\n${relevantPerson.summary}\n\nKey concerns: ${(relevantPerson.keyConcerns || []).join(', ')}\n\nCommunication style: ${relevantPerson.communicationStyle}`,
      sources: ['people-briefings'],
    };
  }

  // Check for project/deal questions
  if (msg.includes('deal') || msg.includes('project') || msg.includes('acmecorp') || msg.includes('status')) {
    const project = (insights.projectUpdates || [])[0];
    if (project) {
      return {
        answer: `**${project.name}** — Status: ${project.status}\n\n${project.summary}\n\nDeal value: ${project.dealValue}\nWin probability: ${project.winProbability}%`,
        sources: ['project-updates'],
      };
    }
  }

  // Fallback
  return {
    answer: `I found information in your workspace but need more context to answer specifically. The current deal is AcmeCorp at $22K/month (65% win probability). Key upcoming event: Technical Demo on March 20th. ISO 27001 delivered on March 11th. Ask me about specific people, deals, or strategy for detailed answers.`,
    sources: ['workspace'],
  };
}

/**
 * handleChatMessage — processes a user message and returns an AI answer
 * @param {string} userMessage - The user's question or message
 * @returns {Promise<{ answer: string, sources: string[] }>}
 */
async function handleChatMessage(userMessage) {
  if (!userMessage || userMessage.trim().length === 0) {
    return { answer: 'Please provide a question.', sources: [] };
  }

  // Store user message
  dataStore.pushChatMessage({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  });

  let result;

  // Use canned response if no API key
  if (!config.GEMINI_API_KEY) {
    logger.info('[chat-handler] No GEMINI_API_KEY — using canned response');
    result = getCannedResponse(userMessage);
  } else {
    try {
      const context = buildChatContext(userMessage);
      const systemInstruction = `You are DealBoard AI, a sales assistant with access to the user's Google Workspace data.
Answer questions using ONLY the provided context. Be concise, specific, and actionable.
If you can't find the answer in the context, say so clearly. Never make up data.
Format responses in clear markdown. Focus on what's most useful for the sales rep right now.`;

      const prompt = `Context from workspace:\n${context}\n\n---\nUser question: ${userMessage}`;

      const { callGemini } = require('../tools/gemini-client');
      const rawAnswer = await callGemini(prompt, systemInstruction, config.ANALYSIS_MODEL);
      const answerText = typeof rawAnswer === 'string' ? rawAnswer : JSON.stringify(rawAnswer, null, 2);

      result = { answer: answerText, sources: ['workspace', 'insights'] };
      logger.info('[chat-handler] Gemini response received', { answerLength: answerText.length });
    } catch (err) {
      logger.error('[chat-handler] Gemini call failed', { error: err.message });
      result = getCannedResponse(userMessage);
    }
  }

  // Store assistant response
  dataStore.pushChatMessage({
    role: 'assistant',
    content: result.answer,
    timestamp: new Date().toISOString(),
  });

  return result;
}

module.exports = { handleChatMessage };
