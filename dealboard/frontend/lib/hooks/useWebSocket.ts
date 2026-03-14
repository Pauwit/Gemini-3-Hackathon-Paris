// ============================================================
// lib/hooks/useWebSocket.ts — WebSocket Connection Hook
// ============================================================
//
// PURPOSE:
// React hook that provides direct access to WebSocket client
// status and message registration. Thin wrapper over
// WebSocketContext for components that need low-level access.
//
// DATA FLOW:
// useWebSocketContext() → { status, sendAudioChunk, sendTextInput, ... }
//
// PROTOCOL REFERENCE: PROTOCOL.md sections 1, 2, 3
// DEPENDENCIES: WebSocketProvider context
// ============================================================

'use client';

import { useWebSocketContext } from '../../components/providers/WebSocketProvider';

/**
 * useWebSocket
 * Returns WebSocket status and send functions from context.
 *
 * @returns WebSocket connection state and control functions
 *
 * @example
 * const { status, sendTextInput } = useWebSocket();
 */
export function useWebSocket() {
  const ctx = useWebSocketContext();

  return {
    status: ctx.status,
    sendAudioChunk: ctx.sendAudioChunk,
    sendTextInput: ctx.sendTextInput,
    startMeeting: ctx.startMeeting,
    stopMeeting: ctx.stopMeeting,
    generateDocuments: ctx.generateDocuments,
    pipelineStatus: ctx.pipelineStatus,
    lastError: ctx.lastError,
  };
}
