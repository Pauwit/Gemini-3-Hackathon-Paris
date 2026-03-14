// ============================================================
// app/review/components/FollowUpEmail.tsx — Follow-Up Email Renderer
// ============================================================
//
// PURPOSE:
// Displays the AI-generated follow-up email in an email-client
// style UI with:
//   - Extracted Subject line displayed as email header
//   - "To:" field (recipients from meeting participants)
//   - Rich body rendered via react-markdown
//   - Copy to clipboard button
//   - "Open in Gmail" button using mailto: URI
//
// SUBJECT EXTRACTION:
// Looks for "**Subject:**" or "Subject:" on the first content line.
// Falls back to document.title.
//
// DEPENDENCIES: react-markdown, Clipboard API, Document type
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (document type: follow-up-email)
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Mail, ExternalLink } from 'lucide-react';
import { Button }        from '../../../components/ui/Button';
import type { Document } from '../../../lib/types';

// ── Helpers ───────────────────────────────────────────────

/**
 * extractSubject
 * Parses the Subject line from the email markdown content.
 * Handles formats: "**Subject:** Foo", "Subject: Foo"
 */
function extractSubject(content: string, fallback: string): string {
  const match = content.match(/\*\*Subject:\*\*\s*(.+)/i)
    ?? content.match(/^Subject:\s*(.+)/im);
  return match?.[1]?.trim() ?? fallback;
}

/**
 * extractBody
 * Returns the email body after stripping the Subject header line.
 */
function extractBody(content: string): string {
  return content
    .replace(/^\*\*Subject:\*\*.*\n?/im, '')
    .replace(/^Subject:.*\n?/im, '')
    .trim();
}

// ── Component ─────────────────────────────────────────────

interface FollowUpEmailProps {
  document?: Document;
  loading?:  boolean;
}

/**
 * FollowUpEmail
 * Email-client style renderer for the AI follow-up email.
 * Supports copy-to-clipboard and mailto: launch.
 */
export function FollowUpEmail({ document, loading = false }: FollowUpEmailProps) {
  const [copied, setCopied] = useState(false);

  const subject = useMemo(
    () => document ? extractSubject(document.content, document.title) : '',
    [document]
  );
  const body = useMemo(
    () => document ? extractBody(document.content) : '',
    [document]
  );

  /** Copy full email text to clipboard */
  async function handleCopy() {
    if (!document) return;
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /** Open default mail client with pre-filled subject + body */
  function handleOpenMail() {
    const uri = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(uri, '_blank');
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[40, 70, 60, 85, 55].map((w, i) => (
          <div key={i} className="h-3 rounded" style={{ width: `${w}%`, backgroundColor: '#E8EAED' }} />
        ))}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Mail size={32} style={{ color: '#E8EAED' }} />
        <p className="text-sm font-medium" style={{ color: '#9AA0A6' }}>No follow-up email generated yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8EAED' }}>
      {/* Email header */}
      <div
        className="px-5 py-4"
        style={{ backgroundColor: '#F8F9FA', borderBottom: '1px solid #E8EAED' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail size={16} style={{ color: '#4285F4' }} />
            <span className="text-sm font-semibold" style={{ color: '#202124' }}>Follow-Up Email</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={copied ? <Check size={13} /> : <Copy size={13} />} onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="ghost" size="sm" leftIcon={<ExternalLink size={13} />} onClick={handleOpenMail}>
              Open in Mail
            </Button>
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-semibold w-14 flex-shrink-0" style={{ color: '#9AA0A6' }}>Subject</span>
            <span className="text-sm font-medium" style={{ color: '#202124' }}>{subject}</span>
          </div>
        </div>
      </div>

      {/* Email body */}
      <div className="px-5 py-5">
        <div className="dealboard-prose">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>
      </div>

      <div className="px-5 py-3" style={{ borderTop: '1px solid #E8EAED', backgroundColor: '#F8F9FA' }}>
        <p className="text-[10px]" style={{ color: '#9AA0A6' }}>
          Generated at {new Date(document.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default FollowUpEmail;
