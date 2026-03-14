# DealBoard AI Companion — Protocol Specification v1.0

> **This file is the contract between the frontend team and the backend team.**
> Neither side may deviate from this spec without mutual agreement and a version bump.
> When in doubt, check here first.

---

## Section 1: Transport Layer

### 1.1 Endpoints

| Protocol | URL | Purpose |
|----------|-----|---------|
| WebSocket | `ws://localhost:3001/ws` | All real-time bidirectional communication |
| REST HTTP | `http://localhost:3001/api/*` | Historical data, health, one-shot queries |

**Single WebSocket endpoint** — all real-time message types share `/ws`. There is no per-feature socket.

### 1.2 WebSocket Message Envelope

Every WebSocket message in **both directions** MUST use this envelope:

```json
{
  "type": "string",
  "payload": { },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | YES | Message type identifier (see sections 2 and 3) |
| `payload` | object | YES | Type-specific payload (see schemas below) |
| `timestamp` | ISO8601 string | YES | Sender-side timestamp |

### 1.3 Unknown Message Types

**Both sides MUST silently ignore unknown message types.** This allows either side to add new message types without breaking the other. Never throw an error on receipt of an unrecognized `type`.

### 1.4 REST Response Envelope

All REST responses use this shape:

```json
{ "success": true, ...data }
```
or on error:
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable" } }
```

---

## Section 2: Client → Server WebSocket Messages

### `audio-chunk`

Streaming audio data from the browser's microphone.

