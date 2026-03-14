// ============================================================
// app/review/components/DocumentExport.tsx — Document Export Controls
// ============================================================
//
// PURPOSE:
// Provides export controls for all generated meeting documents.
// Supports three export actions:
//   1. Copy All — concatenates all documents into clipboard (markdown)
//   2. Download .md — triggers browser file download for each doc
//   3. Export to Drive — placeholder (future backend integration)
//
// Also shows individual per-document download buttons when multiple
// documents are available.
//
// CLIPBOARD API: navigator.clipboard.writeText()
// DOWNLOAD API:  Blob + URL.createObjectURL() + anchor click
//
// DEPENDENCIES: Document type, Clipboard API, Blob API
// PROTOCOL REFERENCE: N/A (client-side utility)
// ============================================================

'use client';

import React, { useState } from 'react';
import { Copy, Check, Download, FileText, Cloud } from 'lucide-react';
import { Button }        from '../../../components/ui/Button';
import type { Document } from '../../../lib/types';

// ── Helpers ───────────────────────────────────────────────

/** Label for each document type */
const DOC_TYPE_LABELS: Record<string, string> = {
  'summary':          'Meeting Summary',
  'follow-up-email':  'Follow-Up Email',
  'strategy-brief':   'Strategy Brief',
  'decision-log':     'Decision Log',
};

/**
 * downloadMarkdown
 * Triggers a browser file download for a markdown string.
 * @param content  - markdown text
 * @param filename - desired file name (without extension)
 */
function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = window.document.createElement('a');
  a.href     = url;
  a.download = `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────

interface DocumentExportProps {
  /** List of generated documents to export */
  documents: Document[];
  /** Meeting title used as filename prefix */
  meetingTitle?: string;
}

/**
 * DocumentExport
 * Export toolbar for all meeting documents.
 * Shows "Copy All", "Download All", and per-document buttons.
 *
 * @param documents    - array of Document objects to export
 * @param meetingTitle - used as filename prefix for downloads
 */
export function DocumentExport({ documents, meetingTitle = 'meeting' }: DocumentExportProps) {
  const [copied,   setCopied]   = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (documents.length === 0) return null;

  /** Concatenate all docs with headings into a single markdown string */
  function buildCombined(): string {
    return documents
      .map((doc) => `# ${doc.title}\n\n${doc.content}`)
      .join('\n\n---\n\n');
  }

  /** Copy all documents to clipboard */
  async function handleCopyAll() {
    await navigator.clipboard.writeText(buildCombined());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /** Download all documents as one combined .md file */
  function handleDownloadAll() {
    setDownloading(true);
    const slug = meetingTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    downloadMarkdown(buildCombined(), `dealboard-${slug}`);
    setTimeout(() => setDownloading(false), 800);
  }

  /** Download a single document */
  function handleDownloadOne(doc: Document) {
    const type = DOC_TYPE_LABELS[doc.type] ?? doc.type;
    const slug = type.toLowerCase().replace(/\s+/g, '-');
    downloadMarkdown(doc.content, slug);
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#F8F9FA', border: '1px solid #E8EAED' }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9AA0A6' }}>
        Export Documents
      </h3>

      {/* Main action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={copied ? <Check size={13} /> : <Copy size={13} />}
          onClick={handleCopyAll}
        >
          {copied ? 'Copied!' : 'Copy All'}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          loading={downloading}
          leftIcon={<Download size={13} />}
          onClick={handleDownloadAll}
        >
          Download .md
        </Button>

        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Cloud size={13} />}
          disabled
          title="Coming soon — requires Google Drive integration"
          style={{ opacity: 0.5 }}
        >
          Export to Drive
        </Button>
      </div>

      {/* Per-document download buttons */}
      {documents.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {documents.map((doc) => (
            <button
              key={doc.documentId}
              onClick={() => handleDownloadOne(doc)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
                border transition-colors hover:bg-white"
              style={{ color: '#5F6368', borderColor: '#DADCE0' }}
              title={`Download ${DOC_TYPE_LABELS[doc.type] ?? doc.type}`}
            >
              <FileText size={11} />
              {DOC_TYPE_LABELS[doc.type] ?? doc.type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentExport;
