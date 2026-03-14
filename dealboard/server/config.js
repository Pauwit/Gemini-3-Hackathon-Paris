/**
 * ============================================================
 * config.js — Server Configuration — Single Source of Truth
 * ============================================================
 *
 * PURPOSE:
 * Centralizes ALL server-side configurable items. No magic strings
 * should appear anywhere else in the server codebase — import from here.
 * Reads from environment variables with safe defaults for local dev.
 *
 * DATA FLOW:
 * Imported by every server module that needs configuration.
 * Values are set via .env file (see .env.example at repo root).
 *
 * PROTOCOL REFERENCE: N/A
 *
 * DEPENDENCIES: None (pure config — no imports)
 * ============================================================
 */

module.exports = {
  // Server
  PORT: process.env.PORT || 3001,
  MODE: process.env.MODE || 'live',
  USE_MOCK: process.env.USE_MOCK === 'true',

  // Gemini Models
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_LIVE_MODEL: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
  GEMINI_FLASH_MODEL: 'gemini-2.5-flash',
  GEMINI_PRO_MODEL: 'gemini-2.5-pro',

  // Agent-specific model assignments
  LISTENER_MODEL: 'gemini-2.5-flash',
  ANALYSER_MODEL: 'gemini-2.5-flash',
  STRATEGY_MODEL: 'gemini-2.5-pro',
  MEMORY_MODEL: 'gemini-2.5-flash',

  // Timeouts
  GWS_COMMAND_TIMEOUT_MS: 10000,
  WEBSOCKET_RECONNECT_INTERVAL_MS: 3000,
  AUDIO_CHUNK_INTERVAL_MS: 250,

  // Memory
  MEMORY_STORE_PATH: './memory/memory-store.json',
  MAX_MEMORY_ENTRIES: 1000,

  // Feature Flags
  ENABLE_STRATEGY_AGENT: true,
  ENABLE_MEMORY_AGENT: true,
  ENABLE_CALENDAR_WORKER: true,

  // Paths
  PROMPTS_DIR: './prompts',
  SKILLS_DIR: '../skills',
  MOCK_DATA_DIR: './mock-data',

  // Async Brain
  ASYNC_SCAN_INTERVAL_MS: parseInt(process.env.ASYNC_SCAN_INTERVAL_MS) || 15 * 60 * 1000,
  ASYNC_EMAIL_LOOKBACK_HOURS: parseInt(process.env.ASYNC_EMAIL_LOOKBACK_HOURS) || 24,
  ASYNC_MAX_EMAILS_PER_SCAN: parseInt(process.env.ASYNC_MAX_EMAILS_PER_SCAN) || 50,
  ASYNC_CALENDAR_LOOKAHEAD_DAYS: parseInt(process.env.ASYNC_CALENDAR_LOOKAHEAD_DAYS) || 7,
  ENABLE_ASYNC_SCANNER: process.env.ENABLE_ASYNC_SCANNER !== 'false',
  ENABLE_CHAT: process.env.ENABLE_CHAT !== 'false',
  DATA_STORE_PATH: process.env.DATA_STORE_PATH || './data/store.json',
  GEMINI_TIMEOUT_MS: parseInt(process.env.GEMINI_TIMEOUT_MS) || 30000,
  GEMINI_MAX_RETRIES: parseInt(process.env.GEMINI_MAX_RETRIES) || 3,

  // Google OAuth (for real API mode)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback',
  GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN || '',

  // Model aliases for new agents
  ANALYSIS_MODEL: process.env.ANALYSIS_MODEL || 'gemini-2.5-flash',
};
