/**
 * ============================================================
 * tools/gemini-client.js — Gemini API Client Wrapper
 * ============================================================
 *
 * PURPOSE:
 * Thin wrapper around @google/generative-ai SDK that provides
 * consistent interfaces for content generation and streaming.
 * All agents call this module; none interact with the SDK directly.
 * Implements retry with exponential backoff and safe JSON parsing.
 *
 * DATA FLOW:
 * agent → callGemini(prompt, systemInstruction, model) → Gemini API → object|string
 * agent → generateContent(model, prompt, options) → Gemini API → string
 * agent → streamContent(model, prompt, options) → Gemini API → AsyncGenerator<string>
 *
 * PROTOCOL REFERENCE: N/A
 *
 * DEPENDENCIES:
 *   @google/generative-ai — Google Gemini SDK
 *   ../config             — GEMINI_API_KEY, ANALYSIS_MODEL, GEMINI_MAX_RETRIES
 * ============================================================
 */

'use strict';

const config = require('../config');
const logger = require('../utils/logger');

let _genAI = null;

/**
 * getGenAI — lazy-initializes and returns the GoogleGenerativeAI instance
 * @returns {import('@google/generative-ai').GoogleGenerativeAI}
 * @throws {Error} if GEMINI_API_KEY is not set
 */
function getGenAI() {
  if (!_genAI) {
    if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    _genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return _genAI;
}

/**
 * parseGeminiResponse — strips markdown fences and tries JSON.parse
 * @param {string} rawText - Raw text from Gemini response
 * @returns {object|string} Parsed JSON object or raw text if JSON parse fails
 */
function parseGeminiResponse(rawText) {
  if (!rawText) return rawText;
  let text = rawText.trim();
  // Strip ```json ... ``` or ``` ... ```
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * callGemini — calls Gemini with retry and safe JSON parsing
 * @param {string} prompt - User prompt text
 * @param {string} [systemInstruction] - System instruction for the model
 * @param {string} [model] - Model name, defaults to config.ANALYSIS_MODEL
 * @returns {Promise<object|string>} Parsed JSON or raw string response
 */
async function callGemini(prompt, systemInstruction = '', model = config.ANALYSIS_MODEL) {
  const maxRetries = config.GEMINI_MAX_RETRIES || 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const genAI = getGenAI();
      const modelConfig = {};
      if (systemInstruction) modelConfig.systemInstruction = systemInstruction;

      const genModel = genAI.getGenerativeModel({ model, ...modelConfig });

      const result = await genModel.generateContent(prompt);
      const rawText = result.response.text();
      return parseGeminiResponse(rawText);
    } catch (err) {
      lastError = err;
      logger.warn(`[gemini-client] Attempt ${attempt}/${maxRetries} failed`, { error: err.message });
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }
  throw lastError;
}

/**
 * generateContent — backward-compatible wrapper around callGemini
 * @param {string} model - Model identifier (e.g. config.GEMINI_FLASH_MODEL)
 * @param {string} prompt - Full prompt string
 * @param {object} [options] - Optional generation config { systemInstruction?: string }
 * @returns {Promise<string>} Generated text response as string
 */
async function generateContent(model, prompt, options = {}) {
  try {
    const result = await callGemini(prompt, options.systemInstruction || '', model);
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (err) {
    logger.error('[gemini-client] generateContent failed', { error: err.message });
    return '{}';
  }
}

/**
 * streamContent — streams text tokens from a Gemini model
 * @param {string} model - Model identifier
 * @param {string} prompt - Full prompt string
 * @param {object} [options] - Optional generation config
 * @yields {string} Successive text chunks from the response stream
 */
async function* streamContent(model, prompt, options = {}) {
  try {
    const genAI = getGenAI();
    const genModel = genAI.getGenerativeModel({ model });
    const result = await genModel.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  } catch (err) {
    logger.error('[gemini-client] streamContent failed', { error: err.message });
    yield '';
  }
}

module.exports = { callGemini, parseGeminiResponse, generateContent, streamContent };
