/**
 * ============================================================
 * services/live-companion.js — Live Meeting AI Companion Service
 * ============================================================
 */

'use strict';

const { readFileSync } = require('fs');
const { resolve } = require('path');
const { generateContent } = require('../tools/gemini-client');
const config = require('../config');

let knowledgeCache = null;

function loadKnowledgeBase() {
	if (knowledgeCache) {
		return knowledgeCache;
	}

	try {
		const dataPath = resolve(__dirname, '../mock-data/mock-data.json');
		knowledgeCache = JSON.parse(readFileSync(dataPath, 'utf8'));
	} catch {
		knowledgeCache = {};
	}

	return knowledgeCache;
}

function normalizeConfidence(value, fallback = 0.72) {
	if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
}

function safeJsonParse(raw) {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function extractClaims(text) {
	const numericClaims = text.match(/\$?\d+(?:[,.]\d+)?(?:\s?(?:k|m|b|%|hosts?|months?|years?|days?))?/gi) || [];
	const complianceClaims = text.match(/GDPR|SOC\s?2|PCI[-\s]?DSS|ISO\s?27001/gi) || [];
	const certaintyClaims = text.match(/guarantee|certain|definitely|always|never/gi) || [];

	return { numericClaims, complianceClaims, certaintyClaims };
}

function heuristicFactChecks(text, knowledgeBase) {
	const checks = [];
	const claims = extractClaims(text);

	if (claims.numericClaims.length) {
		checks.push({
			claim: `Numeric claims detected: ${claims.numericClaims.join(', ')}`,
			verdict: 'needs-review',
			confidence: 0.68,
			reason: 'Numeric statements should be validated against approved pricing and contracts.',
			source: 'Live transcript',
		});
	}

	if (claims.complianceClaims.length) {
		checks.push({
			claim: `Compliance references: ${claims.complianceClaims.join(', ')}`,
			verdict: 'partial',
			confidence: 0.7,
			reason: 'Compliance claims vary by region and SKU; confirm with legal/security docs.',
			source: 'Compliance checklist',
		});
	}

	if (claims.certaintyClaims.length) {
		checks.push({
			claim: `High-certainty language used: ${claims.certaintyClaims.join(', ')}`,
			verdict: 'needs-review',
			confidence: 0.66,
			reason: 'Absolute language may increase risk when not backed by written commitments.',
			source: 'Conversation QA policy',
		});
	}

	const datadog = knowledgeBase?.battlecards?.datadog;
	if (/datadog/i.test(text) && datadog?.pricing?.logs) {
		checks.push({
			claim: 'Datadog pricing mentioned',
			verdict: 'verified',
			confidence: 0.82,
			reason: `Reference pricing includes logs at ${datadog.pricing.logs}.`,
			source: 'Mock battlecard: datadog.pricing.logs',
		});
	}

	return checks.slice(0, 4);
}

function heuristicInsights(text, meetingContext) {
	const cards = [];

	if (/(price|pricing|discount|budget|cost|renewal)/i.test(text)) {
		cards.push({
			label: 'BATTLECARD',
			title: 'Pricing Pressure Detected',
			summary: 'The buyer appears price-sensitive. Anchor on value before discounting.',
			confidence: 0.84,
			details: [
				{
					question: 'What should be done now?',
					answer: 'Confirm budget, contract term, and urgency before discussing concessions.',
					source: 'Companion heuristic',
				},
			],
		});
	}

	if (/(risk|blocked|concern|security|compliance|legal)/i.test(text)) {
		cards.push({
			label: 'ALERT',
			title: 'Risk Signal in Conversation',
			summary: 'A risk concern was detected. Resolve it explicitly before next-step commitment.',
			confidence: 0.81,
			details: [
				{
					question: 'What should be clarified?',
					answer: 'Identify risk owner, acceptance criteria, and decision timeline.',
					source: 'Companion heuristic',
				},
			],
		});
	}

	cards.push({
		label: 'STRATEGY',
		title: 'Live Coaching Suggestion',
		summary: 'Use an open question, then a quantifying question, then a close question.',
		confidence: 0.78,
		details: [
			{
				question: 'Suggested next question',
				answer: 'If we solved this in 30 days, what key milestone would it unblock first?',
				source: 'Companion strategy pattern',
			},
			{
				question: 'Current speaker context',
				answer: meetingContext?.lastSpeaker || 'Unknown speaker',
				source: 'Live transcript context',
			},
		],
	});

	return cards.slice(0, 3);
}

async function geminiInsights(text, meetingContext, knowledgeBase) {
	const prompt = [
		'You are a real-time AI meeting companion for enterprise sales.',
		'Return strict JSON only with this schema:',
		'{"cards":[{"label":"ALERT|BATTLECARD|CONTEXT|STRATEGY|INFO","title":"string","summary":"string","confidence":0.0,"details":[{"question":"string","answer":"string","source":"string"}]}],"factChecks":[{"claim":"string","verdict":"verified|partial|needs-review","confidence":0.0,"reason":"string","source":"string"}],"assistantCue":"string"}',
		'Prioritize practical, concise, and actionable output.',
		'Use confidence from 0 to 1.',
		`Meeting context: ${JSON.stringify(meetingContext || {})}`,
		`Known data snapshot: ${JSON.stringify({
			discount_rules: knowledgeBase?.discount_rules || [],
			battlecards: knowledgeBase?.battlecards || {},
			client_history: knowledgeBase?.client_history || {},
			prospect_info: knowledgeBase?.prospect_info || {},
		})}`,
		`Transcript segment: ${text}`,
	].join('\n\n');

	const raw = await generateContent(config.ANALYSER_MODEL, prompt, {
		temperature: 0.3,
		maxOutputTokens: 900,
		responseMimeType: 'application/json',
	});

	const parsed = safeJsonParse(raw);
	if (!parsed) {
		throw new Error('Gemini returned non-JSON output');
	}

	return {
		cards: Array.isArray(parsed.cards) ? parsed.cards : [],
		factChecks: Array.isArray(parsed.factChecks) ? parsed.factChecks : [],
		assistantCue: typeof parsed.assistantCue === 'string' ? parsed.assistantCue : '',
	};
}

function buildFactCheckCard(factChecks) {
	if (!factChecks?.length) return null;

	const top = factChecks[0];
	const label = top.verdict === 'verified' ? 'CONTEXT' : 'ALERT';

	return {
		label,
		title: 'Fact Verification',
		summary: `${top.verdict === 'verified' ? 'Verified' : 'Review needed'}: ${top.claim}`,
		confidence: normalizeConfidence(top.confidence, 0.7),
		details: factChecks.map((item) => ({
			question: item.claim,
			answer: `${String(item.verdict || '').toUpperCase()}: ${item.reason}`,
			source: item.source || 'Fact checker',
		})),
	};
}

function buildAssistantCard(assistantCue) {
	if (!assistantCue) return null;

	return {
		label: 'STRATEGY',
		title: 'Live Assistant Cue',
		summary: assistantCue,
		confidence: 0.76,
		details: [
			{
				question: 'How should I use this right now?',
				answer: 'Say this naturally, then pause and let the prospect respond.',
				source: 'AI Companion',
			},
		],
	};
}

async function analyzeLiveSegment(text, meetingContext = {}) {
	const knowledgeBase = loadKnowledgeBase();

	let cards = [];
	let factChecks = [];
	let assistantCue = '';
	let modelUsed = 'heuristic';

	if (config.GEMINI_API_KEY) {
		try {
			const aiResult = await geminiInsights(text, meetingContext, knowledgeBase);
			cards = aiResult.cards;
			factChecks = aiResult.factChecks;
			assistantCue = aiResult.assistantCue;
			modelUsed = 'gemini';
		} catch {
			cards = heuristicInsights(text, meetingContext);
			factChecks = heuristicFactChecks(text, knowledgeBase);
			assistantCue = 'Summarize the buyer priority in one sentence and ask for confirmation.';
			modelUsed = 'heuristic-fallback';
		}
	} else {
		cards = heuristicInsights(text, meetingContext);
		factChecks = heuristicFactChecks(text, knowledgeBase);
		assistantCue = 'Acknowledge the point and ask a clarifying follow-up question.';
	}

	const normalizedCards = cards
		.filter((card) => card && typeof card.title === 'string' && typeof card.summary === 'string')
		.map((card) => ({
			label: card.label || 'INFO',
			title: card.title,
			summary: card.summary,
			confidence: normalizeConfidence(card.confidence),
			details: Array.isArray(card.details)
				? card.details.map((detail) => ({
						question: detail.question || 'Insight',
						answer: detail.answer || card.summary,
						source: detail.source || 'AI Companion',
					}))
				: [],
		}));

	const factCard = buildFactCheckCard(
		factChecks.length ? factChecks : heuristicFactChecks(text, knowledgeBase)
	);
	const assistantCard = buildAssistantCard(assistantCue);

	const outputCards = [...normalizedCards];
	if (factCard) outputCards.push(factCard);
	if (assistantCard) outputCards.push(assistantCard);

	return {
		modelUsed,
		cards: outputCards.slice(0, 5),
		factChecks,
	};
}

module.exports = {
	analyzeLiveSegment,
};
