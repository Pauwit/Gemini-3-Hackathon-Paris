// ============================================================
// lib/types.ts — Shared TypeScript Types
// ============================================================
//
// PURPOSE:
// Single source of truth for ALL TypeScript interfaces used in the
// frontend. Mirrors PROTOCOL.md section 7. All message types, REST
// responses, and entity shapes are defined here.
//
// DATA FLOW:
// Imported by all frontend components, hooks, and providers.
// MUST stay in sync with PROTOCOL.md and server schemas.
//
// PROTOCOL REFERENCE: PROTOCOL.md section 7
//
// DEPENDENCIES: None (pure types)
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type CardLabel = 'ALERT' | 'BATTLECARD' | 'CONTEXT' | 'STRATEGY' | 'INFO';

export type MeetingState = 'idle' | 'starting' | 'active' | 'stopping' | 'ended';

export type DocumentType = 'summary' | 'follow-up-email' | 'strategy-brief' | 'decision-log';

export type EmotionType = 'neutral' | 'positive' | 'skeptical' | 'confused' | 'engaged';

export type PipelineStage = 'listening' | 'fetching' | 'analysing' | 'done' | 'error';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// ── WebSocket Envelope ────────────────────────────────────────

export interface WsEnvelope<T = unknown> {
  type: string;
  payload: T;
  timestamp: string; // ISO8601
}

// ── Client → Server Payloads ──────────────────────────────────

export interface AudioChunkPayload {
  data: string;       // base64 PCM
  sampleRate: number;
  channels: number;
  chunkIndex: number;
}

export interface TextInputPayload {
  text: string;
  meetingId: string;
  speaker?: string;
  source?: 'manual' | 'speech' | 'system';
}

export interface MeetingStartPayload {
  meetingId: string;
  title: string;
  participants: string[];
  context: string;
}

export interface MeetingStopPayload {
  meetingId: string;
  reason: 'user' | 'timeout';
}

export interface GenerateDocumentsPayload {
  meetingId: string;
  types: DocumentType[];
}

// ── Server → Client Payloads ──────────────────────────────────

export interface MeetingStatePayload {
  meetingId: string | null;
  state: MeetingState;
  startedAt: string | null;
  stoppedAt: string | null;
}

export interface TranscriptPayload {
  meetingId: string;
  segmentId: string;
  speaker: string;
  text: string;
  isFinal: boolean;
  timestamp: string;
}

export interface CardDetailEntry {
  question: string;
  answer: string;
  source: string;
}

export interface CardPayload {
  meetingId: string;
  cardId: string;
  label: CardLabel;
  title: string;
  summary: string;
  details: CardDetailEntry[];
  confidence: number; // 0–1
  triggeredBy: string;
  timestamp: string;
}

export interface VisionPayload {
  meetingId: string;
  visionId: string;
  emotion: EmotionType;
  confidence: number; // 0–1
  notes: string;
  timestamp: string;
}

export interface DocumentPayload {
  meetingId: string;
  documentId: string;
  type: DocumentType;
  title: string;
  content: string; // markdown
  generatedAt: string;
}

export interface PipelineStatusPayload {
  meetingId: string;
  stage: PipelineStage;
  workersActive: string[];
  message: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  recoverable: boolean;
}

// ── Entity Interfaces ─────────────────────────────────────────

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number; // minutes
  participants: string[];
  cardCount: number;
  documentCount: number;
}

export interface Card extends CardPayload {}

export interface Document extends DocumentPayload {}

export interface TranscriptSegment extends TranscriptPayload {}

// ── REST Response Interfaces ──────────────────────────────────

export interface HealthResponse {
  success: boolean;
  version: string;
  mode: string;
  timestamp: string;
  features: {
    vision: boolean;
    memory: boolean;
    strategyAgent: boolean;
  };
}

export interface MeetingsResponse {
  success: boolean;
  meetings: Meeting[];
}

export interface DocumentsResponse {
  success: boolean;
  documents: Document[];
}

export interface CardsResponse {
  success: boolean;
  cards: Card[];
}

export interface TranscriptResponse {
  success: boolean;
  segments: TranscriptSegment[];
}

// ── Memory / Knowledge Graph Interfaces ───────────────────────

export interface GraphNode {
  id: string;
  type: 'person' | 'company' | 'topic' | 'decision';
  label: string;
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  data: Record<string, unknown>;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  totalMeetings: number;
  lastUpdated: string | null;
}

export interface GraphResponse {
  success: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  company: string;
  decisionMaker: boolean;
  preferences: string[];
  concerns: string[];
  lastSeen: string;
  relationship: string;
}

export interface PeopleResponse {
  success: boolean;
  people: Person[];
}

export interface Pattern {
  id: string;
  type: string;
  description: string;
  evidence: string[];
  confidence: number;
  recommendation?: string;
}

export interface PatternsResponse {
  success: boolean;
  patterns: Pattern[];
}

export interface Decision {
  id: string;
  date: string;
  meetingId: string;
  description: string;
  madeBy: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface DecisionsResponse {
  success: boolean;
  decisions: Decision[];
}
