// ============================================================
// app/memory/components/DecisionHistory.tsx — Decision History Timeline
// ============================================================
//
// PURPOSE:
// Timeline-style list of all decisions logged across all meetings.
// Features:
//   - Filter by status: All / Pending / Completed / Cancelled
//   - Sort by date descending
//   - Status-colored dot + Badge per row
//   - "Made by" attribution
//   - Link to source meeting review page
//   - Empty state illustration
//
// DEPENDENCIES: Decision type, Badge
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/memory/decisions)
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import Link                   from 'next/link';
import { CheckCircle2, Clock, XCircle, ExternalLink } from 'lucide-react';
import { Badge }              from '../../../components/ui/Badge';
import type { Decision }      from '../../../lib/types';
import type { BadgeVariant }  from '../../../components/ui/Badge';

// ── Helpers ───────────────────────────────────────────────

function statusVariant(status: string): BadgeVariant {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'default';
  return 'warning';
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed')
    return <CheckCircle2 size={14} style={{ color: '#34A853', flexShrink: 0 }} />;
  if (status === 'cancelled')
    return <XCircle     size={14} style={{ color: '#9AA0A6', flexShrink: 0 }} />;
  return <Clock         size={14} style={{ color: '#F9A825', flexShrink: 0 }} />;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Filter tabs ───────────────────────────────────────────

type Filter = 'all' | 'pending' | 'completed' | 'cancelled';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'pending',   label: 'Pending'   },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// ── Component ─────────────────────────────────────────────

interface DecisionHistoryProps {
  decisions: Decision[];
}

/**
 * DecisionHistory
 * Filterable timeline of all decisions across meetings.
 * Each row links back to the source meeting's review page.
 *
 * @param decisions - Decision array from /api/memory/decisions
 */
export function DecisionHistory({ decisions }: DecisionHistoryProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const sorted = [...decisions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (filter === 'all') return sorted;
    return sorted.filter((d) => d.status === filter);
  }, [decisions, filter]);

  if (decisions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <CheckCircle2 size={32} style={{ color: '#E8EAED' }} />
        <p className="text-sm font-medium" style={{ color: '#9AA0A6' }}>No decisions logged yet</p>
        <p className="text-xs text-center" style={{ color: '#9AA0A6' }}>
          Decisions are extracted from meeting transcripts by the AI
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const count = f.key === 'all'
            ? decisions.length
            : decisions.filter((d) => d.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
              style={{
                backgroundColor: filter === f.key ? '#E8F0FE' : 'transparent',
                color:           filter === f.key ? '#4285F4' : '#5F6368',
                border:          `1px solid ${filter === f.key ? '#AECBFA' : '#DADCE0'}`,
              }}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Decision list */}
      <div className="relative">
        {/* Timeline spine */}
        <div
          className="absolute left-[18px] top-0 bottom-0 w-px"
          style={{ backgroundColor: '#E8EAED' }}
        />

        <div className="space-y-3">
          {filtered.map((decision) => (
            <div key={decision.id} className="flex items-start gap-3 relative">
              {/* Status dot on timeline */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E8EAED' }}
              >
                <StatusIcon status={decision.status} />
              </div>

              {/* Card */}
              <div
                className="flex-1 bg-white rounded-xl p-3.5"
                style={{ border: '1px solid #E8EAED' }}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm leading-snug" style={{ color: '#202124' }}>
                    {decision.description}
                  </p>
                  <Badge variant={statusVariant(decision.status)} pill className="flex-shrink-0 mt-0.5">
                    {decision.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs" style={{ color: '#9AA0A6' }}>
                    {fmtDate(decision.date)}
                  </span>
                  {decision.madeBy && (
                    <span className="text-xs" style={{ color: '#9AA0A6' }}>
                      By: {decision.madeBy}
                    </span>
                  )}
                  {decision.meetingId && (
                    <Link
                      href={`/review?meeting=${decision.meetingId}`}
                      className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
                      style={{ color: '#4285F4' }}
                    >
                      <ExternalLink size={10} />
                      View meeting
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: '#9AA0A6' }}>No {filter} decisions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DecisionHistory;
