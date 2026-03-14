// ============================================================
// components/providers/WebSocketProvider.tsx — WS Context Provider
// ============================================================
//
// PURPOSE:
// React context that owns the WebSocket connection lifecycle and
// exposes all real-time data (cards, transcripts, documents, vision,
// pipeline status) plus control functions to the rest of the app.
// Falls back to mock data when the backend is unavailable.
//
// DATA FLOW:
// WebSocketClient → message handlers → React state → context value
// Component calls → context functions → WebSocketClient.send()
//
// PROTOCOL REFERENCE: PROTOCOL.md sections 2, 3
//
// DEPENDENCIES:
//   ../../lib/websocket      — WebSocketClient class
//   ../../lib/config         — API_URL, feature flags
//   ../../lib/types          — all TypeScript interfaces
//   ../../mock-data/*        — fallback mock data
// ============================================================

'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient } from '../../lib/websocket';
import { config } from '../../lib/config';
import type {
  WsStatus,
  Card,
  Document,
  TranscriptSegment,
  VisionPayload,
  MeetingStatePayload,
  PipelineStatusPayload,
  HealthResponse,
  DocumentType,
} from '../../lib/types';

// ── Context Shape ─────────────────────────────────────────────

interface WebSocketContextValue {
  // Connection
  status: WsStatus;

  // Feature flags (from /api/health)
  features: HealthResponse['features'] | null;

  // Real-time data
  cards: Card[];
  documents: Document[];
  transcriptSegments: TranscriptSegment[];
  visionData: VisionPayload | null;
  meetingState: MeetingStatePayload | null;
  pipelineStatus: PipelineStatusPayload | null;
  lastError: { code: string; message: string; recoverable: boolean } | null;

  // Control functions
  startMeeting: (title: string, participants: string[], context: string) => string;
  stopMeeting: (meetingId: string) => void;
  generateDocuments: (meetingId: string, types: DocumentType[]) => void;
  sendAudioChunk: (data: string, sampleRate: number, channels: number, chunkIndex: number) => void;
  sendTextInput: (text: string, meetingId: string) => void;
}

// ── Context ───────────────────────────────────────────────────

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocketContext(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocketContext must be used inside WebSocketProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────

interface WebSocketProviderProps {
  children: React.ReactNode;
  useMock?: boolean;
}

export function WebSocketProvider({ children, useMock = false }: WebSocketProviderProps) {
  const clientRef = useRef<WebSocketClient | null>(null);

  const [status, setStatus] = useState<WsStatus>('disconnected');
  const [features, setFeatures] = useState<HealthResponse['features'] | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [visionData, setVisionData] = useState<VisionPayload | null>(null);
  const [meetingState, setMeetingState] = useState<MeetingStatePayload | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatusPayload | null>(null);
  const [lastError, setLastError] = useState<WebSocketContextValue['lastError']>(null);

  // ── Fetch health + optional mock load ──────────────────────
  useEffect(() => {
    async function init() {
      // Fetch /api/health to populate feature flags
      try {
        const res = await fetch(`${config.API_URL}/api/health`);
        if (res.ok) {
          const data: HealthResponse = await res.json();
          setFeatures(data.features);
        }
      } catch {
        console.warn('[WebSocketProvider] Could not reach /api/health — using defaults');
        setFeatures({ vision: true, memory: true, strategyAgent: true });
      }

      // Load mock data if requested
      if (useMock) {
        try {
          const [mockCards, mockDocs, mockTranscript] = await Promise.all([
            import('../../mock-data/mock-cards.json'),
            import('../../mock-data/mock-documents.json'),
            import('../../mock-data/mock-transcript.json'),
          ]);
          setCards(mockCards.default as Card[]);
          setDocuments(mockDocs.default as Document[]);
          setTranscriptSegments(mockTranscript.default as TranscriptSegment[]);
        } catch (err) {
          console.warn('[WebSocketProvider] Failed to load mock data:', err);
        }
        return; // Skip WebSocket connection in mock mode
      }

      // ── Setup WebSocket ────────────────────────────────────
      const client = new WebSocketClient(config.WS_URL);
      clientRef.current = client;

      client.onStatusChanged(setStatus);

      // Register message handlers
      client.on('meeting-state', (payload) => setMeetingState(payload as MeetingStatePayload));
      client.on('transcript', (payload) => {
        const seg = payload as TranscriptSegment;
        setTranscriptSegments(prev => {
          const idx = prev.findIndex(s => s.segmentId === seg.segmentId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = seg;
            return updated;
          }
          return [...prev, seg];
        });
      });
      client.on('card', (payload) => {
        const card = payload as Card;
        setCards(prev => {
          const idx = prev.findIndex(c => c.cardId === card.cardId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = card;
            return updated;
          }
          return [...prev, card];
        });
      });
      client.on('vision', (payload) => setVisionData(payload as VisionPayload));
      client.on('document', (payload) => {
        const doc = payload as Document;
        setDocuments(prev => {
          const idx = prev.findIndex(d => d.documentId === doc.documentId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = doc;
            return updated;
          }
          return [...prev, doc];
        });
      });
      client.on('pipeline-status', (payload) => setPipelineStatus(payload as PipelineStatusPayload));
      client.on('error', (payload) => {
        const err = payload as { code: string; message: string; recoverable: boolean };
        setLastError(err);
        console.error('[WebSocketProvider] Server error:', err);
      });

      client.connect();
    }

    init();

    return () => {
      clientRef.current?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMock]);

  // ── Control Functions ─────────────────────────────────────

  const startMeeting = useCallback((title: string, participants: string[], ctx: string): string => {
    const meetingId = `meeting-${Date.now()}`;
    clientRef.current?.send('meeting-start', { meetingId, title, participants, context: ctx });
    return meetingId;
  }, []);

  const stopMeeting = useCallback((meetingId: string) => {
    clientRef.current?.send('meeting-stop', { meetingId, reason: 'user' });
  }, []);

  const generateDocuments = useCallback((meetingId: string, types: DocumentType[]) => {
    clientRef.current?.send('generate-documents', { meetingId, types });
  }, []);

  const sendAudioChunk = useCallback(
    (data: string, sampleRate: number, channels: number, chunkIndex: number) => {
      clientRef.current?.send('audio-chunk', { data, sampleRate, channels, chunkIndex });
    },
    []
  );

  const sendTextInput = useCallback((text: string, meetingId: string) => {
    clientRef.current?.send('text-input', { text, meetingId });
  }, []);

  // ── Context Value ─────────────────────────────────────────

  const value: WebSocketContextValue = {
    status,
    features,
    cards,
    documents,
    transcriptSegments,
    visionData,
    meetingState,
    pipelineStatus,
    lastError,
    startMeeting,
    stopMeeting,
    generateDocuments,
    sendAudioChunk,
    sendTextInput,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export default WebSocketProvider;
