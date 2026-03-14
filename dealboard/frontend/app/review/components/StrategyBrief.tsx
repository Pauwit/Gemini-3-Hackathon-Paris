// ============================================================
// app/review/components/StrategyBrief.tsx — Strategy Brief View
// ============================================================
//
// PURPOSE:
// Displays the AI-generated internal strategy brief.
// Shows deal health score as a visual gauge, then renders
// competitive positioning, objection responses, and next steps.
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (document type: strategy-brief)
// DEPENDENCIES: Document type, react-markdown
// ============================================================

'use client';

import type { Document } from '../../../lib/types';

interface StrategyBriefProps {
  document?: Document;
}

export default function StrategyBrief({ document }: StrategyBriefProps) {
  // TODO: Parse deal health score from content (regex: /Deal Health: (\d+\.?\d*)\/10/)
  // TODO: Render deal health as circular gauge or progress bar
  // TODO: ReactMarkdown for rest of content

  if (!document) {
    return <div className="text-gray-300 text-sm">No strategy brief generated yet.</div>;
  }

  return (
    <div>
      {/* TODO: Deal health gauge */}
      {/* TODO: ReactMarkdown content */}
      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{document.content}</pre>
    </div>
  );
}
