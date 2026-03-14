// ============================================================
// app/review/components/MeetingSummary.tsx — Meeting Summary View
// ============================================================
//
// PURPOSE:
// Renders the AI-generated meeting summary document.
// Uses react-markdown to render the markdown content with
// custom styling for headers, lists, and emphasis.
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (document type: summary)
// DEPENDENCIES: react-markdown, Document type
// ============================================================

'use client';

import type { Document } from '../../../lib/types';

interface MeetingSummaryProps {
  document?: Document;
}

export default function MeetingSummary({ document }: MeetingSummaryProps) {
  // TODO: Import ReactMarkdown
  // TODO: Render document.content as markdown
  // TODO: Custom components for h1, h2, ul, li styling

  if (!document) {
    return <div className="text-gray-300 text-sm">No summary generated yet.</div>;
  }

  return (
    <div className="prose prose-sm max-w-none">
      {/* TODO: <ReactMarkdown>{document.content}</ReactMarkdown> */}
      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{document.content}</pre>
    </div>
  );
}
