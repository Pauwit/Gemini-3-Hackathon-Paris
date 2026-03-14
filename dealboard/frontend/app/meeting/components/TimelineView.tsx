// ============================================================
// app/meeting/components/TimelineView.tsx — Meeting Event Timeline
// ============================================================
//
// PURPOSE:
// Horizontal timeline bar at the bottom of the meeting view.
// Shows a chronological sequence of all events:
//   - Transcript segments (grey dots)
//   - Intelligence cards (colored dots per label)
//   - Pipeline stage changes (pulse icon)
//
// INTERACTION:
// - Hover over any dot to see a tooltip with the event summary
// - Dots are positioned proportionally along the elapsed time axis
// - Auto-scrolls to show most recent events
//
// DESIGN:
// 80px tall white bar with bottom border separator.
// A horizontal rule acts as the timeline spine.
// Dots sit on/above the spine colored by event type.
//
// DATA FLOW:
//   useWebSocketContext → cards + transcriptSegments → unified event list
//   useMeetingState     → elapsedSeconds (for proportional positioning)
//
// DEPENDENCIES: useWebSocketContext, useMeetingState, config.CARD_COLORS
// PROTOCOL REFERENCE: PROTOCOL.md (card + transcript message types)
// ============================================================

'use client';

import React, { useMemo, useRef } from 'react';
import { useWebSocketContext } from '../../../components/providers/WebSocketProvider';
import { config }              from '../../../lib/config';
import type { CardLabel }      from '../../../lib/types';

// ── Event types ───────────────────────────────────────────

type TimelineEventType = CardLabel | 'transcript' | 'pipeline';

interface TimelineEvent {
  id:        string;
  type:      TimelineEventType;
  label:     string;
  timestamp: string;
  color:     string;
  shape:     'circle' | 'diamond';
}

// ── Color map ──────────────────────────────────────────────

function eventColor(type: TimelineEventType): string {
  if (type === 'transcript') return '#E8EAED';
  if (type === 'pipeline')   return '#A142F4';
  return config.CARD_COLORS[type as CardLabel]?.color ?? '#9AA0A6';
}

// ── Component ─────────────────────────────────────────────

/**
 * TimelineView
 * Horizontal timeline of all meeting events at the bottom of the meeting page.
 * Transcript dots are small/grey; card dots are larger and label-colored.
 */
export function TimelineView() {
  const { cards, transcriptSegments, meetingState } = useWebSocketContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build unified event list
  const events = useMemo<TimelineEvent[]>(() => {
    const list: TimelineEvent[] = [];

    for (const seg of transcriptSegments) {
      if (!seg.isFinal) continue;
      list.push({
        id:        seg.segmentId,
        type:      'transcript',
        label:     `${seg.speaker}: "${seg.text.slice(0, 50)}${seg.text.length > 50 ? '…' : ''}"`,
        timestamp: seg.timestamp,
        color:     eventColor('transcript'),
        shape:     'circle',
      });
    }

    for (const card of cards) {
      list.push({
        id:        card.cardId,
        type:      card.label,
        label:     `${card.label}: ${card.title}`,
        timestamp: card.timestamp,
        color:     eventColor(card.label),
        shape:     'diamond',
      });
    }

    return list.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [cards, transcriptSegments]);

  // Time range for proportional positioning
  const startMs = useMemo(() => {
    if (meetingState?.startedAt) return new Date(meetingState.startedAt).getTime();
    if (events.length > 0)       return new Date(events[0].timestamp).getTime();
    return Date.now();
  }, [meetingState?.startedAt, events]);

  const endMs = useMemo(() => {
    const last = events[events.length - 1];
    if (last) return Math.max(new Date(last.timestamp).getTime(), startMs + 60000);
    return startMs + 300000; // 5 min default
  }, [events, startMs]);

  const span = endMs - startMs || 1;

  if (events.length === 0) {
    return (
      <div
        className="flex items-center px-5 flex-shrink-0"
        style={{ height: 64, backgroundColor: '#FFFFFF', borderTop: '1px solid #E8EAED' }}
      >
        <div className="w-full flex items-center gap-3">
          <span className="text-xs flex-shrink-0" style={{ color: '#9AA0A6' }}>
            Timeline
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#E8EAED' }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center px-5 flex-shrink-0"
      style={{ height: 72, backgroundColor: '#FFFFFF', borderTop: '1px solid #E8EAED' }}
    >
      <div className="w-full">
        {/* Label row */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium" style={{ color: '#9AA0A6' }}>
            Meeting Timeline
          </span>
          <span className="text-[10px]" style={{ color: '#9AA0A6' }}>
            {events.length} events
          </span>
        </div>

        {/* Timeline track */}
        <div className="relative" style={{ height: 28 }}>
          {/* Spine */}
          <div
            className="absolute left-0 right-0"
            style={{ top: 14, height: 2, backgroundColor: '#E8EAED', borderRadius: 1 }}
          />

          {/* Progress fill */}
          <div
            className="absolute left-0"
            style={{
              top: 14, height: 2, borderRadius: 1,
              background: 'linear-gradient(90deg, #4285F4, #A142F4)',
              width: '100%',
            }}
          />

          {/* Event dots */}
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-hidden"
          >
            {events.map((evt) => {
              const ms  = new Date(evt.timestamp).getTime();
              const pct = Math.min(100, Math.max(0, ((ms - startMs) / span) * 100));
              const isCard = evt.type !== 'transcript';

              return (
                <div
                  key={evt.id}
                  className="absolute group"
                  style={{ left: `${pct}%`, top: 0, transform: 'translateX(-50%)' }}
                >
                  {/* Dot */}
                  {isCard ? (
                    /* Diamond for cards */
                    <div
                      className="w-3.5 h-3.5 mt-1.5 transition-transform group-hover:scale-150"
                      style={{
                        backgroundColor: evt.color,
                        transform:       'rotate(45deg)',
                        borderRadius:    2,
                        border:          '1.5px solid white',
                        boxShadow:       `0 0 0 1px ${evt.color}`,
                      }}
                      role="img"
                      aria-label={evt.label}
                    />
                  ) : (
                    /* Circle for transcript */
                    <div
                      className="w-2 h-2 rounded-full mt-3 transition-transform group-hover:scale-150"
                      style={{
                        backgroundColor: '#DADCE0',
                        border:          '1.5px solid white',
                      }}
                      role="img"
                      aria-label={evt.label}
                    />
                  )}

                  {/* Tooltip */}
                  <div
                    className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2
                      opacity-0 group-hover:opacity-100 transition-opacity
                      pointer-events-none z-10 whitespace-nowrap"
                  >
                    <div
                      className="px-2 py-1 rounded-lg text-[10px] font-medium max-w-[200px] truncate"
                      style={{
                        backgroundColor: '#202124',
                        color:           '#fff',
                        boxShadow:       '0 2px 8px rgba(0,0,0,0.2)',
                      }}
                      title={evt.label}
                    >
                      {evt.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimelineView;
