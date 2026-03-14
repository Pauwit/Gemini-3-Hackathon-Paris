// ============================================================
// components/ui/Badge.tsx — Colored Badge / Pill Component
// ============================================================
//
// PURPOSE:
// Pill-shaped badge for card labels, status indicators, and tags.
// Uses config.CARD_COLORS for label-specific styling.
// Supports custom color or one of the 5 card label presets.
//
// DEPENDENCIES: config.CARD_COLORS, CardLabel type
// ============================================================

'use client';

import { config } from '../../lib/config';
import type { CardLabel } from '../../lib/types';

interface BadgeProps {
  label: CardLabel | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ label, size = 'sm', className = '' }: BadgeProps) {
  const cardColor = config.CARD_COLORS[label as CardLabel];
  const style = cardColor
    ? { color: cardColor.color, backgroundColor: cardColor.bg, borderColor: cardColor.border }
    : { color: '#5F6368', backgroundColor: '#F1F3F4', borderColor: '#DADCE0' };

  const sizeClass = size === 'md' ? 'text-xs px-2.5 py-1' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border ${sizeClass} ${className}`}
      style={style}
    >
      {label}
    </span>
  );
}

export default Badge;
