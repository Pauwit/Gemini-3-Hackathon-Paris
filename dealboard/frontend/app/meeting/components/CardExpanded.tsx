// ============================================================
// app/meeting/components/CardExpanded.tsx — Intelligence Card Detail Modal
// ============================================================
//
// PURPOSE:
// Full-detail modal overlay for a DealBoard intelligence card.
// Shows all card information from the CardPayload:
//   - Color-coded header (label bg) with badge, title, close button
//   - Time, confidence %, triggered-by reference, confidence bar
//   - Summary paragraph (full text, no truncation)
//   - Detail rows: question / answer / source (AgentBadge per source)
//
// USE CASE:
// User clicks a card in LiveCardBoard → this modal opens.
// Provides deep context without leaving the meeting view.
//
// DESIGN:
// Modal lg size. Header tinted with the card's label background color.
// Body scrolls independently. Agent badges mark each source.
//
// DEPENDENCIES: Modal, CardLabelBadge, AgentBadge, config.CARD_COLORS
// PROTOCOL REFERENCE: PROTOCOL.md — CardPayload / CardDetailEntry
// ============================================================

'use client';

import React from 'react';
import { Clock, Target, ChevronRight, X } from 'lucide-react';
import { Modal }                           from '../../../components/ui/Modal';
import { CardLabelBadge, AgentBadge }      from '../../../components/ui/Badge';
import { config }                          from '../../../lib/config';
import type { Card }                       from '../../../lib/types';

// ── Helpers ───────────────────────────────────────────────

/** Short HH:MM AM/PM time from ISO string */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/**
 * extractAgent
 * Infers the originating agent from a source attribution string.
 *   "Gmail: RE: …"       → "gmail"
 *   "Drive: file.pdf"    → "drive"
 *   "Live transcript …"  → "listener"
 *   "Calendar: …"        → "calendar"
 */
function extractAgent(source: string): string {
  const s = source.toLowerCase();
  if (s.startsWith('gmail'))    return 'gmail';
  if (s.startsWith('drive'))    return 'drive';
  if (s.startsWith('calendar')) return 'calendar';
  if (s.startsWith('sheets'))   return 'sheets';
  if (s.includes('transcript') || s.includes('seg-')) return 'listener';
  if (s.includes('memory'))     return 'memory';
  return 'strategy';
}

// ── Component ─────────────────────────────────────────────

interface CardExpandedProps {
  /** Card to display; null = modal closed */
  card:    Card | null;
  /** Close callback */
  onClose: () => void;
}

/**
 * CardExpanded
 * Full-detail overlay for a single intelligence card.
 * Opened when the user clicks a card in LiveCardBoard.
 */
export function CardExpanded({ card, onClose }: CardExpandedProps) {
  if (!card) return null;

  const colors        = config.CARD_COLORS[card.label];
  const confidencePct = Math.round(card.confidence * 100);

  return (
    <Modal isOpen onClose={onClose} size="lg" title="">
      {/* ── Colored header ──────────────────────────────── */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <CardLabelBadge label={card.label} />
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-black/10"
            style={{ color: colors.color }}
            aria-label="Close card detail"
          >
            <X size={15} />
          </button>
        </div>

        <h2 className="text-base font-bold leading-snug mb-3" style={{ color: '#202124' }}>
          {card.title}
        </h2>

        <div className="flex items-center gap-4 flex-wrap mb-3">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: '#5F6368' }}>
            <Clock size={11} />
            {formatTime(card.timestamp)}
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: '#5F6368' }}>
            <Target size={11} />
            Confidence: {confidencePct}%
          </span>
          {card.triggeredBy && (
            <span className="text-xs" style={{ color: '#9AA0A6' }}>
              Triggered: {card.triggeredBy}
            </span>
          )}
        </div>

        {/* Confidence bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${confidencePct}%`, backgroundColor: colors.color }}
          />
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────── */}
      <div className="px-5 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: '56vh' }}>

        {/* Summary */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#9AA0A6' }}>
            Summary
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: '#202124' }}>
            {card.summary}
          </p>
        </section>

        {/* Detail rows */}
        {card.details?.length > 0 && (
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9AA0A6' }}>
              Intelligence Details — {card.details.length} source{card.details.length !== 1 ? 's' : ''}
            </h3>
            <div className="space-y-3">
              {card.details.map((detail, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8EAED' }}>
                  <div
                    className="flex items-start gap-2 px-4 py-2.5"
                    style={{ backgroundColor: '#F8F9FA', borderBottom: '1px solid #E8EAED' }}
                  >
                    <ChevronRight size={13} className="flex-shrink-0 mt-0.5" style={{ color: colors.color }} />
                    <p className="text-xs font-semibold" style={{ color: '#202124' }}>
                      {detail.question}
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm leading-relaxed mb-2.5" style={{ color: '#5F6368' }}>
                      {detail.answer}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <AgentBadge source={extractAgent(detail.source)} />
                      <span
                        className="text-[10px] italic truncate max-w-xs"
                        style={{ color: '#9AA0A6' }}
                        title={detail.source}
                      >
                        {detail.source}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderTop: '1px solid #E8EAED', backgroundColor: '#F8F9FA' }}
      >
        <span className="text-[10px] font-mono" style={{ color: '#9AA0A6' }}>
          {card.cardId}
        </span>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-100"
          style={{ color: '#5F6368', borderColor: '#DADCE0' }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

export default CardExpanded;
