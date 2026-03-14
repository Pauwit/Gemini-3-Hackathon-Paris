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
  RESEARCHER_MODEL: 'gemini-2.5-flash',

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
};