```json
{
  "type": "audio-chunk",
  "payload": {
    "data": "base64encodedPCM...",
    "sampleRate": 16000,
    "channels": 1,
    "chunkIndex": 42
  },
  "timestamp": "2024-01-15T10:30:00.250Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | string (base64) | Raw PCM audio data encoded as base64 |
| `sampleRate` | number | Sample rate in Hz — MUST be 16000 for Gemini Live |
| `channels` | number | Channel count — MUST be 1 (mono) |
| `chunkIndex` | number | Sequential chunk counter starting from 0 |

### `text-input`

Manual text input from the user (alternative to audio).

```json
{
  "type": "text-input",
  "payload": {
    "text": "What are our pricing advantages over Datadog?",
    "meetingId": "meeting-001"
  },
  "timestamp": "2024-01-15T10:30:15.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | User's typed input |
| `meetingId` | string | Active meeting identifier |

### `meeting-start`

Initiates a new meeting session.

```json
{
  "type": "meeting-start",
  "payload": {
    "meetingId": "meeting-001",
    "title": "AcmeCorp Q1 Sales Review with TechVentures",
    "participants": ["Sarah Chen", "Marcus Johnson", "Priya Patel"],
    "context": "Initial sales call for enterprise monitoring solution"
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `meetingId` | string | Client-generated unique ID for this meeting |
| `title` | string | Human-readable meeting title |
| `participants` | string[] | List of participant names |
| `context` | string | Brief description of meeting purpose |

### `meeting-stop`

Ends the active meeting session.

```json
{
  "type": "meeting-stop",
  "payload": {
    "meetingId": "meeting-001",
    "reason": "user"
  },
  "timestamp": "2024-01-15T11:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `meetingId` | string | Meeting to stop |
| `reason` | `"user"` or `"timeout"` | Why the meeting is stopping |

### `generate-documents`

Requests post-meeting document generation.

```json
{
  "type": "generate-documents",
  "payload": {
    "meetingId": "meeting-001",
    "types": ["summary", "follow-up-email", "strategy-brief", "decision-log"]
  },
  "timestamp": "2024-01-15T11:00:30.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `meetingId` | string | Meeting to generate documents for |
| `types` | DocumentType[] | Which document types to generate |

---

## Section 3: Server → Client WebSocket Messages

### `meeting-state`

Current state of the meeting session. Sent on connect and on every state change.

```json
{
  "type": "meeting-state",
  "payload": {
    "meetingId": "meeting-001",
    "state": "active",
    "startedAt": "2024-01-15T10:00:05.000Z",
    "stoppedAt": null
  },
  "timestamp": "2024-01-15T10:00:05.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `meetingId` | string or null | Current meeting ID |
| `state` | MeetingState | `"idle"` \| `"starting"` \| `"active"` \| `"stopping"` \| `"ended"` |
| `startedAt` | ISO8601 or null | When meeting became active |
| `stoppedAt` | ISO8601 or null | When meeting ended |

### `transcript`

A transcript segment from the live audio stream.

```json
{
  "type": "transcript",
  "payload": {
    "meetingId": "meeting-001",
    "segmentId": "seg-042",
    "speaker": "Marcus Johnson",
    "text": "We're currently spending about $50k monthly on Datadog...",
    "isFinal": true,
    "timestamp": "2024-01-15T10:30:15.000Z"
  },
  "timestamp": "2024-01-15T10:30:15.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `segmentId` | string | Unique ID — same ID may be sent multiple times as isFinal updates |
| `speaker` | string | Speaker name (from diarization) |
| `text` | string | Transcript text |
| `isFinal` | boolean | `false` = interim (will be updated), `true` = final |
| `timestamp` | ISO8601 | When segment was spoken |

### `card`

An intelligence card generated by the AI pipeline.

```json
{
  "type": "card",
  "payload": {
    "meetingId": "meeting-001",
    "cardId": "card-007",
    "label": "BATTLECARD",
    "title": "Datadog Cost Comparison",
    "summary": "TechVentures pays $50k/mo for Datadog. Our equivalent plan is $28k/mo — 44% savings.",
    "details": [
      {
        "question": "What is TechVentures current Datadog spend?",
        "answer": "$50,000/month, scaling with infrastructure growth",
        "source": "Live transcript"
      }
    ],
    "confidence": 0.92,
    "triggeredBy": "seg-042",
    "timestamp": "2024-01-15T10:30:18.000Z"
  },
  "timestamp": "2024-01-15T10:30:18.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `label` | CardLabel | `"ALERT"` \| `"BATTLECARD"` \| `"CONTEXT"` \| `"STRATEGY"` \| `"INFO"` |
| `title` | string | Short actionable title (max 60 chars) |
| `summary` | string | 1-2 sentence key insight |
| `details` | CardDetail[] | Q&A entries with source citations |
| `confidence` | number | 0.0–1.0 reliability score |
| `triggeredBy` | string | segmentId that triggered this card |

### `vision`

Facial/emotion analysis from video feed.

```json
{
  "type": "vision",
  "payload": {
    "meetingId": "meeting-001",
    "visionId": "vis-015",
    "emotion": "skeptical",
    "confidence": 0.78,
    "notes": "Marcus raised eyebrows when pricing was mentioned",
    "timestamp": "2024-01-15T10:30:20.000Z"
  },
  "timestamp": "2024-01-15T10:30:20.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `emotion` | EmotionType | `"neutral"` \| `"positive"` \| `"skeptical"` \| `"confused"` \| `"engaged"` |
| `confidence` | number | 0.0–1.0 |
| `notes` | string | Human-readable interpretation |

### `document`

A generated post-meeting document.

```json
{
  "type": "document",
  "payload": {
    "meetingId": "meeting-001",
    "documentId": "doc-001",
    "type": "follow-up-email",
    "title": "Follow-Up: AcmeCorp Monitoring Solution Proposal",
    "content": "# Follow-Up Email\n\nDear Marcus...",
    "generatedAt": "2024-01-15T11:01:00.000Z"
  },
  "timestamp": "2024-01-15T11:01:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | DocumentType | `"summary"` \| `"follow-up-email"` \| `"strategy-brief"` \| `"decision-log"` |
| `content` | string | Full document content in **Markdown** |

### `pipeline-status`

AI pipeline processing status update.

```json
{
  "type": "pipeline-status",
  "payload": {
    "meetingId": "meeting-001",
    "stage": "fetching",
    "workersActive": ["gmail-worker", "drive-worker"],
    "message": "Fetching pricing data and email history..."
  },
  "timestamp": "2024-01-15T10:30:16.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `stage` | PipelineStage | `"listening"` \| `"fetching"` \| `"analysing"` \| `"done"` \| `"error"` |
| `workersActive` | string[] | Which GWS workers are currently running |
| `message` | string | Human-readable status message for display |

### `error`

Server-side error notification.

```json
{
  "type": "error",
  "payload": {
    "code": "GWS_TIMEOUT",
    "message": "Google Workspace CLI timed out after 10s. Retrying with cached data.",
    "recoverable": true
  },
  "timestamp": "2024-01-15T10:30:17.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Machine-readable error code (UPPER_SNAKE_CASE) |
| `message` | string | Human-readable explanation |
| `recoverable` | boolean | `true` = UI should show warning; `false` = show blocking error |

---

## Section 4: REST API Endpoints

### Health

```
GET /api/health
```
Response:
```json
{
  "success": true,
  "version": "1.0",
  "mode": "live",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "features": {
    "vision": true,
    "memory": true,
    "strategyAgent": true
  }
}
```

### Meetings

```
GET /api/meetings
→ { "success": true, "meetings": Meeting[] }

GET /api/meetings/:meetingId/documents
→ { "success": true, "documents": Document[] }

GET /api/meetings/:meetingId/cards
→ { "success": true, "cards": Card[] }

GET /api/meetings/:meetingId/transcript
→ { "success": true, "segments": TranscriptSegment[] }
```

### Memory

```
GET /api/memory/graph
→ { "success": true, "nodes": Node[], "edges": Edge[], "stats": Stats }

GET /api/memory/people
→ { "success": true, "people": Person[] }

GET /api/memory/patterns
→ { "success": true, "patterns": Pattern[] }

GET /api/memory/decisions
→ { "success": true, "decisions": Decision[] }
```

---

## Section 5: WebSocket Lifecycle Sequence Diagram

```
Frontend                                    Server
   |                                           |
   |──── TCP connect to ws://localhost:3001/ws |
   |                                           |
   |<──── meeting-state { state: "idle" } ─────|  (on connect)
   |                                           |
   |──── meeting-start { meetingId, title } ───|
   |                                           |
   |<──── meeting-state { state: "starting" } ─|
   |<──── meeting-state { state: "active" } ───|
   |                                           |
   |──── audio-chunk { data, chunkIndex:0 } ───|
   |──── audio-chunk { data, chunkIndex:1 } ───|
   |──── audio-chunk { data, chunkIndex:N } ───|  (250ms intervals)
   |                                           |
   |<──── pipeline-status { stage:"listening" }|
   |<──── transcript { seg-001, isFinal:false }|  (interim)
   |<──── transcript { seg-001, isFinal:true } |  (final)
   |<──── pipeline-status { stage:"fetching" } |
   |<──── pipeline-status { stage:"analysing" }|
   |<──── card { label:"BATTLECARD", ... } ────|
   |<──── pipeline-status { stage:"done" } ────|
   |<──── vision { emotion:"skeptical" } ───── |
   |                                           |
   |──── meeting-stop { reason: "user" } ──────|
   |                                           |
   |<──── meeting-state { state:"stopping" } ──|
   |<──── meeting-state { state:"ended" } ─────|
   |                                           |
   |──── generate-documents { types:[...] } ───|
   |                                           |
   |<──── pipeline-status { stage:"analysing" }|
   |<──── document { type:"summary", ... } ────|
   |<──── document { type:"follow-up-email" } ─|
   |<──── document { type:"strategy-brief" } ──|
   |<──── document { type:"decision-log" } ────|
   |<──── pipeline-status { stage:"done" } ────|
   |                                           |
```

---

## Section 6: Label-to-Color Mapping

These values are the source of truth. Both `frontend/lib/config.ts` and `server/config.js` derive their values from this table.

| Label | Color (text) | Background | Border |
|-------|-------------|------------|--------|
| `ALERT` | `#EA4335` | `#FDE7E7` | `#F5C6C6` |
| `BATTLECARD` | `#FBBC04` | `#FEF7E0` | `#FDE293` |
| `CONTEXT` | `#34A853` | `#E6F4EA` | `#B7E1C1` |
| `STRATEGY` | `#4285F4` | `#E8F0FE` | `#AECBFA` |
| `INFO` | `#5F6368` | `#F1F3F4` | `#DADCE0` |

---

## Section 7: TypeScript Types

These types are the canonical definitions. They are copied verbatim into `frontend/lib/types.ts`.

```typescript
// Enums
type CardLabel = 'ALERT' | 'BATTLECARD' | 'CONTEXT' | 'STRATEGY' | 'INFO';
type MeetingState = 'idle' | 'starting' | 'active' | 'stopping' | 'ended';
type DocumentType = 'summary' | 'follow-up-email' | 'strategy-brief' | 'decision-log';
type EmotionType = 'neutral' | 'positive' | 'skeptical' | 'confused' | 'engaged';
type PipelineStage = 'listening' | 'fetching' | 'analysing' | 'done' | 'error';
type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Envelope
interface WsEnvelope<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
}

// Client → Server
interface AudioChunkPayload { data: string; sampleRate: number; channels: number; chunkIndex: number; }
interface TextInputPayload { text: string; meetingId: string; }
interface MeetingStartPayload { meetingId: string; title: string; participants: string[]; context: string; }
interface MeetingStopPayload { meetingId: string; reason: 'user' | 'timeout'; }
interface GenerateDocumentsPayload { meetingId: string; types: DocumentType[]; }

// Server → Client
interface MeetingStatePayload { meetingId: string | null; state: MeetingState; startedAt: string | null; stoppedAt: string | null; }
interface TranscriptPayload { meetingId: string; segmentId: string; speaker: string; text: string; isFinal: boolean; timestamp: string; }
interface CardDetailEntry { question: string; answer: string; source: string; }
interface CardPayload { meetingId: string; cardId: string; label: CardLabel; title: string; summary: string; details: CardDetailEntry[]; confidence: number; triggeredBy: string; timestamp: string; }
interface VisionPayload { meetingId: string; visionId: string; emotion: EmotionType; confidence: number; notes: string; timestamp: string; }
interface DocumentPayload { meetingId: string; documentId: string; type: DocumentType; title: string; content: string; generatedAt: string; }
interface PipelineStatusPayload { meetingId: string; stage: PipelineStage; workersActive: string[]; message: string; }
interface ErrorPayload { code: string; message: string; recoverable: boolean; }

// Entities
interface Meeting { id: string; title: string; date: string; duration: number; participants: string[]; cardCount: number; documentCount: number; }
interface Person { id: string; name: string; role: string; company: string; decisionMaker: boolean; preferences: string[]; concerns: string[]; lastSeen: string; relationship: string; }
interface Pattern { id: string; type: string; description: string; evidence: string[]; confidence: number; recommendation?: string; }
interface Decision { id: string; date: string; meetingId: string; description: string; madeBy: string; status: 'pending' | 'completed' | 'cancelled'; }
interface GraphNode { id: string; type: 'person' | 'company' | 'topic' | 'decision'; label: string; data: Record<string, unknown>; }
interface GraphEdge { id: string; source: string; target: string; type: string; data: Record<string, unknown>; }
interface GraphStats { totalNodes: number; totalEdges: number; totalMeetings: number; lastUpdated: string | null; }
```

---

## Section 8: Reconnection Behavior

### Frontend Reconnection Strategy

1. **Initial delay**: 3000ms (config `RECONNECT_INTERVAL_MS`)
2. **Max delay**: 30000ms (config `RECONNECT_MAX_INTERVAL_MS`)
3. **Backoff**: Exponential — delay doubles on each failed attempt
4. **Reset**: On successful connection, delay resets to initial value

### Reconnection During Active Meeting

If the WebSocket disconnects while a meeting is `active` or `starting`:
1. Frontend must display a disconnection warning
2. On reconnect, frontend should re-send `meeting-start` with the same `meetingId`
3. Server should resume the session if `meetingId` matches an active session

### Example Backoff Sequence

```
Attempt 1: wait 3s
Attempt 2: wait 6s
Attempt 3: wait 12s
Attempt 4: wait 24s
Attempt 5+: wait 30s (capped)
```

---

## Section 9: Versioning Rules

1. **Protocol version** is returned in `GET /api/health` as `"version": "1.0"`.
2. **Non-breaking changes** (adding optional fields, new message types) do NOT require a version bump.
3. **Breaking changes** (removing fields, changing types, renaming message types) REQUIRE:
   - Version bump in `/api/health`
   - Update to this file
   - Agreement from both frontend and backend teams
   - Update to `frontend/lib/types.ts`
4. **This file** (`PROTOCOL.md`) is the canonical source of truth. If types.ts and PROTOCOL.md disagree, PROTOCOL.md wins.

---

## Section 10: Team Checklists

### Frontend Checklist

- [ ] `WebSocketClient` connects to `config.WS_URL` on app mount
- [ ] All 5 client→server message types are implemented: `audio-chunk`, `text-input`, `meeting-start`, `meeting-stop`, `generate-documents`
- [ ] All 7 server→client message types are handled: `meeting-state`, `transcript`, `card`, `vision`, `document`, `pipeline-status`, `error`
- [ ] Unknown message types are **silently ignored** (no console.error, no crash)
- [ ] Reconnection with exponential backoff is implemented
- [ ] `/api/health` is fetched on mount to populate feature flags
- [ ] `CardLabel` colors match Section 6 exactly
- [ ] All TypeScript types imported from `lib/types.ts` — no inline type definitions elsewhere

### Backend Checklist

- [ ] WebSocket server listens on `/ws` path
- [ ] All 5 client→server message types are handled
- [ ] All 7 server→client message types can be sent via `broadcastToClient`
- [ ] Unknown message types are **silently ignored**
- [ ] Every WS response uses the `{ type, payload, timestamp }` envelope
- [ ] `GET /api/health` returns exact schema from Section 4
- [ ] All 8 REST endpoints are implemented (even if returning empty arrays)
- [ ] `config.js` is the single source of truth — no magic strings elsewhere
- [ ] `USE_MOCK=true` returns mock data from `mock-data/`
