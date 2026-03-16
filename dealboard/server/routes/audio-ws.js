/**
 * audio-ws.js — WebSocket handler for real-time audio transcription + summarisation.
 *
 * Flow:
 *   1. Frontend connects and streams audio chunks (tab audio + mic, mixed, ~5s each)
 *   2. Each chunk is transcribed by Gemini 2.5 Flash (raw text, internal)
 *   3. Every 3 chunks (~15s), accumulated text is summarised into 2-3 sentences
 *   4. Summary segment is sent to frontend
 *   5. Keywords trigger workspace context searches (context_trigger event)
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
      logger.warn(`[WS] Model ${modelName} unavailable, trying next fallback...`);
    }
  }
  throw lastErr;
}

const CONTEXT_KEYWORDS = [
  // French
  'projet', 'contrat', 'budget', 'client', 'document',
  'stratégie', 'deadline', 'prix', 'offre', 'deal',
  'négociation', 'réunion', 'facture',
  // English
  'project', 'contract', 'roadmap', 'email', 'strategy',
  'invoice', 'proposal', 'meeting', 'negotiation',
];

const CHUNKS_PER_SUMMARY = 3; // 3 × 5s = ~15s

function setupAudioWebSocket(wss, sessionParser) {
  wss.on('connection', (ws, req) => {
    sessionParser(req, {}, () => {
      const user = req.session?.user;
      ws.geminiKey = user?.geminiApiKey || null;
      ws.userEmail = user?.email || 'unknown';
      logger.info(`[WS] Audio connection from: ${ws.userEmail}`);
      ws.send(JSON.stringify({ type: 'ready', authenticated: !!user, hasKey: !!ws.geminiKey }));
    });

    // Buffer to accumulate raw transcript text before summarising
    ws.transcriptBuffer = [];
    ws.chunkCount = 0;

    ws.on('message', async (data, isBinary) => {
      if (!isBinary) return;

      if (!ws.geminiKey) {
        ws.send(JSON.stringify({ type: 'error', message: 'Gemini API key not configured' }));
        return;
      }

      try {
        const base64Audio = Buffer.from(data).toString('base64');

        // Step 1 — transcribe the 5s chunk
        const txResult = await generateWithFallback(ws.geminiKey, (model) => model.generateContent([
          {
            inlineData: { data: base64Audio, mimeType: 'audio/webm;codecs=opus' },
          },
          `You are a STRICT audio transcriber. Absolute rules:
1. Transcribe ONLY clearly audible human speech in this recording. The speech may be in any language (English, French, etc.) — transcribe as-is.
2. If you have any doubt about a word or phrase, return SILENCE.
3. Do NOT invent, complete, or infer anything.
4. If the audio contains background noise, music, silence, or inaudible speech, return exactly: SILENCE
5. Return ONLY the raw transcription or the word SILENCE. No other commentary.
6. When in doubt: SILENCE.`,
        ]));

        const rawText = txResult.response.text().trim();

        // Reject silence / hallucinations
        if (!rawText || rawText === 'SILENCE') return;
        if (rawText.length > 600) {
          logger.warn('[WS] Rejected likely hallucinated transcript (too long for 5s chunk)');
          return;
        }
        const refusalPatterns = [
          // French refusals
          /^je\s+(ne\s+)?peux/i, /^désolé/i, /^il\s+n['']y\s+a\s+pas/i, /^aucune\s+parole/i, /^l['']audio/i,
          // English refusals
          /^i\s+(can|cannot|can't)/i, /^sorry/i, /^there\s+is\s+no/i, /^no\s+(speech|audio|words)/i, /^the\s+audio/i,
          // Hallucination patterns — model leaking its own prompt or describing itself
          /transcri(be|pt|ption)/i, /audio\s+(file|chunk|content|data|recording)/i,
          /strict\s+rules?/i, /as\s+an\s+AI/i, /AI\s+assistant/i, /language\s+model/i,
          /inaudible\s+speech/i, /background\s+noise/i, /clearly\s+audible/i,
          /return\s+silence/i, /word\s+silence/i,
        ];
        if (refusalPatterns.some(p => p.test(rawText))) return;

        // Accumulate
        ws.transcriptBuffer.push(rawText);
        ws.chunkCount++;

        // Trigger keyword search on raw text
        const lower = rawText.toLowerCase();
        if (CONTEXT_KEYWORDS.some(k => lower.includes(k))) {
          ws.send(JSON.stringify({ type: 'context_trigger', text: rawText }));
        }

        // Step 2 — every CHUNKS_PER_SUMMARY chunks, summarise
        if (ws.chunkCount % CHUNKS_PER_SUMMARY === 0) {
          const accumulated = ws.transcriptBuffer.join(' ');
          ws.transcriptBuffer = [];

          const summaryResult = await generateWithFallback(ws.geminiKey, (model) => model.generateContent(
            `Here is a raw transcript from the last 15 seconds of a conversation (may be in French, English, or mixed):
"${accumulated}"

Write a factual summary in 2-3 short sentences in ENGLISH of what was just said.
Stay neutral, concise, and faithful to the content.
If the content is too fragmented or incomprehensible, respond exactly: SKIP`
          ));

          const summary = summaryResult.response.text().trim();
          if (!summary || summary === 'SKIP') return;

          ws.send(JSON.stringify({
            type: 'summary',
            timestamp: new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            text: summary,
          }));
        }
      } catch (err) {
        logger.error('[WS] Transcription error:', err.message);
      }
    });

    ws.on('close', () => {
      logger.info(`[WS] Audio connection closed: ${ws.userEmail}`);
    });

    ws.on('error', (err) => {
      logger.error('[WS] WebSocket error:', err.message);
    });
  });
}

module.exports = { setupAudioWebSocket };
