// ============================================================
// components/ui/LoadingSpinner.tsx — Gemini-Style Loading Indicator
// ============================================================
//
// PURPOSE:
// Animated loading indicators in two styles:
//   1. GeminiDots  — three pulsing dots with staggered timing,
//      matching the Gemini AI brand aesthetic. Used during pipeline
//      processing and document generation.
//   2. SpinnerRing — classic circular spinner with Google Blue accent.
//      Used for page/data loading states.
//
// Both support size variants (sm | md | lg) and optional label text.
//
// USE CASES:
//   - LiveCardBoard "pipeline processing" overlay (GeminiDots)
//   - Document generation progress (GeminiDots + label)
//   - Dashboard data fetch (SpinnerRing)
//   - Button loading state (SpinnerRing sm, inline)
//
// DESIGN TOKENS: config.COLORS.googleBlue, config.COLORS.geminiPurple
// DEPENDENCIES: None
// ============================================================

'use client';

import React from 'react';

// ── Types ─────────────────────────────────────────────────

type SpinnerSize = 'sm' | 'md' | 'lg';

// ── GeminiDots ────────────────────────────────────────────

interface GeminiDotsProps {
  /** Size variant controls dot diameter */
  size?: SpinnerSize;
  /** Optional text shown below the dots */
  label?: string;
  /** Extra CSS classes on container */
  className?: string;
  /** Render dots horizontally or vertically */
  orientation?: 'horizontal' | 'vertical';
}

const DOT_SIZES: Record<SpinnerSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

const DOT_COLORS = ['#4285F4', '#7B61F8', '#A142F4'] as const;

/**
 * GeminiDots
 * Three dots that pulse in sequence with a staggered delay,
 * matching the Gemini AI loading animation style.
 *
 * @param size        - dot diameter preset
 * @param label       - text shown below
 * @param orientation - horizontal (default) or vertical
 */
export function GeminiDots({
  size      = 'md',
  label,
  className = '',
  orientation = 'horizontal',
}: GeminiDotsProps) {
  return (
    <div
      className={`flex ${orientation === 'vertical' ? 'flex-col' : 'flex-col'} items-center gap-2 ${className}`}
      role="status"
      aria-label={label ?? 'Loading…'}
    >
      <div className="flex items-center gap-1.5">
        {DOT_COLORS.map((color, i) => (
          <span
            key={i}
            className={`rounded-full flex-shrink-0 ${DOT_SIZES[size]}`}
            style={{
              backgroundColor: color,
              animation: `geminiDot 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
            aria-hidden
          />
        ))}
      </div>
      {label && (
        <span className="text-xs" style={{ color: '#5F6368' }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ── SpinnerRing ───────────────────────────────────────────

interface SpinnerRingProps {
  /** Size variant */
  size?: SpinnerSize;
  /** Optional label text below the ring */
  label?: string;
  /** Extra CSS classes */
  className?: string;
  /** Accent color of the moving arc */
  color?: string;
}

const RING_SIZES: Record<SpinnerSize, string> = {
  sm: 'w-4  h-4  border-2',
  md: 'w-6  h-6  border-2',
  lg: 'w-10 h-10 border-[3px]',
};

/**
 * SpinnerRing
 * Classic circular spinner with Google Blue arc.
 * Used for synchronous data loading states.
 *
 * @param size  - ring diameter
 * @param label - optional caption
 * @param color - arc color (defaults to Google Blue)
 */
export function SpinnerRing({
  size     = 'md',
  label,
  className = '',
  color    = '#4285F4',
}: SpinnerRingProps) {
  return (
    <div
      className={`flex flex-col items-center gap-2 ${className}`}
      role="status"
      aria-label={label ?? 'Loading…'}
    >
      <div
        className={`rounded-full flex-shrink-0 ${RING_SIZES[size]}`}
        style={{
          borderColor: '#E8EAED',
          borderTopColor: color,
          animation: 'spin 0.8s linear infinite',
        }}
        aria-hidden
      />
      {label && (
        <span className="text-xs" style={{ color: '#5F6368' }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ── LoadingSpinner (default export, alias for SpinnerRing) ─

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

/**
 * LoadingSpinner
 * Alias for SpinnerRing — the default loading indicator.
 * Use GeminiDots for AI-processing states.
 */
export function LoadingSpinner({ size = 'md', label, className = '' }: LoadingSpinnerProps) {
  return <SpinnerRing size={size} label={label} className={className} />;
}

// ── FullPageLoader ────────────────────────────────────────

interface FullPageLoaderProps {
  label?: string;
}

/**
 * FullPageLoader
 * Centered full-height loading state with Gemini branding.
 * Used for page-level data fetching.
 *
 * @param label - text description of what is loading
 */
export function FullPageLoader({ label = 'Loading…' }: FullPageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div
        className="w-10 h-10 rounded-full flex-shrink-0 border-[3px]"
        style={{
          borderColor: '#E8EAED',
          borderTopColor: '#4285F4',
          animation: 'spin 0.8s linear infinite',
        }}
        aria-hidden
      />
      <p className="text-sm font-medium" style={{ color: '#5F6368' }}>
        {label}
      </p>
    </div>
  );
}

export default LoadingSpinner;
