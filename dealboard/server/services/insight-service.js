/**
 * insight-service.js — Gemini insight generation.
 * Takes workspace data (emails, docs, events) and asks Gemini to produce
 * structured intelligence: people, projects, advice, calendar context, meeting summaries.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

async function generateWithFallback(apiKey, callFn) {
  let lastErr;
  for (const modelName of FALLBACK_MODELS) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      return await callFn(model);
    } catch (err) {
      lastErr = err;
      const isUnavailable = err.message?.includes('503') || err.message?.includes('high demand')
        || err.message?.includes('overloaded') || err.message?.includes('404')
        || err.message?.includes('no longer available') || err.message?.includes('not found');
      if (!isUnavailable) throw err;
      logger.warn(`[Insight] Model ${modelName} unavailable, trying next fallback...`);
    }
  }
  throw lastErr;
}

/**
 * Generates structured insights from workspace data.
 * Returns null (no crash) if no Gemini key is configured.
 */
async function generateInsights(geminiApiKey, workspaceData) {
  if (!geminiApiKey) {
    logger.warn('No Gemini API key — skipping insight generation');
    return null;
  }

  const context = formatWorkspaceContext(workspaceData);

  const prompt = `Here is the user's Google Workspace data:

${context}

Based on this data, generate structured insights. Return ONLY a valid JSON object — no markdown, no explanation, no code block.

{
  "people": [
    {
      "name": "string",
      "title": "string or empty string",
      "company": "string or empty string",
      "lastContact": "YYYY-MM-DD or empty string",
      "summary": "2-3 sentences about this person and your relationship",
      "keyConcerns": ["string"],
      "upcomingInteractions": ["string"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "status": "on track",
      "summary": "2-3 sentences",
      "nextActions": ["string"],
      "relatedPeople": ["string"]
    }
  ],
  "advice": [
    {
      "priority": "high",
      "advice": "Direct actionable advice (1-2 sentences)",
      "reason": "Why this matters",
      "relatedTo": "person or project name"
    }
  ],
  "calendar": [
    {
      "title": "string",
      "start": "ISO datetime string",
      "attendees": ["email or name"],
      "aiContext": "What to prepare and relevant context from emails/docs about these people"
    }
  ],
  "meetingSummaries": []
}

Rules:
- status must be one of: "on track", "at risk", "blocked", "completed"
- priority must be one of: "high", "medium", "low"
- Only use information from the provided data. Never invent facts.
- Be direct and actionable: not "you might want to..." but "Follow up with Thomas — 5 days since last contact."
- Sort advice by priority: high first.
- For calendar events, add aiContext with preparation tips based on email/doc context about the attendees.
- If no relevant data exists for a section, return an empty array for that section.
- Return ONLY valid JSON.`;

  logger.debug('Generating insights with Gemini...');
  const result = await generateWithFallback(geminiApiKey, (model) => model.generateContent(prompt));
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Insight generation returned invalid JSON');

  const insights = JSON.parse(jsonMatch[0]);
  logger.info(`Insights generated: ${insights.people?.length || 0} people, ${insights.projects?.length || 0} projects, ${insights.advice?.length || 0} advice`);
  return insights;
}

function formatWorkspaceContext({ emails, docs, events }) {
  const parts = [];

  if (emails && emails.length > 0) {
    parts.push('=== RECENT EMAILS ===');
    emails.forEach((e, i) => {
      parts.push(`Email ${i + 1}: From: ${e.from} | Subject: ${e.subject} | Date: ${e.date}`);
      parts.push(`  Preview: ${e.snippet}`);
      if (e.body) parts.push(`  Body: ${e.body.slice(0, 400)}`);
    });
  }

  if (docs && docs.length > 0) {
    parts.push('\n=== RECENT DOCUMENTS ===');
    docs.forEach((d, i) => {
      parts.push(`Document ${i + 1}: ${d.name} (modified: ${d.modifiedTime})`);
      if (d.content) parts.push(`  Content: ${d.content.slice(0, 500)}`);
    });
  }

  if (events && events.length > 0) {
    parts.push('\n=== UPCOMING CALENDAR EVENTS ===');
    events.forEach((e, i) => {
      parts.push(`Event ${i + 1}: ${e.summary} | Start: ${e.start}`);
      if (e.attendees) parts.push(`  Attendees: ${e.attendees}`);
      if (e.description) parts.push(`  Description: ${e.description.slice(0, 200)}`);
    });
  }

  return parts.length > 0 ? parts.join('\n') : 'No workspace data available.';
}

module.exports = { generateInsights };
