// ============================================================
// config.ts — Frontend Configuration — Single Source of Truth
// ============================================================
//
// PURPOSE:
// Centralizes ALL frontend configurable items including API endpoints,
// feature flags, timing constants, and design tokens. No magic strings
// or hardcoded values anywhere else in the frontend codebase.
//
// DATA FLOW:
// Imported by all frontend modules needing config. Values come from
// Next.js NEXT_PUBLIC_ env vars with safe localhost defaults.
//
// PROTOCOL REFERENCE: Section 1.1 (endpoint URLs)
//
// DEPENDENCIES: None (pure config — no imports)
// ============================================================

export const config = {
  // API — MUST match PROTOCOL.md section 1.1
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',

  // Feature Flags (mirror server flags for conditional UI)
  ENABLE_VISION: process.env.NEXT_PUBLIC_ENABLE_VISION !== 'false',
  ENABLE_MEMORY_VIEW: process.env.NEXT_PUBLIC_ENABLE_MEMORY !== 'false',

  // Timing
  AUDIO_CHUNK_INTERVAL_MS: 250,
  RECONNECT_INTERVAL_MS: 3000,
  RECONNECT_MAX_INTERVAL_MS: 30000,

  // Design Tokens
  COLORS: {
    googleBlue: '#4285F4',
    googleRed: '#EA4335',
    googleYellow: '#FBBC04',
    googleGreen: '#34A853',
    geminiPurple: '#A142F4',
    geminiGradientStart: '#4285F4',
    geminiGradientEnd: '#A142F4',
    surfaceWhite: '#FFFFFF',
    surfaceLight: '#F8F9FA',
    surfaceMedium: '#E8EAED',
    textPrimary: '#202124',
    textSecondary: '#5F6368',
    textMuted: '#9AA0A6',
  },

  // Card label → color mapping (MUST match PROTOCOL.md section 6)
  CARD_COLORS: {
    ALERT:       { color: '#EA4335', bg: '#FDE7E7', border: '#F5C6C6' },
    BATTLECARD:  { color: '#FBBC04', bg: '#FEF7E0', border: '#FDE293' },
    CONTEXT:     { color: '#34A853', bg: '#E6F4EA', border: '#B7E1C1' },
    STRATEGY:    { color: '#4285F4', bg: '#E8F0FE', border: '#AECBFA' },
    INFO:        { color: '#5F6368', bg: '#F1F3F4', border: '#DADCE0' },
  },
} as const;
