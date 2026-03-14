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

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useSearchParams }    from 'next/navigation';
import { TopBar }             from './components/TopBar';
import { LiveCardBoard }      from './components/LiveCardBoard';
import { TranscriptPanel }    from './components/TranscriptPanel';
import { TimelineView }       from './components/TimelineView';
import { useMeetingState }    from '../../lib/hooks/useMeetingState';
import { useAudioCapture }    from '../../lib/hooks/useAudioCapture';
import { useSpeechRecognition } from '../../lib/hooks/useSpeechRecognition';
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

  const { status, sendAudioChunk, sendTextInput, meetingState } = useWebSocketContext();
  const { start, isActive, isIdle, isEnded }     = useMeetingState();
  const [meetUrl, setMeetUrl] = useState<string | null>(null);

  // Meeting info from localStorage (set by dashboard modal)
  const meetingInfoRef = useRef<{ id: string; title: string; participants: string[]; meetUrl?: string } | null>(null);

  const normalizeMeetUrl = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      const parsed = new URL(withProtocol);
      if (parsed.hostname !== 'meet.google.com') {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }, []);

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

  const {
    isSupported: isSpeechSupported,
    isListening: isSpeechListening,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    speaker: 'Meeting Speaker',
    onFinalText: ({ text, speaker, source }) => {
      const liveMeetingId = meetingState?.meetingId;
      if (!liveMeetingId) {
        return;
      }
      sendTextInput(text, liveMeetingId, speaker, source);
    },
    onError: (error) => {
      console.warn('[MeetingPage] Speech recognition error:', error.message);
    },
  });

  // ── On mount: init meeting ────────────────────────────
  useEffect(() => {
    if (isMock) return; // Mock mode — no WS meeting needed

    try {
      const raw = localStorage.getItem('dealboard_current_meeting');
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalizedMeetUrl = normalizeMeetUrl(String(parsed?.meetUrl || ''));

        meetingInfoRef.current = {
          id: parsed?.id,
          title: parsed?.title,
          participants: Array.isArray(parsed?.participants) ? parsed.participants : [],
          meetUrl: normalizedMeetUrl || undefined,
        };
        setMeetUrl(normalizedMeetUrl);
      }
    } catch { /* ignore */ }

    // Start meeting if connected and idle
    if (status === 'connected' && isIdle && meetingInfoRef.current) {
      const { title, participants } = meetingInfoRef.current;
      start(title, participants, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isIdle, isMock, normalizeMeetUrl]);

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

  // ── Start/stop speech recognition with meeting state ───
  useEffect(() => {
    if (isMock || !isSpeechSupported) return;

    if (isActive && !isSpeechListening) {
      startListening();
    } else if (!isActive && isSpeechListening) {
      stopListening();
    }
  }, [
    isActive,
    isMock,
    isSpeechListening,
    isSpeechSupported,
    startListening,
    stopListening,
  ]);

  // ── Stop audio on unmount ─────────────────────────────
  useEffect(() => {
    return () => {
      if (isCapturing) stopCapture();
      if (isSpeechListening) stopListening();
    };
  }, [isCapturing, isSpeechListening, stopCapture, stopListening]);

  const meetingTitle = meetingInfoRef.current?.title ?? meetingState?.meetingId ?? 'Live Meeting';

  const handleConnectMeet = useCallback(() => {
    if (meetUrl) {
      window.open(meetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const rawInput = window.prompt('Paste your Google Meet link (e.g. https://meet.google.com/abc-defg-hij)');
    if (!rawInput) {
      return;
    }

    const normalized = normalizeMeetUrl(rawInput);
    if (!normalized) {
      window.alert('Please enter a valid Google Meet URL (meet.google.com).');
      return;
    }

    setMeetUrl(normalized);

    try {
      const raw = localStorage.getItem('dealboard_current_meeting');
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem('dealboard_current_meeting', JSON.stringify({
        ...parsed,
        meetUrl: normalized,
      }));
    } catch {
      // ignore persistence failure
    }

    window.open(normalized, '_blank', 'noopener,noreferrer');
  }, [meetUrl, normalizeMeetUrl]);

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100vh', backgroundColor: '#F8F9FA' }}
    >
      {/* ── Top Bar ──────────────────────────────────────── */}
      <TopBar
        meetingTitle={meetingTitle}
        meetUrl={meetUrl}
        onConnectMeet={handleConnectMeet}
      />

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
