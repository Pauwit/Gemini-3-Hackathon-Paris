/**
 * ============================================================
 * tools/gemini-client.js — Gemini API Client Wrapper
 * ============================================================
 *
 * PURPOSE:
 * Thin wrapper around @google/generative-ai SDK that provides
 * consistent interfaces for content generation and streaming.
 * All agents call this module; none interact with the SDK directly.
 * Handles API key validation, model selection, and error normalization.
 *
 * DATA FLOW:
 * agent → generateContent(model, prompt, options) → Gemini API → string
 * agent → streamContent(model, prompt, options) → Gemini API → AsyncGenerator<string>
 *
 * PROTOCOL REFERENCE: N/A
 *
 * DEPENDENCIES:
 *   @google/generative-ai — Google Gemini SDK
 *   ../config             — GEMINI_API_KEY, model constants
 * ============================================================
 */

'use strict';

const config = require('../config');

const { GoogleGenerativeAI } = require('@google/generative-ai');

let _client = null;

function getClient() {
  if (!_client) {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    _client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return _client;
}

/**
 * generateContent
 * Generates a complete text response from a Gemini model.
 *
 * @param {string} model - Model identifier (e.g. config.GEMINI_FLASH_MODEL)
 * @param {string} prompt - Full prompt string (system + user combined or separate)
 * @param {object} [options] - Optional generation config
 *   { temperature?: number, maxOutputTokens?: number, responseMimeType?: string }
 * @returns {Promise<string>} Generated text response
 *
 * @example
 * const response = await generateContent(
 *   config.GEMINI_FLASH_MODEL,
 *   'Analyze this transcript: ...',
 *   { responseMimeType: 'application/json' }
 * );
 */
async function generateContent(modelId, prompt, options = {}) {
  try {
    console.log(`[gemini-client] generateContent with model: ${modelId}`);
    const model = getClient().getGenerativeModel({ model: modelId });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: options
    });
    
    return result.response.text();
  } catch (error) {
    console.error(`[gemini-client] API Error:`, error.message);
    // Return empty fallback structure so parsers don't catastrophically fail
    return options.responseMimeType === 'application/json' ? '{}' : '';
  }
}

/**
 * streamContent
 * Streams text response tokens from a Gemini model as an async generator.
 *
 * @param {string} model - Model identifier
 * @param {string} prompt - Full prompt string
 * @param {object} [options] - Optional generation config
 * @yields {string} Successive text chunks from the stream
 *
 * @example
 * for await (const chunk of streamContent(config.STRATEGY_MODEL, prompt)) {
 *   process.stdout.write(chunk);
 * }
 */
async function* streamContent(model, prompt, options = {}) {
  // TODO: getClient().getGenerativeModel({ model })
  // TODO: model.generateContentStream(...)
  // TODO: for await (const chunk of result.stream) { yield chunk.text() }

  console.log('[gemini-client] streamContent called — TODO: implement', { model });
  yield '<!-- streaming not yet implemented -->';
}

module.exports = { generateContent, streamContent };
