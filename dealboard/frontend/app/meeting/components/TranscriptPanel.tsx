// ============================================================
// app/meeting/components/TranscriptPanel.tsx — Live Transcript Panel
// ============================================================
//
// PURPOSE:
// Scrollable panel displaying live transcript segments as they arrive
// via WebSocket during a meeting. Implements:
//   - Chat-bubble layout: "us" (right, blue) vs "prospect" (left, grey)
//   - Auto-scroll to bottom on new final segments
//   - Interim segments shown in italic with reduced opacity and a
//     pulsing cursor to indicate they are still being transcribed
//   - Speaker color assignment: up to 8 consistent colors across speakers
//   - Message timestamps on hover
//   - Empty state with listening animation
//
// SPEAKER DETECTION:
// The first speaker is treated as "us" (the sales rep). All other
// speakers are "prospect". This heuristic can be overridden by
// checking if speaker name matches the logged-in user.
//
// DATA FLOW:
//   useWebSocketContext → transcriptSegments → sorted by timestamp
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (transcript message)
// DEPENDENCIES: useWebSocketContext, useRef, useEffect
// ============================================================

'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Mic } from 'lucide-react';
import { useWebSocketContext } from '../../../components/providers/WebSocketProvider';

// ── Speaker colors ────────────────────────────────────────

/** Consistent color palette for up to 8 speakers */
const SPEAKER_COLORS = [
  '#4285F4', // Google Blue   (first speaker / "us")
  '#EA4335', // Google Red
  '#34A853', // Google Green
  '#FBBC04', // Google Yellow
  '#A142F4', // Gemini Purple
  '#00ACC1', // Cyan
  '#FF6D00', // Orange
  '#6D4C41', // Brown
];

// ── Helpers ───────────────────────────────────────────────

/** Abbreviation for speaker initials avatar */
function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Short time string */
function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ── Component ─────────────────────────────────────────────

/**
 * TranscriptPanel
 * Live scrolling transcript of the meeting conversation.
 * Bubbles are aligned by speaker: first speaker right (blue),
 * all others left (grey-tinted in their assigned color).
 * Auto-scrolls to newest final segment.
 */
export function TranscriptPanel() {
  const { transcriptSegments, meetingState } = useWebSocketContext();
  const bottomRef     = useRef<HTMLDivElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const isNearBottom  = useRef(true);

  // Track first speaker to determine "us" vs "prospect"
  const firstSpeaker = useMemo(() => {
    const first = transcriptSegments.find((s) => s.isFinal);
    return first?.speaker ?? null;
  }, [transcriptSegments]);

  // Assign consistent colors to speakers
  const speakerColors = useMemo(() => {
    const map: Record<string, string> = {};
    let idx = 0;
    for (const seg of transcriptSegments) {
      if (!(seg.speaker in map)) {
        map[seg.speaker] = SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
        idx++;
      }
    }
    return map;
  }, [transcriptSegments]);

  // Auto-scroll to bottom when new final segments arrive
  useEffect(() => {
    if (!isNearBottom.current) return;
    const hasFinal = transcriptSegments.some((s) => s.isFinal);
    if (hasFinal) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptSegments]);

  // Track whether user has scrolled away from bottom
  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottom.current = distFromBottom < 80;
  }

  const isActive = meetingState?.state === 'active' || meetingState?.state === 'starting';

  // Sort by timestamp
  const sorted = useMemo(() =>
    [...transcriptSegments].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
    [transcriptSegments]
  );

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ──────────────────────────────────── */}
      <div
        className="flex items-center gap-2 pb-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #E8EAED' }}
      >
        <Mic size={14} style={{ color: isActive ? '#EA4335' : '#9AA0A6' }} />
        <h2 className="text-sm font-semibold" style={{ color: '#202124' }}>
          Transcript
        </h2>
        {transcriptSegments.length > 0 && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold ml-auto"
            style={{ backgroundColor: '#F8F9FA', color: '#9AA0A6' }}
          >
            {transcriptSegments.filter((s) => s.isFinal).length} lines
          </span>
        )}
      </div>

      {/* ── Transcript scrollable area ───────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto py-3 space-y-2"
        onScroll={handleScroll}
      >
        {sorted.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
            {isActive ? (
              <>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: '#4285F4',
                        animation: `geminiDot 1.4s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: '#9AA0A6' }}>
                  Listening for speech…
                </p>
              </>
            ) : (
              <p className="text-xs text-center" style={{ color: '#9AA0A6' }}>
                Transcript will appear<br />when the meeting starts
              </p>
            )}
          </div>
        ) : (
          sorted.map((seg) => {
            const isUs     = seg.speaker === firstSpeaker;
            const color    = speakerColors[seg.speaker] ?? '#5F6368';
            const isInterim = !seg.isFinal;

            return (
              <div
                key={seg.segmentId}
                className={`flex gap-2 ${isUs ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Speaker avatar */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[9px] font-bold mt-0.5"
                  style={{ backgroundColor: isUs ? '#4285F4' : color }}
                  title={seg.speaker}
                >
                  {initials(seg.speaker)}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col max-w-[85%] ${isUs ? 'items-end' : 'items-start'}`}>
                  {/* Speaker name */}
                  <span
                    className="text-[10px] font-semibold mb-0.5 px-1"
                    style={{ color: isUs ? '#4285F4' : color }}
                  >
                    {seg.speaker}
                  </span>

                  {/* Message bubble */}
                  <div
                    className={`rounded-2xl px-3 py-2 text-xs leading-relaxed
                      ${isUs ? 'rounded-tr-sm' : 'rounded-tl-sm'}
                      ${isInterim ? 'opacity-60' : 'opacity-100'}`}
                    style={{
                      backgroundColor: isUs ? '#E8F0FE' : '#F8F9FA',
                      color:           '#202124',
                      border:          `1px solid ${isUs ? '#AECBFA' : '#E8EAED'}`,
                      fontStyle:       isInterim ? 'italic' : 'normal',
                    }}
                    title={shortTime(seg.timestamp)}
                  >
                    {seg.text}
                    {isInterim && (
                      <span
                        className="inline-block w-1 h-3 ml-1 rounded-sm align-middle"
                        style={{
                          backgroundColor: '#9AA0A6',
                          animation: 'statusPulse 1s ease-in-out infinite',
                        }}
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default TranscriptPanel;
