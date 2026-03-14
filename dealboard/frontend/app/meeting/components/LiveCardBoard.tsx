// ============================================================
// app/meeting/components/LiveCardBoard.tsx — Real-Time Intelligence Card Grid
// ============================================================
//
// PURPOSE:
// Displays intelligence cards as they arrive from the server via
// WebSocket during a live meeting. Each card is animated on entry
// with a label-specific animation (ALERT = flash+scale, BATTLECARD =
// slide-right, CONTEXT/INFO = fade-up, STRATEGY = scale-in).
//
// SORTING: ALERT first, then by timestamp descending.
//
// CARD DISPLAY:
//   - Label badge (color-coded)
//   - Title (truncated to 2 lines)
//   - Summary (truncated to 3 lines)
//   - Confidence bar
//   - Timestamp
//   - Click → opens CardExpanded modal
//
// EMPTY STATE:
//   Waiting illustration with pulsing Gemini dots.
//
// PIPELINE OVERLAY:
//   Semi-transparent overlay with GeminiDots when pipeline is active.
//
// DATA FLOW: useWebSocketContext → cards[] → sorted render
//
// DEPENDENCIES: useWebSocketContext, CardExpanded, CardLabelBadge,
//               GeminiDots, config.CARD_COLORS
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (card message)
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import { Clock, Zap } from 'lucide-react';
import { useWebSocketContext }  from '../../../components/providers/WebSocketProvider';
import { CardExpanded }         from './CardExpanded';
import { CardLabelBadge }       from '../../../components/ui/Badge';
import { GeminiDots }           from '../../../components/ui/LoadingSpinner';
import { config }               from '../../../lib/config';
import type { Card, CardLabel } from '../../../lib/types';

// ── Label sort priority ───────────────────────────────────

const LABEL_PRIORITY: Record<CardLabel, number> = {
  ALERT:      0,
  BATTLECARD: 1,
  STRATEGY:   2,
  CONTEXT:    3,
  INFO:       4,
};

// ── Entry animation per label ─────────────────────────────

const ENTRY_ANIMATION: Record<CardLabel, string> = {
  ALERT:      'card-enter-alert',
  BATTLECARD: 'card-enter-battlecard',
  CONTEXT:    'card-enter-context',
  STRATEGY:   'card-enter-strategy',
  INFO:       'card-enter-info',
};

// ── Helpers ───────────────────────────────────────────────

/** Short relative time: "just now", "2m ago", "10:32 AM" */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Card item component ───────────────────────────────────

interface CardItemProps {
  card:    Card;
  onClick: (card: Card) => void;
}

/**
 * CardItem
 * Single intelligence card tile in the board grid.
 * Animated on mount. Click opens CardExpanded modal.
 */
function CardItem({ card, onClick }: CardItemProps) {
  const colors = config.CARD_COLORS[card.label];
  const pct    = Math.round(card.confidence * 100);

  return (
    <div
      className={`bg-white rounded-xl cursor-pointer group transition-all duration-200
        hover:shadow-elevated ${ENTRY_ANIMATION[card.label]}`}
      style={{ border: `1px solid ${colors.border}` }}
      onClick={() => onClick(card)}
      role="button"
      tabIndex={0}
      aria-label={`${card.label} card: ${card.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(card); }}
    >
      {/* Colored top stripe */}
      <div
        className="h-1 rounded-t-xl"
        style={{ backgroundColor: colors.color }}
      />

      <div className="p-3.5">
        {/* Label + time */}
        <div className="flex items-center justify-between mb-2">
          <CardLabelBadge label={card.label} small />
          <span className="flex items-center gap-1 text-[10px]" style={{ color: '#9AA0A6' }}>
            <Clock size={9} />
            {relativeTime(card.timestamp)}
          </span>
        </div>

        {/* Title */}
        <h3
          className="text-sm font-semibold leading-snug mb-1.5 line-clamp-2"
          style={{ color: '#202124' }}
        >
          {card.title}
        </h3>

        {/* Summary */}
        <p
          className="text-xs leading-relaxed line-clamp-3 mb-3"
          style={{ color: '#5F6368' }}
        >
          {card.summary}
        </p>

        {/* Confidence bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium" style={{ color: '#9AA0A6' }}>
              Confidence
            </span>
            <span className="text-[10px] font-semibold" style={{ color: colors.color }}>
              {pct}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: colors.color }}
            />
          </div>
        </div>

        {/* Details count */}
        {card.details?.length > 0 && (
          <p
            className="text-[10px] mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: colors.color }}
          >
            {card.details.length} source{card.details.length !== 1 ? 's' : ''} — click to expand
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

/**
 * LiveCardBoard
 * Real-time grid of intelligence cards received via WebSocket.
 * Shows empty state when no cards, pipeline overlay when processing.
 * Cards are sorted ALERT-first, then by timestamp descending.
 */
export function LiveCardBoard() {
  const { cards, pipelineStatus, meetingState } = useWebSocketContext();
  const [expandedCard, setExpandedCard]         = useState<Card | null>(null);

  // Sort: ALERT first, then by priority, then timestamp desc
  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const pDiff = LABEL_PRIORITY[a.label] - LABEL_PRIORITY[b.label];
      if (pDiff !== 0) return pDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [cards]);

  const isProcessing = pipelineStatus &&
    pipelineStatus.stage !== 'done' &&
    pipelineStatus.stage !== 'error';

  const isActive = meetingState?.state === 'active' || meetingState?.state === 'starting';

  return (
    <div className="h-full flex flex-col relative">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Zap size={15} style={{ color: '#4285F4' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#202124' }}>
            Intelligence Cards
          </h2>
          {cards.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: '#E8F0FE', color: '#4285F4' }}
            >
              {cards.length}
            </span>
          )}
        </div>

        {isProcessing && (
          <GeminiDots size="sm" label="Processing…" />
        )}
      </div>

      {/* ── Card grid / empty state ──────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {sortedCards.length === 0 ? (
          /* Empty state */
          <div
            className="flex flex-col items-center justify-center h-full min-h-[300px] rounded-xl border-2 border-dashed"
            style={{ borderColor: '#E8EAED' }}
          >
            {isActive ? (
              <>
                <GeminiDots size="md" className="mb-4" />
                <p className="text-sm font-medium mb-1" style={{ color: '#5F6368' }}>
                  Waiting for intelligence cards…
                </p>
                <p className="text-xs text-center max-w-[220px]" style={{ color: '#9AA0A6' }}>
                  Cards will surface as Gemini analyses the conversation
                </p>
              </>
            ) : (
              <>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: '#F8F9FA' }}
                >
                  <Zap size={22} style={{ color: '#E8EAED' }} />
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: '#9AA0A6' }}>
                  No cards yet
                </p>
                <p className="text-xs" style={{ color: '#9AA0A6' }}>
                  Start a meeting to see AI intelligence cards
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-4">
            {sortedCards.map((card) => (
              <CardItem
                key={card.cardId}
                card={card}
                onClick={setExpandedCard}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Pipeline processing overlay ──────────────── */}
      {isProcessing && sortedCards.length > 0 && (
        <div
          className="absolute bottom-4 right-4 px-3 py-2 rounded-xl flex items-center gap-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #E8EAED', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          <GeminiDots size="sm" />
          <span className="text-xs" style={{ color: '#5F6368' }}>
            {pipelineStatus.message || 'Analysing…'}
          </span>
        </div>
      )}

      {/* ── Card expanded modal ───────────────────────── */}
      <CardExpanded
        card={expandedCard}
        onClose={() => setExpandedCard(null)}
      />
    </div>
  );
}

export default LiveCardBoard;
