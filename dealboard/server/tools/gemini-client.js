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
    if (!config.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not set');
    }
    _client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return _client;
}

function createGenerationConfig(options = {}) {
  const generationConfig = {};

  if (typeof options.temperature === 'number') {
    generationConfig.temperature = options.temperature;
  }
  if (typeof options.maxOutputTokens === 'number') {
    generationConfig.maxOutputTokens = options.maxOutputTokens;
  }
  if (typeof options.responseMimeType === 'string') {
    generationConfig.responseMimeType = options.responseMimeType;
  }

  return generationConfig;
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
async function generateContent(model, prompt, options = {}) {
  const client = getClient();
  const geminiModel = client.getGenerativeModel({ model });

  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: String(prompt || '') }] }],
      generationConfig: createGenerationConfig(options),
    });

    return result?.response?.text?.() || '';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini API error';
    throw new Error(`[gemini-client] generateContent failed: ${message}`);
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
  const client = getClient();
  const geminiModel = client.getGenerativeModel({ model });

  try {
    const stream = await geminiModel.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: String(prompt || '') }] }],
      generationConfig: createGenerationConfig(options),
    });

    for await (const chunk of stream.stream) {
      const text = chunk?.text?.();
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini API streaming error';
    throw new Error(`[gemini-client] streamContent failed: ${message}`);
  }
}

module.exports = { generateContent, streamContent };
