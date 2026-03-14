// ============================================================
// tailwind.config.ts — Tailwind CSS Configuration
// ============================================================
//
// PURPOSE:
// Extends the default Tailwind theme with DealBoard's design tokens,
// matching config.ts COLORS and CARD_COLORS. Also adds custom
// keyframe animations for card entry effects and UI feedback.
//
// DESIGN TOKENS:
//   - Google brand colors (blue, red, yellow, green)
//   - Gemini purple + gradient
//   - Surface hierarchy (white, light, medium)
//   - Text hierarchy (primary, secondary, muted)
//   - Card label colors (ALERT, BATTLECARD, CONTEXT, STRATEGY, INFO)
//
// ANIMATIONS:
//   fadeUp     — card slides up while fading in (INFO, CONTEXT)
//   slideRight — card slides in from left (BATTLECARD)
//   scaleIn    — card scales from center (STRATEGY)
//   flashBorder — red border pulse (ALERT)
//   geminiPulse — multi-dot pulsing indicator (loading)
// ============================================================

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Brand Colors ───────────────────────────────────────
      colors: {
        // Google brand
        'google-blue':   '#4285F4',
        'google-red':    '#EA4335',
        'google-yellow': '#FBBC04',
        'google-green':  '#34A853',
        // Gemini brand
        'gemini-purple': '#A142F4',
        // Surface
        'surface-white':  '#FFFFFF',
        'surface-light':  '#F8F9FA',
        'surface-medium': '#E8EAED',
        // Text
        'text-primary':   '#202124',
        'text-secondary': '#5F6368',
        'text-muted':     '#9AA0A6',
        // Card label fg colors
        'card-alert':      '#EA4335',
        'card-battlecard': '#FBBC04',
        'card-context':    '#34A853',
        'card-strategy':   '#4285F4',
        'card-info':       '#5F6368',
        // Card label bg colors
        'card-alert-bg':      '#FDE7E7',
        'card-battlecard-bg': '#FEF7E0',
        'card-context-bg':    '#E6F4EA',
        'card-strategy-bg':   '#E8F0FE',
        'card-info-bg':       '#F1F3F4',
        // Card label border colors
        'card-alert-border':      '#F5C6C6',
        'card-battlecard-border': '#FDE293',
        'card-context-border':    '#B7E1C1',
        'card-strategy-border':   '#AECBFA',
        'card-info-border':       '#DADCE0',
      },

      // ── Typography ─────────────────────────────────────────
      fontFamily: {
        sans: [
          'Google Sans',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['Google Sans Mono', 'Roboto Mono', 'monospace'],
      },

      // ── Border Radius ─────────────────────────────────────
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },

      // ── Box Shadows ───────────────────────────────────────
      boxShadow: {
        card:     '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        elevated: '0 4px 16px rgba(0,0,0,0.12)',
        modal:    '0 8px 32px rgba(0,0,0,0.18)',
        'google': '0 1px 2px rgba(60,64,67,0.3), 0 2px 6px rgba(60,64,67,0.15)',
      },

      // ── Keyframe Animations ───────────────────────────────
      keyframes: {
        // Fade up: used for INFO and CONTEXT cards
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Slide from right: used for BATTLECARD
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Scale from center: used for STRATEGY cards
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Flash border pulse: used for ALERT cards
        flashBorder: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(234,67,53,0)' },
          '50%':      { boxShadow: '0 0 0 4px rgba(234,67,53,0.35)' },
        },
        // Gemini loading dots
        geminiDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%':           { transform: 'scale(1)',   opacity: '1'   },
        },
        // Status indicator pulse
        statusPulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        // Slide in from top (for modals/dropdowns)
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Shimmer (skeleton loading)
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },

      animation: {
        'fade-up':        'fadeUp 0.3s ease-out forwards',
        'slide-right':    'slideInRight 0.3s ease-out forwards',
        'scale-in':       'scaleIn 0.25s ease-out forwards',
        'flash-border':   'flashBorder 0.8s ease-in-out 3',
        'gemini-dot':     'geminiDot 1.4s ease-in-out infinite',
        'status-pulse':   'statusPulse 2s ease-in-out infinite',
        'slide-down':     'slideDown 0.2s ease-out forwards',
        'shimmer':        'shimmer 1.5s linear infinite',
      },

      // ── Gradient backgrounds (for gradient text) ──────────
      backgroundImage: {
        'gemini': 'linear-gradient(135deg, #4285F4, #A142F4)',
        'gemini-h': 'linear-gradient(90deg, #4285F4, #A142F4)',
        'gemini-card': 'linear-gradient(135deg, rgba(66,133,244,0.08), rgba(161,66,244,0.08))',
        'google-rainbow': 'linear-gradient(90deg, #4285F4, #EA4335, #FBBC04, #34A853)',
      },
    },
  },
  plugins: [],
};

export default config;
