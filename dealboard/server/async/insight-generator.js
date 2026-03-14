/**
 * ============================================================
 * async/insight-generator.js — AI Insight Generation
 * ============================================================
 *
 * PURPOSE:
 * Transforms raw workspace data (emails, documents, calendar,
 * sheets) into structured AI-generated insights: people briefings,
 * project updates, and strategic advice. Called by the scanner
 * after each workspace refresh cycle.
 *
 * MOCK MODE:
 * When USE_MOCK=true AND no GEMINI_API_KEY is set, loads pre-built
 * insights from mock-insights.json instead of calling Gemini.
 *
 * DATA FLOW:
 * workspace data → buildContext() → callGemini(analysisPrompt) → parseGeminiResponse()
 *   → { peopleBriefings, projectUpdates, strategicAdvice }
 *   → data-store.updateInsights()
 *
 * PROTOCOL REFERENCE: N/A
 *
 * DEPENDENCIES:
 *   ../tools/gemini-client — callGemini, parseGeminiResponse
 *   ../config              — USE_MOCK, GEMINI_API_KEY, ANALYSIS_MODEL
 *   ../utils/logger        — structured logging
 * ============================================================
 */

'use strict';

const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

/** Maximum total context characters sent to Gemini */
const CONTEXT_BUDGET = 8000;

/**
 * loadMockInsights — loads pre-built insights from mock-insights.json
 * @returns {object} Mock insights data
 */
function loadMockInsights() {
  const mockPath = path.join(__dirname, '..', 'mock-data', 'mock-insights.json');
  try {
    return JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
  } catch (err) {
    logger.error('[insight-generator] Failed to load mock insights', { error: err.message });
    return { peopleBriefings: [], projectUpdates: [], strategicAdvice: [], lastGeneratedAt: new Date().toISOString() };
  }
}

/**
 * truncate — truncates a string to maxLen characters with ellipsis
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '...';
}

/**
 * buildContext — assembles workspace data into a text context string
 * within CONTEXT_BUDGET characters. Prioritizes recent emails and
 * docs with the most content.
 *
 * @param {object} workspace - { emails, documents, sheets, calendar }
 * @returns {string} Assembled context text
 */
function buildContext(workspace) {
  const sections = [];
  const budgetPerSection = Math.floor(CONTEXT_BUDGET / 4);

  // Emails section
  if (workspace.emails && workspace.emails.length > 0) {
    const emailLines = workspace.emails.slice(0, 6).map(e =>
      `[${e.date || 'unknown'}] FROM: ${e.from || '?'} | SUBJECT: ${e.subject || '?'}\n${truncate(e.body || e.snippet || '', 300)}`
    );
    sections.push(`=== RECENT EMAILS ===\n${emailLines.join('\n---\n')}`);
  }

  // Documents section
  if (workspace.documents && workspace.documents.length > 0) {
    const docLines = workspace.documents.slice(0, 3).map(d =>
      `[${d.modifiedTime || 'unknown'}] DOC: ${d.name || '?'}\n${truncate(d.content || '', 500)}`
    );
    sections.push(`=== DOCUMENTS ===\n${docLines.join('\n---\n')}`);
  }

  // Sheets section
  if (workspace.sheets && workspace.sheets.length > 0) {
    const sheet = workspace.sheets[0];
    if (sheet && sheet.values) {
      const rows = sheet.values.map(r => r.join(' | ')).join('\n');
      sections.push(`=== SHEETS: ${sheet.name || 'Data'} ===\n${truncate(rows, 800)}`);
    } else if (sheet && sheet.answer) {
      sections.push(`=== SHEETS ===\n${truncate(sheet.answer, 800)}`);
    }
  }

  // Calendar section
  if (workspace.calendar && workspace.calendar.length > 0) {
    const eventLines = workspace.calendar.slice(0, 5).map(e =>
      `[${e.start || '?'}] ${e.title || e.summary || '?'}: ${truncate(e.description || '', 150)}`
    );
    sections.push(`=== UPCOMING CALENDAR EVENTS ===\n${eventLines.join('\n')}`);
  }

  const fullContext = sections.join('\n\n');
  return truncate(fullContext, CONTEXT_BUDGET);
}

