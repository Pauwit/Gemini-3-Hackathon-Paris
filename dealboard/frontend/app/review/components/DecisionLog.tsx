// ============================================================
// app/review/components/DecisionLog.tsx — Decision Log Table
// ============================================================
//
// PURPOSE:
// Displays the structured decision log from the AI-generated document.
// Parses the markdown table from document.content into structured rows
// and renders an interactive table with:
//   - Status badges: Pending (yellow), Completed (green), Under Consideration (blue)
//   - Filter tabs: All / Pending / Completed
//   - Owner and due-date columns
//   - "Open Questions" section parsed from markdown
//   - Fallback to raw markdown if table parsing fails
//
// TABLE PARSING:
// Looks for markdown table rows: | # | Decision | Owner | Status | Due |
// Extracts rows using regex. Falls back gracefully.
//
// DEPENDENCIES: react-markdown, Badge, Document type
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (document type: decision-log)
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import ReactMarkdown  from 'react-markdown';
import { CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import { Badge }         from '../../../components/ui/Badge';
import type { Document } from '../../../lib/types';

// ── Types ─────────────────────────────────────────────────

interface DecisionRow {
  num:        string;
  decision:   string;
  owner:      string;
  status:     string;
  due:        string;
}

// ── Helpers ───────────────────────────────────────────────

/**
 * parseTable
 * Extracts markdown table rows from the decision log content.
 * Handles the | # | Decision | Owner | Status | Due | format.
 */
function parseTable(content: string): DecisionRow[] {
  const rows: DecisionRow[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 5) continue;
    if (cells[0] === '#' || /^[-:]+$/.test(cells[0])) continue;
    rows.push({
      num:      cells[0],
      decision: cells[1],
      owner:    cells[2],
      status:   cells[3],
      due:      cells[4],
    });
  }
  return rows;
}

/**
 * statusVariant
 * Maps status text to Badge variant.
 */
function statusVariant(status: string): 'warning' | 'success' | 'info' | 'default' {
  const s = status.toLowerCase();
  if (s.includes('pending'))       return 'warning';
  if (s.includes('complete'))      return 'success';
  if (s.includes('consideration')) return 'info';
  return 'default';
}

/**
 * statusIcon
 * Returns an icon component matching the status.
 */
function StatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s.includes('complete'))      return <CheckCircle2 size={12} style={{ color: '#34A853' }} />;
  if (s.includes('pending'))       return <Clock size={12} style={{ color: '#F9A825' }} />;
  return <HelpCircle size={12} style={{ color: '#4285F4' }} />;
}

// ── Component ─────────────────────────────────────────────

type FilterState = 'all' | 'pending' | 'completed';

interface DecisionLogProps {
  document?: Document;
  loading?:  boolean;
}

/**
 * DecisionLog
 * Filterable table of decisions extracted from the AI decision log document.
 * Falls back to raw markdown rendering if parsing fails.
 */
export function DecisionLog({ document, loading = false }: DecisionLogProps) {
  const [filter, setFilter] = useState<FilterState>('all');

  const rows = useMemo(() => (document ? parseTable(document.content) : []), [document]);
  const hasTable = rows.length > 0;

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => {
      const s = r.status.toLowerCase();
      if (filter === 'pending')   return s.includes('pending') || s.includes('consideration');
      if (filter === 'completed') return s.includes('complete');
      return true;
    });
  }, [rows, filter]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[90, 70, 85, 60].map((w, i) => (
          <div key={i} className="h-8 rounded" style={{ width: `${w}%`, backgroundColor: '#E8EAED' }} />
        ))}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <p className="text-sm font-medium" style={{ color: '#9AA0A6' }}>No decision log generated yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      {hasTable && (
        <div className="flex gap-1">
          {(['all', 'pending', 'completed'] as FilterState[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
              style={{
                backgroundColor: filter === f ? '#E8F0FE' : 'transparent',
                color:           filter === f ? '#4285F4' : '#5F6368',
                border:          `1px solid ${filter === f ? '#AECBFA' : '#DADCE0'}`,
              }}
            >
              {f === 'all' ? `All (${rows.length})` : f}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {hasTable ? (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8EAED' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F8F9FA', borderBottom: '1px solid #E8EAED' }}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold w-8" style={{ color: '#5F6368' }}>#</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#5F6368' }}>Decision / Action</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold w-32" style={{ color: '#5F6368' }}>Owner</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold w-36" style={{ color: '#5F6368' }}>Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold w-28" style={{ color: '#5F6368' }}>Due</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: idx < filteredRows.length - 1 ? '1px solid #F1F3F4' : 'none',
                    backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                  }}
                >
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: '#9AA0A6' }}>{row.num}</td>
                  <td className="px-4 py-3 text-xs leading-relaxed" style={{ color: '#202124' }}>{row.decision}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#5F6368' }}>{row.owner}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={row.status} />
                      <Badge variant={statusVariant(row.status)} pill>{row.status}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#9AA0A6' }}>{row.due || '—'}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs" style={{ color: '#9AA0A6' }}>
                    No {filter} items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Fallback: raw markdown */
        <div className="dealboard-prose">
          <ReactMarkdown>{document.content}</ReactMarkdown>
        </div>
      )}

      <p className="text-[10px] pt-3" style={{ color: '#9AA0A6', borderTop: '1px solid #E8EAED' }}>
        Generated at {new Date(document.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

export default DecisionLog;
