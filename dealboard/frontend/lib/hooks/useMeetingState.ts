// ============================================================
// lib/hooks/useMeetingState.ts — Meeting Lifecycle Hook
// ============================================================
//
// PURPOSE:
// Manages meeting lifecycle state: start, stop, elapsed timer,
// participant management. Combines WebSocket meeting-state messages
// with local state (timer, derived booleans).
//
// DATA FLOW:
// useWebSocketContext → meetingState
//   + local timer (setInterval) → elapsedSeconds
//   → derived: isActive, isStarting, isEnded, canGenerate
//
// PROTOCOL REFERENCE: PROTOCOL.md section 3 (meeting-state message)
// DEPENDENCIES: useWebSocketContext
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocketContext } from '../../components/providers/WebSocketProvider';
import type { DocumentType } from '../types';

interface UseMeetingStateResult {
  // State
  meetingId: string | null;
  isActive: boolean;
  isStarting: boolean;
  isEnding: boolean;
  isEnded: boolean;
  isIdle: boolean;
  elapsedSeconds: number;

  // Actions
  start: (title: string, participants: string[], context: string) => void;
  stop: () => void;
  generateDocs: (types?: DocumentType[]) => void;
}

/**
 * useMeetingState
 * Provides meeting lifecycle management with derived state and timer.
 *
 * @returns Meeting state object with control functions
 *
 * @example
 * const { isActive, elapsedSeconds, start, stop } = useMeetingState();
 */
export function useMeetingState(): UseMeetingStateResult {
  const { meetingState, startMeeting, stopMeeting, generateDocuments } = useWebSocketContext();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);

  // Elapsed timer
  useEffect(() => {
    if (meetingState?.state !== 'active' || !meetingState.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(meetingState.startedAt).getTime();
    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [meetingState?.state, meetingState?.startedAt]);

  const start = useCallback((title: string, participants: string[], ctx: string) => {
    // TODO: Validate title is not empty
    const id = startMeeting(title, participants, ctx);
    setCurrentMeetingId(id);
  }, [startMeeting]);

  const stop = useCallback(() => {
    const id = currentMeetingId || meetingState?.meetingId;
    if (id) stopMeeting(id);
  }, [currentMeetingId, meetingState?.meetingId, stopMeeting]);

  const generateDocs = useCallback((types?: DocumentType[]) => {
    const id = currentMeetingId || meetingState?.meetingId;
    if (!id) return;
    const defaultTypes: DocumentType[] = ['summary', 'follow-up-email', 'strategy-brief', 'decision-log'];
    generateDocuments(id, types || defaultTypes);
  }, [currentMeetingId, meetingState?.meetingId, generateDocuments]);

  const state = meetingState?.state || 'idle';

  return {
    meetingId: meetingState?.meetingId || null,
    isActive: state === 'active',
    isStarting: state === 'starting',
    isEnding: state === 'stopping',
    isEnded: state === 'ended',
    isIdle: state === 'idle',
    elapsedSeconds,
    start,
    stop,
    generateDocs,
  };
}