/**
 * getAnalysisSystemPrompt — loads the analysis system prompt from disk
 * Falls back to an inline prompt if the file is missing.
 * @returns {string}
 */
function getAnalysisSystemPrompt() {
  const promptPath = path.join(__dirname, '..', 'prompts', 'analysis-prompt.txt');
  try {
    return fs.readFileSync(promptPath, 'utf-8');
  } catch {
    // Inline fallback
    return `You are a workspace analyst for an enterprise sales team.
Analyze the provided workspace data and return ONLY valid JSON with this structure:
{
  "peopleBriefings": [{ "id", "name", "title", "company", "summary", "keyConcerns", "communicationStyle", "recentActivity", "riskLevel", "lastContact" }],
  "projectUpdates": [{ "id", "name", "status", "summary", "keyMilestones", "dealValue", "competitor", "winProbability", "lastUpdated" }],
  "strategicAdvice": [{ "id", "priority", "title", "advice", "rationale", "action", "deadline" }]
}
Rules: Only include data found in the provided context. Do not invent information. Be specific and actionable.`;
  }
}

/**
 * generateInsights — analyzes workspace data and generates AI insights
 * @param {object} workspace - { emails, documents, sheets, calendar }
 * @returns {Promise<object>} { peopleBriefings, projectUpdates, strategicAdvice, lastGeneratedAt }
 */
async function generateInsights(workspace) {
  // Use mock insights if in mock mode without an API key
  if (config.USE_MOCK && !config.GEMINI_API_KEY) {
    logger.info('[insight-generator] Using mock insights (USE_MOCK=true, no GEMINI_API_KEY)');
    return loadMockInsights();
  }

  if (!config.GEMINI_API_KEY) {
    logger.warn('[insight-generator] No GEMINI_API_KEY — returning mock insights');
    return loadMockInsights();
  }

  const context = buildContext(workspace);

  if (!context || context.trim().length < 50) {
    logger.warn('[insight-generator] Workspace context too thin — returning empty insights');
    return {
      peopleBriefings: [],
      projectUpdates: [],
      strategicAdvice: [],
      lastGeneratedAt: new Date().toISOString(),
    };
  }

  const systemInstruction = getAnalysisSystemPrompt();
  const prompt = `Analyze the following workspace data and return structured insights as JSON:\n\n${context}`;

  logger.info('[insight-generator] Calling Gemini for insights', { contextLength: context.length });

  try {
    const { callGemini } = require('../tools/gemini-client');
    const result = await callGemini(prompt, systemInstruction, config.ANALYSIS_MODEL);

    let parsed;
    if (typeof result === 'object' && result !== null) {
      parsed = result;
    } else {
      // callGemini already attempts JSON.parse — try again on the raw string
      try {
        parsed = JSON.parse(String(result));
      } catch {
        logger.warn('[insight-generator] Could not parse Gemini response as JSON — falling back to mock');
        return loadMockInsights();
      }
    }

    const insights = {
      peopleBriefings: parsed.peopleBriefings || [],
      projectUpdates: parsed.projectUpdates || [],
      strategicAdvice: parsed.strategicAdvice || [],
      lastGeneratedAt: new Date().toISOString(),
    };

    logger.info('[insight-generator] Insights generated', {
      people: insights.peopleBriefings.length,
      projects: insights.projectUpdates.length,
      advice: insights.strategicAdvice.length,
    });

    return insights;
  } catch (err) {
    logger.error('[insight-generator] Gemini call failed', { error: err.message });
    return loadMockInsights();
  }
}

module.exports = { generateInsights, buildContext };
