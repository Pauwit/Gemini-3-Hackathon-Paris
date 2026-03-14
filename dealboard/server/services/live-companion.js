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

function looksLikeQuestion(text) {
	if (!text) return false;
	if (text.includes('?')) return true;
	if (/\b(i need to know|can you tell me|do you know|let me know)\b/i.test(text) && /\b(what|why|how|when|who|which|where)\b/i.test(text)) {
		return true;
	}
	return /^(what|why|how|when|who|which|where|can|could|would|should|do|does|did|is|are)\b/i.test(text.trim());
}

function looksLikeScenarioRequest(text) {
	if (!text) return false;
	return /(scenario|what if|objection|pushback|procurement|security review|budget freeze|competitor|if they say|if they ask|negotiat|renewal)/i.test(text);
}

function looksLikeSimpleMathQuestion(text) {
	if (!text) return false;
	const hasMathExpression = /\b\d+(?:\.\d+)?\s*[+\-*/x]\s*\d+(?:\.\d+)?\b/i.test(text);
	const hasMathWords = /(plus|minus|times|multiplied by|divided by|equals?|equal to)/i.test(text);
	return looksLikeQuestion(text) && (hasMathExpression || hasMathWords);
}

function hasBusinessNumericContext(text) {
	if (!text) return false;
	return /(price|pricing|budget|cost|discount|contract|renewal|invoice|revenue|margin|quota|headcount|seats|sla|uptime|compliance|deadline|timeline|delivery|milestone|roi|conversion|latency|availability)/i.test(text);
}

