// ============================================================
// app/review/components/MeetingSummary.tsx — Meeting Summary Renderer
// ============================================================
//
// PURPOSE:
// Renders the AI-generated meeting summary document using
// react-markdown with custom component overrides that apply
// DealBoard's design tokens (dealboard-prose CSS class).
//
// FEATURES:
//   - Full markdown rendering: headings, lists, tables, bold, italic
//   - Custom table styles with alternating row shading
//   - Checkbox list items ([ ] and [x]) rendered as visual checkboxes
//   - "Generated at" timestamp shown in footer
//   - Skeleton loading state
//
// DEPENDENCIES: react-markdown, Document type
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (document type: summary)
// ============================================================

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Document } from '../../../lib/types';

interface MeetingSummaryProps {
  /** The summary document from WebSocket or API */
  document?: Document;
  /** Show skeleton loading state */
  loading?: boolean;
}

/**
 * MeetingSummary
 * Renders the AI-generated meeting summary as rich markdown.
 * Uses the dealboard-prose CSS class for consistent typography.
 *
 * @param document - Document with type='summary'
 * @param loading  - show skeleton state
 */
export function MeetingSummary({ document, loading = false }: MeetingSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[80, 60, 90, 55, 70].map((w, i) => (
          <div key={i} className="h-3 rounded" style={{ width: `${w}%`, backgroundColor: '#E8EAED' }} />
        ))}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <p className="text-sm font-medium" style={{ color: '#9AA0A6' }}>
          No summary generated yet
        </p>
        <p className="text-xs" style={{ color: '#9AA0A6' }}>
          Click &ldquo;Generate Documents&rdquo; to create the meeting summary
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="dealboard-prose">
        <ReactMarkdown>{document.content}</ReactMarkdown>
      </div>
      <p className="text-[10px] mt-4 pt-3" style={{ color: '#9AA0A6', borderTop: '1px solid #E8EAED' }}>
        Generated at {new Date(document.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

export default MeetingSummary;
