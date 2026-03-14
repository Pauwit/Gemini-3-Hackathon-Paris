// ============================================================
// components/ui/Card.tsx — Reusable Card Container Component
// ============================================================
//
// PURPOSE:
// Provides consistent card surface styling used throughout DealBoard.
// Three elevation levels match Google's material surface system:
//   flat     — border only, no shadow (for nested elements)
//   raised   — subtle shadow + border (default)
//   elevated — stronger shadow (for highlighted or floating cards)
//
// USE CASES:
//   - Dashboard stat cards (raised)
//   - Intelligence card items in LiveCardBoard (raised, clickable)
//   - Section panels in Review, Memory, Settings pages (raised)
//   - Modals use the elevated variant internally
//
// PROPS:
//   children   - card content
//   elevation  - shadow/border level
//   onClick    - makes card interactive (pointer cursor, hover lift)
//   className  - additional Tailwind overrides
//   noPadding  - suppress default padding (for custom layouts)
//   header     - optional header node rendered above content
//   footer     - optional footer node rendered below content
//
// DESIGN TOKENS: --shadow-card, --shadow-elevated, --color-surface-white
// DEPENDENCIES: None
// ============================================================

'use client';

import React from 'react';

// ── Types ─────────────────────────────────────────────────

type CardElevation = 'flat' | 'raised' | 'elevated';

interface CardProps {
  /** Card body content */
  children: React.ReactNode;
  /** Shadow / border intensity */
  elevation?: CardElevation;
  /** Click handler — adds pointer cursor and hover effect */
  onClick?: () => void;
  /** Extra Tailwind classes */
  className?: string;
  /** Suppress default p-4 padding */
  noPadding?: boolean;
  /** Optional header section (rendered above main content, with border-bottom) */
  header?: React.ReactNode;
  /** Optional footer section (rendered below main content, with border-top) */
  footer?: React.ReactNode;
  /** Aria label for interactive cards */
  'aria-label'?: string;
}

// ── Style maps ────────────────────────────────────────────

const ELEVATION_STYLES: Record<CardElevation, React.CSSProperties> = {
  flat:     { border: '1px solid #E8EAED', boxShadow: 'none' },
  raised:   { border: '1px solid #E8EAED', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' },
  elevated: { border: '1px solid #E8EAED', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
};

/**
 * Card
 * Reusable surface container with Google Material-inspired elevation.
 * When onClick is provided, gains hover lift + pointer cursor.
 *
 * @param children   - card body content
 * @param elevation  - surface depth (flat | raised | elevated)
 * @param onClick    - optional click handler
 * @param noPadding  - remove default p-4 body padding
 * @param header     - optional header node
 * @param footer     - optional footer node
 */
export function Card({
  children,
  elevation = 'raised',
  onClick,
  className = '',
  noPadding = false,
  header,
  footer,
  'aria-label': ariaLabel,
}: CardProps) {
  const isInteractive = Boolean(onClick);

  return (
    <div
      className={`
        bg-white rounded-xl overflow-hidden
        transition-shadow duration-150
        ${isInteractive ? 'cursor-pointer hover:shadow-elevated' : ''}
        ${className}
      `}
      style={ELEVATION_STYLES[elevation]}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
    >
      {header && (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: '#E8EAED', backgroundColor: '#F8F9FA' }}
        >
          {header}
        </div>
      )}

      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>

      {footer && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: '#E8EAED', backgroundColor: '#F8F9FA' }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────

interface StatCardProps {
  /** Metric label */
  label: string;
  /** Numeric or text value to display prominently */
  value: string | number;
  /** Optional trend text (e.g. "+12 this week") */
  trend?: string;
  /** Optional icon shown top-right */
  icon?: React.ReactNode;
  /** Accent color for the value text */
  accentColor?: string;
  /** Extra classes */
  className?: string;
}

/**
 * StatCard
 * Dashboard metric card showing a label + large value + optional trend.
 *
 * @param label      - metric name
 * @param value      - primary value to display
 * @param trend      - secondary trend text
 * @param icon       - icon element (top-right)
 * @param accentColor - CSS color for value text
 */
export function StatCard({ label, value, trend, icon, accentColor = '#202124', className = '' }: StatCardProps) {
  return (
    <Card elevation="raised" className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium mb-1" style={{ color: '#5F6368' }}>
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight" style={{ color: accentColor }}>
            {value}
          </p>
          {trend && (
            <p className="text-xs mt-1" style={{ color: '#9AA0A6' }}>
              {trend}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ml-3"
            style={{ backgroundColor: '#F8F9FA' }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export default Card;
