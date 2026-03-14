/**
 * ============================================================
 * agents/strategy-agent.js — Strategy Agent
 * ============================================================
 *
 * PURPOSE:
 * Post-meeting document generation agent. Receives the full
 * meeting transcript, all cards produced, and memory context,
 * then produces polished business documents: meeting summary,
 * follow-up email, strategy brief, and decision log.
 *
 * Uses the more capable Gemini Pro model for document quality.
 *
 * DATA FLOW:
 * meetingData + documentTypes → Gemini Pro (strategy-prompt.txt)
 *   → Document[] (markdown content)
 *   → server.js broadcastToClient('document', ...) for each
 *
 * PROTOCOL REFERENCE: PROTOCOL.md section 3 (document message schema)
 *
 * DEPENDENCIES:
 *   ../tools/gemini-client  — LLM calls (Pro model)
 *   ../tools/skills-loader  — prompt loading
 *   ../config               — STRATEGY_MODEL
 * ============================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { generateContent } = require('../tools/gemini-client');

// Load system prompt once
let _systemPrompt = null;
function getSystemPrompt() {
  if (!_systemPrompt) {
    const promptPath = path.join(__dirname, '..', config.PROMPTS_DIR, 'strategy-prompt.txt');
    try {
      _systemPrompt = fs.readFileSync(promptPath, 'utf8');
    } catch {
      _systemPrompt = 'You are a professional sales strategist. Generate meeting documents.';
    }
  }
  return _systemPrompt;
}

/** Human-readable title for each document type */
const DOC_TITLES = {
  'summary':         'Meeting Summary',
  'follow-up-email': 'Follow-Up Email',
  'strategy-brief':  'Strategy Brief',
  'decision-log':    'Decision Log',
};

/**
 * buildMeetingContext — formats meeting data into a readable context string
 */
function buildMeetingContext(meetingData) {
  const { meetingId, title, participants, transcript, cards, startedAt } = meetingData;

  const transcriptText = Array.isArray(transcript) && transcript.length > 0
    ? transcript.map(s => `[${s.speaker || 'Unknown'}]: ${s.text}`).join('\n')
    : 'No transcript available.';

  const cardsText = Array.isArray(cards) && cards.length > 0
    ? cards.map(c => `- [${c.label}] ${c.title}: ${c.summary}`).join('\n')
    : 'No intelligence cards generated.';

  return `
MEETING METADATA:
- ID: ${meetingId}
- Title: ${title || 'Untitled Meeting'}
- Participants: ${Array.isArray(participants) ? participants.join(', ') : 'Unknown'}
- Date: ${startedAt || new Date().toISOString()}

TRANSCRIPT:
${transcriptText}

INTELLIGENCE CARDS GENERATED DURING MEETING:
${cardsText}
`.trim();
}

/**
 * generateDocuments
 * Generates post-meeting documents from full meeting data.
 *
 * @param {object} meetingData - Complete meeting record
 *   { meetingId, title, participants, transcript[], cards[], startedAt }
 * @param {string[]} documentTypes - Types to generate
 * @returns {Promise<object[]>} Array of Document objects
 */
async function generateDocuments(meetingData, documentTypes) {
  const systemPrompt = getSystemPrompt();
  const meetingContext = buildMeetingContext(meetingData);
  const documents = [];

  for (const docType of documentTypes) {
    const prompt = `${systemPrompt}

${meetingContext}

---
TASK: Generate a "${docType}" document for this meeting.
Document type instructions are defined above in DOCUMENT TYPES.
Output ONLY the markdown content for this document. No JSON, no code blocks around it, just clean markdown.`;

    try {
      console.log(`[strategy-agent] Generating ${docType}...`);
      const content = await generateContent(config.STRATEGY_MODEL, prompt, {
        systemInstruction: systemPrompt,
      });

      documents.push({
        documentId: `doc-${meetingData.meetingId}-${docType}-${Date.now()}`,
        meetingId:   meetingData.meetingId,
        type:        docType,
        title:       DOC_TITLES[docType] || docType,
        content:     typeof content === 'string' ? content : JSON.stringify(content),
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[strategy-agent] Failed to generate ${docType}:`, err.message);
      // Return a fallback placeholder so the UI doesn't break
      documents.push({
        documentId: `doc-${meetingData.meetingId}-${docType}-${Date.now()}`,
        meetingId:   meetingData.meetingId,
        type:        docType,
        title:       DOC_TITLES[docType] || docType,
        content:     `# ${DOC_TITLES[docType] || docType}\n\n_Document generation failed. Please try again._`,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  console.log(`[strategy-agent] Generated ${documents.length}/${documentTypes.length} documents.`);
  return documents;
}

module.exports = { generateDocuments };
