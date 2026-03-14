// ============================================================
// components/ui/Badge.tsx — Card Label Badge + Generic Badge Components
// ============================================================
//
// PURPOSE:
// Provides color-coded badge components for DealBoard UI:
//   - CardLabelBadge: renders ALERT/BATTLECARD/CONTEXT/STRATEGY/INFO labels
//     using exact colors from config.ts CARD_COLORS
//   - Badge: generic status/tag badge with variant presets
//   - AgentBadge: shows which agent sourced a card detail
//     (gmail, drive, calendar, sheets, listener, memory, strategy)
//
// USE CASES:
//   - Card label in LiveCardBoard and CardExpanded
//   - Decision status in DecisionLog (Pending, Completed, Cancelled)
//   - Agent source attribution in card detail rows
//   - Count pills in TopBar alert summary
//
// DESIGN TOKENS: config.ts CARD_COLORS
// DEPENDENCIES: config.ts, lib/types.ts
// ============================================================

'use client';

import React from 'react';
import { config } from '../../lib/config';
import type { CardLabel } from '../../lib/types';

// ── Card Label Badge ─────────────────────────────────────

interface CardLabelBadgeProps {
  /** Card label type (ALERT, BATTLECARD, CONTEXT, STRATEGY, INFO) */
  label: CardLabel;
  /** Compact display mode */
  small?: boolean;
  /** Extra CSS classes */
  className?: string;
}

/** Emoji prefix per label type for quick visual scanning */
const LABEL_EMOJI: Record<CardLabel, string> = {
  ALERT:      '⚡',
  BATTLECARD: '⚔',
  CONTEXT:    '📋',
  STRATEGY:   '🎯',
  INFO:       'ℹ',
};

/**
 * CardLabelBadge
 * Renders a color-coded label badge for a DealBoard card type.
 * Uses exact bg/color/border from config.CARD_COLORS.
 *
 * @param label   - CardLabel enum value
 * @param small   - renders at reduced size (10px)
 * @param className - additional CSS classes
 */
export function CardLabelBadge({ label, small = false, className = '' }: CardLabelBadgeProps) {
  const colors = config.CARD_COLORS[label];

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider border
        ${small ? 'text-[9px] px-1.5 py-0.5 rounded' : 'text-[10px] px-2 py-0.5 rounded-full'}
        ${className}`}
      style={{
        color:           colors.color,
        backgroundColor: colors.bg,
        borderColor:     colors.border,
      }}
    >
      <span role="img" aria-hidden style={{ fontSize: small ? '8px' : '9px' }}>
        {LABEL_EMOJI[label]}
      </span>
      {label}
    </span>
  );
}

// ── Generic Badge ─────────────────────────────────────────

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'ghost';

interface BadgeProps {
  /** Badge text or node content */
  children: React.ReactNode;
  /** Color variant preset */
  variant?: BadgeVariant;
  /** Extra CSS classes */
  className?: string;
  /** Full rounded pill vs subtle rounded */
  pill?: boolean;
  /** Show a colored dot before text */
  dot?: boolean;
}

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  default: { bg: '#F1F3F4', color: '#5F6368', border: '#DADCE0' },
  success: { bg: '#E6F4EA', color: '#34A853', border: '#B7E1C1' },
  warning: { bg: '#FEF7E0', color: '#F9A825', border: '#FDE293' },
  danger:  { bg: '#FDE7E7', color: '#EA4335', border: '#F5C6C6' },
  info:    { bg: '#E8F0FE', color: '#4285F4', border: '#AECBFA' },
  purple:  { bg: '#F3E8FD', color: '#A142F4', border: '#D5AAFC' },
  ghost:   { bg: 'transparent', color: '#5F6368', border: '#DADCE0' },
};

/**
 * Badge
 * Generic badge for status labels, counts, and tags.
 *
 * @param children - badge content
 * @param variant  - color preset
 * @param pill     - fully rounded corners
 * @param dot      - show a colored circle before text
 */
export function Badge({
  children,
  variant = 'default',
  className = '',
  pill = false,
  dot = false,
}: BadgeProps) {
  const s = BADGE_STYLES[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5
        border ${pill ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ color: s.color, backgroundColor: s.bg, borderColor: s.border }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: s.color }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

// ── Agent Source Badge ────────────────────────────────────

export type AgentSource =
  | 'gmail'
  | 'drive'
  | 'calendar'
  | 'sheets'
  | 'listener'
  | 'memory'
  | 'strategy';

interface AgentBadgeProps {
  /** Agent / data source name (case-insensitive) */
  source: string;
  /** Extra CSS classes */
  className?: string;
}

const AGENT_STYLES: Record<AgentSource, { bg: string; color: string; icon: string }> = {
  gmail:    { bg: '#FDE7E7', color: '#EA4335', icon: '✉' },
  drive:    { bg: '#E8F0FE', color: '#4285F4', icon: '📁' },
  calendar: { bg: '#FEF7E0', color: '#F9A825', icon: '📅' },
  sheets:   { bg: '#E6F4EA', color: '#34A853', icon: '📊' },
  listener: { bg: '#F3E8FD', color: '#A142F4', icon: '🎤' },
  memory:   { bg: '#F3E8FD', color: '#A142F4', icon: '🧠' },
  strategy: { bg: '#E8F0FE', color: '#4285F4', icon: '🎯' },
};

/**
 * AgentBadge
 * Shows which agent/tool provided a piece of information.
 * Used in CardExpanded detail rows.
 *
 * @param source - agent name string (gmail, drive, calendar, etc.)
 */
export function AgentBadge({ source, className = '' }: AgentBadgeProps) {
  const key = source.toLowerCase().split(/[\s:/(]/)[0] as AgentSource;
  const s = AGENT_STYLES[key] ?? { bg: '#F1F3F4', color: '#5F6368', icon: '⚙' };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${className}`}
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      <span aria-hidden style={{ fontSize: '9px' }}>{s.icon}</span>
      {key}
    </span>
  );
}

export default Badge;