function heuristicFactChecks(text, knowledgeBase) {
	const checks = [];
	const claims = extractClaims(text);
	const materialNumericSignal = claims.numericClaims.some((claim) => /[\$%]|\b(k|m|b|hosts?|months?|years?|days?)\b/i.test(claim));
	const shouldReviewNumeric =
		claims.numericClaims.length > 0 &&
		!looksLikeSimpleMathQuestion(text) &&
		(hasBusinessNumericContext(text) || materialNumericSignal);

	if (shouldReviewNumeric) {
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
			title: 'Budget Topic Detected',
			summary: 'A budget-sensitive topic was raised. Emphasize outcomes, constraints, and options.',
			confidence: 0.84,
			details: [
				{
					question: 'What should be done now?',
					answer: 'Confirm priorities, constraints, and timeline before proposing trade-offs.',
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

function heuristicSituationSummary(text, meetingContext) {
	const contextBits = [];

	if (/(risk|blocked|concern|issue|problem|delay)/i.test(text)) {
		contextBits.push('A risk or blocker is being discussed.');
	}
	if (/(price|budget|cost|discount)/i.test(text)) {
		contextBits.push('Budget and cost considerations are active in the conversation.');
	}
	if (/(timeline|deadline|when|date|milestone)/i.test(text)) {
		contextBits.push('Timing and delivery expectations are important right now.');
	}

	if (contextBits.length === 0) {
		contextBits.push('The conversation is in discovery/clarification mode; confirm intent before moving forward.');
	}

	return {
		summary: contextBits.join(' '),
		audience: meetingContext?.lastSpeaker || 'Unknown participant',
		confidence: 0.72,
	};
}

function heuristicQuestionResponse(text) {
	const isQuestion = looksLikeQuestion(text);

	if (isQuestion) {
		return {
			answer: 'Direct answer: acknowledge the question, answer clearly in one sentence, then add one concrete example.',
			talkTrack: 'Great question. The short answer is yes in most cases; the practical impact is faster execution with less manual effort.',
			confidence: 0.72,
		};
	}

	return {
		answer: 'Likely next question: what is the concrete impact and timeline? Prepare a concise answer with one measurable outcome.',
		talkTrack: 'If helpful, we can map this to your exact context and define what success looks like in the first phase.',
		confidence: 0.68,
	};
}

function heuristicRealtimeFeedback(text) {
	const points = [];

	if (/(always|never|guarantee|definitely)/i.test(text)) {
		points.push('Avoid absolute language unless you can verify it.');
	}
	if (text.length > 260) {
		points.push('Condense your next response to 1-2 sentences for clarity.');
	}
	if (/(you should|you need to)/i.test(text)) {
		points.push('Use collaborative phrasing to keep the conversation open.');
	}

	if (points.length === 0) {
		points.push('Good pace. Next, ask one focused follow-up question to validate alignment.');
	}

	return {
		feedback: points.join(' '),
		nextLine: 'Would you like me to summarize the options and recommend the best next step?',
		confidence: 0.74,
	};
}

async function geminiInsights(text, meetingContext, knowledgeBase) {
	const prompt = [
		'You are a real-time AI conversation companion for any professional conversation type.',
		'Infer who the user is speaking with (role and intent) from transcript/context. Be role-agnostic (customer, teammate, manager, recruiter, partner, interviewer, etc.).',
		'Return strict JSON only with this schema:',
		'{"cards":[{"label":"ALERT|BATTLECARD|CONTEXT|STRATEGY|INFO","title":"string","summary":"string","confidence":0.0,"details":[{"question":"string","answer":"string","source":"string"}]}],"factChecks":[{"claim":"string","verdict":"verified|partial|needs-review","confidence":0.0,"reason":"string","source":"string"}],"assistantCue":"string","situation":{"summary":"string","audience":"string","confidence":0.0},"questionResponse":{"answer":"string","talkTrack":"string","confidence":0.0},"realtimeFeedback":{"feedback":"string","nextLine":"string","confidence":0.0}}',
		'IMPORTANT: Always fill situation, questionResponse, and realtimeFeedback every turn, at the same time.',
		'questionResponse must handle any question type and provide a concise speakable talkTrack.',
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
		situation: parsed?.situation && typeof parsed.situation === 'object' ? parsed.situation : null,
		questionResponse: parsed?.questionResponse && typeof parsed.questionResponse === 'object' ? parsed.questionResponse : null,
		realtimeFeedback: parsed?.realtimeFeedback && typeof parsed.realtimeFeedback === 'object' ? parsed.realtimeFeedback : null,
	};
}

function buildSituationCard(situation) {
	const summary = situation?.summary || '';
	const audience = situation?.audience || 'Unknown participant';

	if (!summary) return null;

	return {
		label: 'CONTEXT',
		title: 'Situation Understanding',
		summary,
		confidence: normalizeConfidence(situation?.confidence, 0.74),
		details: [
			{
				question: 'Who you may be speaking with',
				answer: audience,
				source: 'AI Companion',
			},
		],
	};
}

function buildDirectAnswerCard(text, directAnswer) {
	const answer = directAnswer?.answer || '';
	const talkTrack = directAnswer?.talkTrack || '';
	const confidence = normalizeConfidence(directAnswer?.confidence, 0.74);

	if (!answer && !talkTrack) return null;

	return {
		label: 'CONTEXT',
		title: 'Instant Answer',
		summary: answer || talkTrack,
		confidence,
		details: [
			{
				question: 'Question detected',
				answer: text,
				source: 'Live transcript',
			},
			{
				question: 'Suggested response',
				answer: talkTrack || answer,
				source: 'AI Companion',
			},
		],
	};
}

function buildRealtimeFeedbackCard(realtimeFeedback) {
	const feedback = realtimeFeedback?.feedback || '';
	const nextLine = realtimeFeedback?.nextLine || '';

	if (!feedback && !nextLine) return null;

	return {
		label: 'STRATEGY',
		title: 'Real-Time Feedback',
		summary: feedback || 'Keep responses concise and validate alignment before moving on.',
		confidence: normalizeConfidence(realtimeFeedback?.confidence, 0.75),
		details: [
			{
				question: 'Immediate coaching',
				answer: feedback || 'Pause, confirm understanding, then provide one concrete next step.',
				source: 'AI Companion',
			},
			{
				question: 'Suggested next line',
				answer: nextLine || 'Does this align with what you want to achieve?',
				source: 'AI Companion',
			},
		],
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
	const isQuestion = looksLikeQuestion(text);

	let cards = [];
	let factChecks = [];
	let assistantCue = '';
	let situation = null;
	let questionResponse = null;
	let realtimeFeedback = null;
	let modelUsed = 'heuristic';

	if (config.GEMINI_API_KEY) {
		try {
			const aiResult = await geminiInsights(text, meetingContext, knowledgeBase);
			cards = aiResult.cards;
			factChecks = aiResult.factChecks;
			assistantCue = aiResult.assistantCue;
			situation = aiResult.situation;
			questionResponse = aiResult.questionResponse;
			realtimeFeedback = aiResult.realtimeFeedback;
			modelUsed = 'gemini';
		} catch {
			cards = heuristicInsights(text, meetingContext);
			factChecks = heuristicFactChecks(text, knowledgeBase);
			assistantCue = 'Summarize the current priority in one sentence and ask for confirmation.';
			modelUsed = 'heuristic-fallback';
		}
	} else {
		cards = heuristicInsights(text, meetingContext);
		factChecks = heuristicFactChecks(text, knowledgeBase);
		assistantCue = 'Acknowledge the point and ask a clarifying follow-up question.';
	}

	if (!situation) situation = heuristicSituationSummary(text, meetingContext);
	if (!questionResponse) questionResponse = heuristicQuestionResponse(text);
	if (!realtimeFeedback) realtimeFeedback = heuristicRealtimeFeedback(text);

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

	const selectedFactChecks = !isQuestion
		? (factChecks.length ? factChecks : heuristicFactChecks(text, knowledgeBase))
		: [];
	const factCard = buildFactCheckCard(selectedFactChecks);
	const assistantCard = buildAssistantCard(assistantCue);
	const situationCard = buildSituationCard(situation);
	const directAnswerCard = buildDirectAnswerCard(text, questionResponse);
	const feedbackCard = buildRealtimeFeedbackCard(realtimeFeedback);

	const outputCards = [...normalizedCards];
	if (feedbackCard) outputCards.unshift(feedbackCard);
	if (directAnswerCard) outputCards.unshift(directAnswerCard);
	if (situationCard) outputCards.unshift(situationCard);
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
