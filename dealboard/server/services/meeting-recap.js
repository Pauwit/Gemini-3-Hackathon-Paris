'use strict';

const config = require('../config');
const { generateContent } = require('../tools/gemini-client');

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function fallbackRecapMarkdown({ title, participants, transcript, cards }) {
  const participantLine = Array.isArray(participants) && participants.length
    ? participants.join(', ')
    : 'N/A';

  const lastLines = (Array.isArray(transcript) ? transcript : [])
    .slice(-5)
    .map((segment) => `- ${segment.speaker || 'Speaker'}: ${segment.text || ''}`)
    .join('\n');

  const topCards = (Array.isArray(cards) ? cards : [])
    .slice(0, 5)
    .map((card) => `- ${card.title}: ${card.summary}`)
    .join('\n');

  return [
    `# Meeting Recap — ${title || 'Untitled Meeting'}`,
    '',
    `## Participants`,
    participantLine,
    '',
    `## What Happened`,
    'Conversation recap generated from live transcript and coaching cards.',
    '',
    `## Key Moments`,
    lastLines || '- No transcript captured.',
    '',
    `## AI Highlights`,
    topCards || '- No AI cards captured.',
    '',
    `## Suggested Next Steps`,
    '- Share a concise follow-up with decisions and open questions.',
    '- Confirm owners and due dates for action items.',
  ].join('\n');
}

async function generateMeetingRecapDocument({
  meetingId,
  title,
  participants,
  transcript,
  cards,
  generatedAt,
}) {
  const timestamp = generatedAt || new Date().toISOString();

  const fallbackDocument = {
    meetingId,
    documentId: `doc-recap-${Date.now()}`,
    type: 'summary',
    title: 'Meeting Recap',
    content: fallbackRecapMarkdown({ title, participants, transcript, cards }),
    generatedAt: timestamp,
  };

  if (!config.GEMINI_API_KEY) {
    return fallbackDocument;
  }

  const compactTranscript = (Array.isArray(transcript) ? transcript : [])
    .slice(-120)
    .map((segment) => `${segment.speaker || 'Speaker'}: ${segment.text || ''}`)
    .join('\n');

  const compactCards = (Array.isArray(cards) ? cards : [])
    .slice(-12)
    .map((card) => ({ title: card.title, summary: card.summary, label: card.label }))
    .filter((item) => item.title || item.summary);

  const prompt = [
    'You are creating a post-meeting recap for a sales rep.',
    'Return strict JSON only in this format:',
    '{"recapMarkdown":"string","keyDecisions":["string"],"actionItems":["string"]}',
    'The recapMarkdown must be concise, practical, and include sections: Overview, Decisions, Risks, Next Steps.',
    `Meeting title: ${title || 'Untitled Meeting'}`,
    `Participants: ${(participants || []).join(', ') || 'N/A'}`,
    `Transcript:\n${compactTranscript || 'No transcript provided.'}`,
    `AI cards: ${JSON.stringify(compactCards)}`,
  ].join('\n\n');

  try {
    const raw = await generateContent(config.STRATEGY_MODEL, prompt, {
      temperature: 0.25,
      maxOutputTokens: 1400,
      responseMimeType: 'application/json',
    });

    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed.recapMarkdown !== 'string' || !parsed.recapMarkdown.trim()) {
      return fallbackDocument;
    }

    return {
      ...fallbackDocument,
      content: parsed.recapMarkdown.trim(),
    };
  } catch {
    return fallbackDocument;
  }
}

module.exports = {
  generateMeetingRecapDocument,
};
