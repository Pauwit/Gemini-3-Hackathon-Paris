// ============================================================
// app/memory/components/PatternInsights.tsx — Pattern Insight Cards
// ============================================================
//
// PURPOSE:
// Displays behavioral patterns detected by the Memory Agent across
// multiple meetings. Each pattern card shows:
//   - Pattern type badge (color-coded by type)
//   - Description
//   - Confidence bar with percentage
//   - Evidence count (meeting references)
//   - Recommended action (if present) — highlighted blue box
//
// PATTERN TYPES and their colors:
//   pricing_concern   → yellow/warning
//   migration_risk    → orange/danger
//   compliance_block  → red/danger
//   champion_dynamics → blue/info
//   competitive_threat→ purple
//   (default)         → grey
//
// DATA FLOW: GET /api/memory/patterns → Pattern[] → grid of cards
//
// DEPENDENCIES: Pattern type, Badge
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/memory/patterns)
// ============================================================

'use client';

import React from 'react';
import { Lightbulb, TrendingUp } from 'lucide-react';
import { Badge }         from '../../../components/ui/Badge';
import type { Pattern }  from '../../../lib/types';

// ── Type → variant map ────────────────────────────────────

import type { BadgeVariant } from '../../../components/ui/Badge';

function patternVariant(type: string): BadgeVariant {
  const t = type.toLowerCase();
  if (t.includes('pricing') || t.includes('cost'))   return 'warning';
  if (t.includes('risk')    || t.includes('blocker')) return 'danger';
  if (t.includes('compli'))                          return 'danger';
  if (t.includes('competi'))                         return 'purple';
  if (t.includes('champion') || t.includes('trust')) return 'info';
  if (t.includes('positive') || t.includes('win'))   return 'success';
  return 'default';
}

function confidenceColor(conf: number): string {
  if (conf >= 0.8) return '#34A853';
  if (conf >= 0.6) return '#FBBC04';
  return '#EA4335';
}

// ── Pattern Card ──────────────────────────────────────────

function PatternCard({ pattern }: { pattern: Pattern }) {
  const variant   = patternVariant(pattern.type);
  const color     = confidenceColor(pattern.confidence);
  const pct       = Math.round(pattern.confidence * 100);
  const evidCount = pattern.evidence?.length ?? 0;

  return (
    <div
      className="bg-white rounded-xl p-4"
      style={{ border: '1px solid #E8EAED', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      {/* Type badge + confidence */}
      <div className="flex items-center justify-between mb-2.5">
        <Badge variant={variant} pill>
          {pattern.type.replace(/_/g, ' ')}
        </Badge>
        <div className="flex items-center gap-1 text-xs font-semibold" style={{ color }}>
          <TrendingUp size={11} />
          {pct}%
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed mb-3" style={{ color: '#202124' }}>
        {pattern.description}
      </p>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#E8EAED' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Evidence count */}
      {evidCount > 0 && (
        <p className="text-[10px] mb-2" style={{ color: '#9AA0A6' }}>
          {evidCount} evidence point{evidCount !== 1 ? 's' : ''} across meetings
        </p>
      )}

      {/* Recommendation */}
      {pattern.recommendation && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ backgroundColor: '#E8F0FE', border: '1px solid #AECBFA' }}
        >
          <Lightbulb size={12} style={{ color: '#4285F4', flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: '#4285F4' }}>{pattern.recommendation}</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────

interface PatternInsightsProps {
  patterns: Pattern[];
}

/**
 * PatternInsights
 * Grid of pattern insight cards from the Memory Agent.
 * Sorted by confidence descending.
 *
 * @param patterns - Pattern array from /api/memory/patterns
 */
export function PatternInsights({ patterns }: PatternInsightsProps) {
  if (patterns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Lightbulb size={32} style={{ color: '#E8EAED' }} />
        <p className="text-sm font-medium" style={{ color: '#9AA0A6' }}>No patterns detected yet</p>
        <p className="text-xs text-center max-w-[240px]" style={{ color: '#9AA0A6' }}>
          Patterns emerge after multiple meetings with the same prospect or account
        </p>
      </div>
    );
  }

  const sorted = [...patterns].sort((a, b) => b.confidence - a.confidence);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sorted.map((p) => (
        <PatternCard key={p.id} pattern={p} />
      ))}
    </div>
  );
}

export default PatternInsights;
