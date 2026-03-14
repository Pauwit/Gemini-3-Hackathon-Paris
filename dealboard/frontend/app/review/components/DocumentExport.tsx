// ============================================================
// app/review/components/DocumentExport.tsx — Document Export
// ============================================================
//
// PURPOSE:
// Provides export controls for all generated documents.
// Supports: copy markdown to clipboard, download as .md file,
// and (future) export to Google Docs via Drive API.
//
// PROTOCOL REFERENCE: N/A (client-side utility)
// DEPENDENCIES: Document type, Clipboard API, Blob/URL API
// ============================================================

'use client';

import type { Document } from '../../../lib/types';

interface DocumentExportProps {
  documents: Document[];
}

export default function DocumentExport({ documents }: DocumentExportProps) {
  // TODO: "Copy All" button — concatenate all docs into clipboard
  // TODO: "Download .md" button — Blob download for each document
  // TODO: "Export to Drive" button — future: POST to backend Drive worker
  // TODO: Individual document download buttons

  return (
    <div className="flex items-center gap-2">
      <button className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
        Copy Markdown
      </button>
      <button className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
        Download .md
      </button>
      <button className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 opacity-50 cursor-not-allowed" disabled>
        Export to Drive (TODO)
      </button>
    </div>
  );
}
