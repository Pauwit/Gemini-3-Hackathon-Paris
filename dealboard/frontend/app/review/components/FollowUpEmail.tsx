// ============================================================
// app/review/components/FollowUpEmail.tsx — Follow-Up Email View
// ============================================================
//
// PURPOSE:
// Displays the AI-generated follow-up email with an email-client
// style UI. Allows copying to clipboard or opening in default mail client.
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (document type: follow-up-email)
// DEPENDENCIES: Document type, Clipboard API
// ============================================================

'use client';

import type { Document } from '../../../lib/types';

interface FollowUpEmailProps {
  document?: Document;
}

export default function FollowUpEmail({ document }: FollowUpEmailProps) {
  // TODO: Parse Subject from content (first line after **Subject:**)
  // TODO: Copy to clipboard button
  // TODO: "Open in Gmail" button with mailto: link
  // TODO: Render body with react-markdown

  if (!document) {
    return <div className="text-gray-300 text-sm">No follow-up email generated yet.</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <p className="text-xs text-gray-500">Follow-Up Email</p>
        {/* TODO: Extract and show subject line */}
      </div>
      <div className="p-4">
        {/* TODO: ReactMarkdown content */}
        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{document.content}</pre>
      </div>
      {/* TODO: Copy / Open in Gmail buttons */}
    </div>
  );
}
