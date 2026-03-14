// ============================================================
// lib/hooks/useWebSocket.ts — WebSocket Context Access Hook
// ============================================================
//
// PURPOSE:
// Thin wrapper around useWebSocketContext that provides a clean,
// destructured API for components that need WebSocket access.
// Separates connection concerns (status, errors) from data
// (cards, transcript) and control (start/stop meeting).
//
// USE CASES:
//   - TopBar: status, pipelineStatus, stopMeeting
//   - LiveCardBoard: cards, pipelineStatus
//   - TranscriptPanel: transcriptSegments
//   - Settings page: status for display
//
// DERIVED HOOKS (exported):
//   useWebSocket     — all WebSocket context values
//   useMeetingData   — cards, documents, transcriptSegments, vision
//   useConnectionStatus — status, lastError only
//
// PROTOCOL REFERENCE: PROTOCOL.md sections 1–3
// DEPENDENCIES: WebSocketProvider context
// ============================================================

'use client';

import { useWebSocketContext } from '../../components/providers/WebSocketProvider';
import type {
  WsStatus,
  Card,
  Document,
  TranscriptSegment,
  VisionPayload,
  MeetingStatePayload,
  PipelineStatusPayload,
  DocumentType,
} from '../types';

// ── Full WebSocket hook ───────────────────────────────────

/**
 * useWebSocket
 * Returns all WebSocket context values including status,
 * real-time data, and control functions.
 *
 * Prefer this hook for components that need multiple pieces
 * of WebSocket state. For single-concern components, use the
 * narrower hooks below.
 *
 * @returns Full WebSocket context value
 *
 * @example
 * const { status, cards, pipelineStatus } = useWebSocket();
 */
export function useWebSocket() {
  return useWebSocketContext();
}

// ── Connection Status hook ────────────────────────────────

interface ConnectionStatus {
  /** WebSocket connection state */
  status:    WsStatus;
  /** Whether the connection is healthy */
  isOnline:  boolean;
  /** Last server error (if any) */
  lastError: { code: string; message: string; recoverable: boolean } | null;
}

/**
 * useConnectionStatus
 * Minimal hook for components that only need connection state.
 * Avoids re-renders from card/transcript updates.
 *
 * @returns { status, isOnline, lastError }
 *
 * @example
 * const { isOnline, status } = useConnectionStatus();
 */
export function useConnectionStatus(): ConnectionStatus {
  const { status, lastError } = useWebSocketContext();
  return {
    status,
    isOnline: status === 'connected',
    lastError,
  };
}

// ── Meeting Data hook ─────────────────────────────────────

interface MeetingData {
  /** Intelligence cards received from server */
  cards:              Card[];
  /** Generated documents (summary, follow-up, etc.) */
  documents:          Document[];
  /** Transcript segments (final and interim) */
  transcriptSegments: TranscriptSegment[];
  /** Latest vision/emotion data */
  visionData:         VisionPayload | null;
  /** Current meeting lifecycle state */
  meetingState:       MeetingStatePayload | null;
  /** Current pipeline processing stage */
  pipelineStatus:     PipelineStatusPayload | null;
}

/**
 * useMeetingData
 * Provides all real-time meeting data from WebSocket.
 * Use this in meeting page components that render cards, transcripts, etc.
 *
 * @returns Meeting data payload
 *
 * @example
 * const { cards, transcriptSegments } = useMeetingData();
 */
export function useMeetingData(): MeetingData {
  const {
    cards,
    documents,
    transcriptSegments,
    visionData,
    meetingState,
    pipelineStatus,
  } = useWebSocketContext();

  return {
    cards,
    documents,
    transcriptSegments,
    visionData,
    meetingState,
    pipelineStatus,
  };
}

// ── Meeting Control hook ──────────────────────────────────

interface MeetingControls {
  /** Start a new meeting, returns meetingId */
  startMeeting:      (title: string, participants: string[], context: string) => string;
  /** Stop the current meeting */
  stopMeeting:       (meetingId: string) => void;
  /** Request document generation */
  generateDocuments: (meetingId: string, types: DocumentType[]) => void;
  /** Send an audio chunk */
  sendAudioChunk:    (data: string, sampleRate: number, channels: number, chunkIndex: number) => void;
  /** Send text input (for testing without microphone) */
  sendTextInput:     (text: string, meetingId: string) => void;
}

/**
 * useMeetingControls
 * Provides meeting control functions only.
 * Use when you need to trigger actions but not read data.
 *
 * @returns Meeting control functions
 *
 * @example
 * const { startMeeting, stopMeeting } = useMeetingControls();
 */
export function useMeetingControls(): MeetingControls {
  const {
    startMeeting,
    stopMeeting,
    generateDocuments,
    sendAudioChunk,
    sendTextInput,
  } = useWebSocketContext();

  return {
    startMeeting,
    stopMeeting,
    generateDocuments,
    sendAudioChunk,
    sendTextInput,
  };
}

export default useWebSocket;
