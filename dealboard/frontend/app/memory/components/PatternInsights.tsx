// ============================================================
// app/memory/components/PatternInsights.tsx — Pattern Insights
// ============================================================
//
// PURPOSE:
// Displays detected behavioral patterns from the Memory Agent.
// Each pattern card shows type, description, evidence count,
// confidence bar, and recommended action.
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/memory/patterns)
// DEPENDENCIES: Pattern type
// ============================================================

'use client';

import type { Pattern } from '../../../lib/types';

interface PatternInsightsProps {
  patterns: Pattern[];
}

export default function PatternInsights({ patterns }: PatternInsightsProps) {
  // TODO: Pattern cards with confidence visualization
  // TODO: Group by pattern type
  // TODO: Evidence count with tooltip showing meeting IDs

  if (patterns.length === 0) {
    return <div className="text-gray-300 text-sm">No patterns detected yet. Patterns emerge after multiple meetings.</div>;
  }

  return (
    <div className="space-y-4">
      {patterns.map(pattern => (
        <div key={pattern.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{pattern.type}</span>
            <span className="text-xs text-gray-400">{Math.round(pattern.confidence * 100)}% confidence</span>
          </div>
          <p className="text-sm text-gray-800 mb-2">{pattern.description}</p>
          {pattern.recommendation && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">{pattern.recommendation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
