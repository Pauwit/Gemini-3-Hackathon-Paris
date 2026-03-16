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

const CONTEXT_KEYWORDS = [
  'projet', 'contrat', 'roadmap', 'budget', 'client', 'mail',
  'document', 'stratégie', 'deadline', 'prix', 'offre', 'deal',
  'négociation', 'réunion', 'invoice', 'proposal', 'meeting',
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
        const genAI = new GoogleGenerativeAI(ws.geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Step 1 — transcribe the 5s chunk
        const txResult = await model.generateContent([
          {
            inlineData: { data: base64Audio, mimeType: 'audio/webm;codecs=opus' },
          },
          `Tu es un transcripteur audio STRICT. Règles absolues :
1. Transcris UNIQUEMENT les paroles humaines clairement audibles dans cet enregistrement.
2. Si tu as le moindre doute sur un mot ou une phrase, retourne SILENCE.
3. N'invente RIEN. Ne complète RIEN. Ne déduis RIEN.
4. Si l'audio contient du bruit de fond, de la musique, du silence, ou de la parole inaudible, retourne exactement : SILENCE
5. Retourne UNIQUEMENT la transcription brute ou le mot SILENCE. Aucun autre commentaire.
6. En cas de doute : SILENCE.`,
        ]);

        const rawText = txResult.response.text().trim();

        // Reject silence / hallucinations
        if (!rawText || rawText === 'SILENCE') return;
        if (rawText.length > 600) {
          logger.warn('[WS] Rejected likely hallucinated transcript (too long for 5s chunk)');
          return;
        }
        const refusalPatterns = [/^je\s+(ne\s+)?peux/i, /^désolé/i, /^il\s+n['']y\s+a\s+pas/i, /^aucune\s+parole/i, /^l['']audio/i];
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

          const summaryResult = await model.generateContent(
            `Voici une transcription brute d'une conversation des 15 dernières secondes :
"${accumulated}"

Écris un résumé factuel en 2-3 phrases courtes de ce qui vient d'être dit.
Reste neutre, concis, et fidèle au contenu.
Si le contenu est trop fragmenté ou incompréhensible, réponds exactement : SKIP`
          );

          const summary = summaryResult.response.text().trim();
          if (!summary || summary === 'SKIP') return;

          ws.send(JSON.stringify({
            type: 'summary',
            timestamp: new Date().toLocaleTimeString('fr-FR', {
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
