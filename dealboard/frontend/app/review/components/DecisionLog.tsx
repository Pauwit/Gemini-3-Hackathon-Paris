// ============================================================
// app/review/components/DecisionLog.tsx — Decision Log View
// ============================================================
//
// PURPOSE:
// Displays the structured decision log as a filterable table.
// Each row shows decision description, owner, status badge,
// and due date. Allows marking items complete.
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (document type: decision-log)
// DEPENDENCIES: Document type, Decision type, Badge
// ============================================================

'use client';

import type { Document } from '../../../lib/types';

interface DecisionLogProps {
  document?: Document;
}

export default function DecisionLog({ document }: DecisionLogProps) {
  // TODO: Parse markdown table from document.content into Decision[] array
  // TODO: Render as interactive table with status badges
  // TODO: Filter by status: All / Pending / Completed
  // TODO: Allow toggling status (local state — future: API call)

  if (!document) {
    return <div className="text-gray-300 text-sm">No decision log generated yet.</div>;
  }

  return (
    <div>
      {/* TODO: Status filter tabs */}
      {/* TODO: Decision table */}
      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{document.content}</pre>
    </div>
  );
}
