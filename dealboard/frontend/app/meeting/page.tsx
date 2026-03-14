// ============================================================
// app/meeting/page.tsx — Live Meeting Page
// ============================================================
//
// PURPOSE:
// Main live meeting experience. Full-screen layout with:
//   - TopBar: title, timer, pipeline status, alert pills, controls
//   - Left main area: LiveCardBoard (intelligence cards grid)
//   - Right sidebar: TranscriptPanel (live transcript chat)
//   - Bottom bar: TimelineView (event timeline)
//
// MEETING INIT:
// On mount, reads meeting title/participants from localStorage
// (set by the dashboard New Meeting modal) and calls startMeeting()
// if the meeting state is still idle. Also supports ?mock=true for
// demo mode (loads mock data, skips WebSocket + audio).
//
// AUDIO CAPTURE:
// Starts microphone capture when meeting becomes active.
// Stops capture when meeting ends. Each chunk is sent via
// sendAudioChunk() to the WebSocket server.
//
// LAYOUT: flex column, 100vh, no scroll on outer container.
//   TopBar  (56px fixed)
//   Content (flex-1 flex-row overflow hidden)
//     Cards  (flex-1 p-4 overflow-y-auto)
//     Transcript (320px fixed, overflow-y-auto)
//   TimelineView (72px fixed)
//
// DATA FLOW:
//   localStorage → title/participants → startMeeting()
//   useWebSocketContext → cards, transcripts, pipelineStatus
//   useAudioCapture → sendAudioChunk → server
//
// PROTOCOL REFERENCE: PROTOCOL.md sections 2, 3
// DEPENDENCIES: TopBar, LiveCardBoard, TranscriptPanel, TimelineView,
//               useMeetingState, useAudioCapture, useWebSocketContext
// ============================================================

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useSearchParams }    from 'next/navigation';
import { TopBar }             from './components/TopBar';
import { LiveCardBoard }      from './components/LiveCardBoard';
import { TranscriptPanel }    from './components/TranscriptPanel';
import { TimelineView }       from './components/TimelineView';
import { useMeetingState }    from '../../lib/hooks/useMeetingState';
import { useAudioCapture }    from '../../lib/hooks/useAudioCapture';
import { useWebSocketContext } from '../../components/providers/WebSocketProvider';

/**
 * MeetingPage
 * Orchestrates the full live meeting experience.
 * Initialises meeting on mount, starts audio capture,
 * and lays out all sub-components.
 */
export default function MeetingPage() {
  const searchParams = useSearchParams();
  const isMock       = searchParams?.get('mock') === 'true';

  const { status, sendAudioChunk, meetingState } = useWebSocketContext();
  const { start, isActive, isIdle, isEnded }     = useMeetingState();

  // Meeting info from localStorage (set by dashboard modal)
  const meetingInfoRef = useRef<{ id: string; title: string; participants: string[] } | null>(null);

  // Audio capture hook
  const { startCapture, stopCapture, isCapturing } = useAudioCapture({
    onChunk: useCallback(
      (data: string, sampleRate: number, channels: number, chunkIndex: number) => {
        sendAudioChunk(data, sampleRate, channels, chunkIndex);
      },
      [sendAudioChunk]
    ),
    onError: (err) => {
      console.warn('[MeetingPage] Audio capture error:', err.message);
    },
  });

  // ── On mount: init meeting ────────────────────────────
  useEffect(() => {
    if (isMock) return; // Mock mode — no WS meeting needed

    try {
      const raw = localStorage.getItem('dealboard_current_meeting');
      if (raw) {
        meetingInfoRef.current = JSON.parse(raw);
      }
    } catch { /* ignore */ }

    // Start meeting if connected and idle
    if (status === 'connected' && isIdle && meetingInfoRef.current) {
      const { title, participants } = meetingInfoRef.current;
      start(title, participants, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isIdle, isMock]);

  // ── Start/stop audio capture with meeting state ───────
  useEffect(() => {
    if (isMock) return;

    if (isActive && !isCapturing) {
      startCapture();
    } else if (!isActive && isCapturing) {
      stopCapture();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isMock]);

  // ── Stop audio on unmount ─────────────────────────────
  useEffect(() => {
    return () => {
      if (isCapturing) stopCapture();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meetingTitle = meetingInfoRef.current?.title ?? meetingState?.meetingId ?? 'Live Meeting';

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100vh', backgroundColor: '#F8F9FA' }}
    >
      {/* ── Top Bar ──────────────────────────────────────── */}
      <TopBar meetingTitle={meetingTitle} />

      {/* ── Content Area ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Cards board — main area */}
        <div
          className="flex-1 overflow-y-auto p-4"
          style={{ minWidth: 0 }}
        >
          <LiveCardBoard />
        </div>

        {/* Transcript panel — fixed right column */}
        <div
          className="flex-shrink-0 overflow-y-auto p-4"
          style={{
            width:       320,
            borderLeft:  '1px solid #E8EAED',
            backgroundColor: '#FFFFFF',
          }}
        >
          <TranscriptPanel />
        </div>
      </div>

      {/* ── Timeline Bar ─────────────────────────────────── */}
      <TimelineView />
    </div>
  );
}
