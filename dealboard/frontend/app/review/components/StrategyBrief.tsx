// ============================================================
// app/review/components/StrategyBrief.tsx — Strategy Brief Renderer
// ============================================================
//
// PURPOSE:
// Renders the AI-generated internal strategy brief with:
//   - Deal Health score gauge (extracted from content via regex)
//   - Color-coded score ring (red < 5, yellow 5-7, green > 7)
//   - "Internal — Do Not Share" confidentiality banner
//   - Full markdown content via react-markdown
//
// DEAL HEALTH EXTRACTION:
// Parses "Deal Health: X.X/10" or "Deal Health: X/10" from content.
// Falls back to showing the raw markdown without the gauge.
//
// DEPENDENCIES: react-markdown, Document type
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (document type: strategy-brief)
// ============================================================

'use client';

import React, { useMemo } from 'react';
import ReactMarkdown  from 'react-markdown';
import { Lock }       from 'lucide-react';
import type { Document } from '../../../lib/types';

// ── Deal health gauge ─────────────────────────────────────

interface DealHealthGaugeProps {
  score: number; // 0–10
}

/**
 * DealHealthGauge
 * Circular SVG gauge showing the deal health score (0–10).
 * Color: red < 5, yellow 5–7, green > 7.
 */
function DealHealthGauge({ score }: DealHealthGaugeProps) {
  const pct   = score / 10;
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * pct;

  const color = score >= 7.5 ? '#34A853'
    : score >= 5  ? '#FBBC04'
    : '#EA4335';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* Track */}
        <circle cx="40" cy="40" r={r} fill="none" stroke="#E8EAED" strokeWidth="6" />
        {/* Arc */}
        <circle
          cx="40" cy="40" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        {/* Score text */}
        <text x="40" y="44" textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>
          {score.toFixed(1)}
        </text>
        <text x="40" y="56" textAnchor="middle" fontSize="8" fill="#9AA0A6">
          / 10
        </text>
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>Deal Health</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────

interface StrategyBriefProps {
  document?: Document;
  loading?:  boolean;
}

/**
 * StrategyBrief
 * Internal strategy brief renderer with deal health gauge
 * and rich markdown content.
 */
export function StrategyBrief({ document, loading = false }: StrategyBriefProps) {
  const dealHealth = useMemo(() => {
    if (!document) return null;
    const m = document.content.match(/Deal Health[:\s]+(\d+\.?\d*)\/10/i);
    return m ? parseFloat(m[1]) : null;
  }, [document]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[60, 45, 80, 55, 70].map((w, i) => (
          <div key={i} className="h-3 rounded" style={{ width: `${w}%`, backgroundColor: '#E8EAED' }} />
        ))}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <p className="text-sm font-medium" style={{ color: '#9AA0A6' }}>No strategy brief generated yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Internal confidentiality banner */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
        style={{ backgroundColor: '#FEF7E0', border: '1px solid #FDE293', color: '#F9A825' }}
      >
        <Lock size={12} />
        Internal document — Do not share with prospects
      </div>

      {/* Deal health gauge (if extractable) */}
      {dealHealth !== null && (
        <div
          className="flex items-center gap-6 p-4 rounded-xl"
          style={{ border: '1px solid #E8EAED', backgroundColor: '#F8F9FA' }}
        >
          <DealHealthGauge score={dealHealth} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#202124' }}>
              {dealHealth >= 7.5 ? 'Strong deal' : dealHealth >= 5 ? 'Deal in progress' : 'Deal at risk'}
            </p>
            <p className="text-xs" style={{ color: '#5F6368' }}>
              Based on AI analysis of meeting signals, objection handling, and engagement level.
            </p>
          </div>
        </div>
      )}

      {/* Markdown content */}
      <div className="dealboard-prose">
        <ReactMarkdown>{document.content}</ReactMarkdown>
      </div>

      <p className="text-[10px] pt-3" style={{ color: '#9AA0A6', borderTop: '1px solid #E8EAED' }}>
        Generated at {new Date(document.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

export default StrategyBrief;
