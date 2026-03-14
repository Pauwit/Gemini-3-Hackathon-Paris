# DEALBOARD — FRONTEND ↔ BACKEND PROTOCOL SPECIFICATION

> **PURPOSE**: This document is the **binding contract** between the Frontend team (Next.js dashboard) and the Backend team (Node.js server). Both teams MUST implement exactly what is described here. Any AI generating code for either side MUST read this section and follow it to the letter. No improvisation on message formats, field names, endpoints, or WebSocket event types.

> **RULE**: If a field is marked `required`, it MUST always be present. If marked `optional`, it MAY be omitted (but the receiving side MUST handle its absence). If a field has a fixed set of values (enum), no other values are allowed.

---

## 1. TRANSPORT LAYER

The frontend and backend communicate through **two channels**:

| Channel | Protocol | Purpose |
|---------|----------|---------|
| WebSocket | `ws://` or `wss://` | All real-time bidirectional data: audio, text, cards, documents, vision, meeting lifecycle |
| REST HTTP | `http://` or `https://` | Historical data retrieval, health check, configuration |

### 1.1 — Connection Details

| Setting | Default | Env Variable (Frontend) | Env Variable (Backend) |
|---------|---------|------------------------|----------------------|
| Backend HTTP port | `3001` | `NEXT_PUBLIC_API_URL=http://localhost:3001` | `PORT=3001` |
| WebSocket URL | `ws://localhost:3001/ws` | `NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws` | (same port, path `/ws`) |

**IMPORTANT**: There is **ONE single WebSocket endpoint** at `/ws`. All message types flow through this single connection. The backend does NOT expose multiple WebSocket paths (`/audio`, `/cards`, `/vision`). Message routing is handled by the `type` field inside each message.

---

## 2. WEBSOCKET PROTOCOL

### 2.1 — Message Envelope

Every WebSocket message (both directions) is a **JSON string** with this structure:

```json
{
  "type": "<MESSAGE_TYPE>",
  "payload": { ... },
  "timestamp": "<ISO 8601 string>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | **YES** | One of the defined message types below. Case-sensitive, lowercase with hyphens. |
| `payload` | `object` | **YES** | Message-specific data. Structure depends on `type`. |
| `timestamp` | `string` | **YES** | ISO 8601 UTC timestamp of when the message was created. Example: `"2026-03-14T10:30:00.000Z"` |

**CRITICAL**: Both sides MUST ignore unknown `type` values silently (no crash, no error). This allows future extensions without breaking existing code.

---

### 2.2 — Messages: Frontend → Backend (Client sends)

#### `audio-chunk`
Sends a raw PCM audio chunk from the user's microphone.

```json
{
  "type": "audio-chunk",
  "payload": {
    "data": "<base64-encoded PCM audio>",
    "sampleRate": 16000,
    "encoding": "pcm-s16le"
  },
  "timestamp": "2026-03-14T10:30:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.data` | `string` | **YES** | Base64-encoded PCM audio. 250ms chunks at 16kHz 16-bit mono. |
| `payload.sampleRate` | `number` | **YES** | Always `16000`. |
| `payload.encoding` | `string` | **YES** | Always `"pcm-s16le"`. |

---

#### `text-input`
Sends transcribed text from the browser's Web Speech API (fallback mode when Gemini Live API is unavailable).

```json
{
  "type": "text-input",
  "payload": {
    "text": "We've been evaluating Datadog for our infrastructure",
    "isFinal": true,
    "speaker": "prospect"
  },
  "timestamp": "2026-03-14T10:30:05.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.text` | `string` | **YES** | The transcribed text segment. |
| `payload.isFinal` | `boolean` | **YES** | `true` if this is a final recognition result. `false` if interim (still being refined by Speech API). Backend SHOULD only process `isFinal: true` messages through the Listener Agent. |
| `payload.speaker` | `string` | Optional | `"prospect"`, `"us"`, or `"unknown"`. If omitted, backend treats as `"unknown"`. |

---

#### `meeting-start`
Signals that the user has clicked "Start Meeting" on the dashboard.

```json
{
  "type": "meeting-start",
  "payload": {
    "meetingTitle": "AcmeCorp Q1 Review",
    "participants": ["Thomas Martin", "Sarah Chen"]
  },
  "timestamp": "2026-03-14T10:00:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.meetingTitle` | `string` | Optional | Human-readable meeting name. Default: `"Untitled Meeting"`. |
| `payload.participants` | `string[]` | Optional | List of expected participant names. Default: `[]`. |

**Backend behavior**: Initialize Gemini Live session (or fallback mode), reset card buffer, prepare Memory Agent context.

---

#### `meeting-stop`
Signals that the user has clicked "End Meeting".

```json
{
  "type": "meeting-stop",
  "payload": {},
  "timestamp": "2026-03-14T10:34:12.000Z"
}
```

**Backend behavior**: Close Gemini Live session, stop processing audio/text, update meeting state. Does NOT automatically generate documents (that requires a separate `generate-documents` message).

---

#### `generate-documents`
Requests post-meeting document generation from the Strategy Agent.

```json
{
  "type": "generate-documents",
  "payload": {
    "types": ["summary", "follow-up-email", "strategy-brief", "decision-log"]
  },
  "timestamp": "2026-03-14T10:35:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.types` | `string[]` | Optional | Which documents to generate. If omitted, generate ALL four types. Valid values: `"summary"`, `"follow-up-email"`, `"strategy-brief"`, `"decision-log"`. |

**Backend behavior**: Collect full transcript + all cards + vision highlights + memory context → send to Strategy Agent → broadcast each document back as `document` messages.

---

### 2.3 — Messages: Backend → Frontend (Server sends)

#### `meeting-state`
Broadcast whenever the meeting lifecycle state changes.

```json
{
  "type": "meeting-state",
  "payload": {
    "state": "active",
    "meetingId": "mtg_20260314_103000",
    "startedAt": "2026-03-14T10:00:00.000Z"
  },
  "timestamp": "2026-03-14T10:00:00.500Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.state` | `string` | **YES** | `"idle"` (no meeting), `"active"` (meeting in progress), `"ended"` (meeting finished, documents pending), `"error"` (unrecoverable failure). |
| `payload.meetingId` | `string` | **YES** | Unique meeting identifier. Format: `"mtg_YYYYMMDD_HHMMSS"`. |
| `payload.startedAt` | `string` | Optional | ISO 8601 timestamp of when the meeting started. Present when `state` is `"active"` or `"ended"`. |
| `payload.endedAt` | `string` | Optional | ISO 8601 timestamp of when the meeting ended. Present only when `state` is `"ended"`. |
| `payload.error` | `string` | Optional | Error description. Present only when `state` is `"error"`. |

---

#### `transcript`
A new transcript segment (real-time, as speech is recognized).

```json
{
  "type": "transcript",
  "payload": {
    "text": "We've been evaluating Datadog for our infrastructure",
    "speaker": "prospect",
    "isFinal": true,
    "segmentId": "seg_001"
  },
  "timestamp": "2026-03-14T10:30:05.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.text` | `string` | **YES** | The transcribed text. |
| `payload.speaker` | `string` | **YES** | `"prospect"`, `"us"`, or `"unknown"`. |
| `payload.isFinal` | `boolean` | **YES** | `true` for final transcription, `false` for interim (partial, may be updated). |
| `payload.segmentId` | `string` | **YES** | Unique segment ID. Interim and final versions of the same utterance share the same `segmentId`. The frontend MUST replace interim text with the final version when `isFinal: true` arrives for the same `segmentId`. |

---

#### `card`
A new intelligence card produced by the Analyser Agent.

```json
{
  "type": "card",
  "payload": {
    "cardId": "card_001",
    "label": "BATTLECARD",
    "priority": "warn",
    "summary": "Datadog: volume billing, pitch our flat-rate",
    "details": [
      {
        "agent": "gmail",
        "question": "Past communications about Datadog?",
        "answer": "No prior emails mentioning Datadog found."
      },
      {
        "agent": "drive",
        "question": "Internal docs about Datadog comparison?",
        "answer": "Found: 'AcmeCorp Meeting Notes Q4 2025' — competitor evaluation in progress, Datadog preferred by engineering."
      }
    ],
    "triggerSegmentId": "seg_001"
  },
  "timestamp": "2026-03-14T10:30:08.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.cardId` | `string` | **YES** | Unique card identifier. Format: `"card_NNN"`. |
| `payload.label` | `string` | **YES** | One of: `"ALERT"`, `"BATTLECARD"`, `"CONTEXT"`, `"STRATEGY"`, `"INFO"`. No other values allowed. |
| `payload.priority` | `string` | **YES** | One of: `"critical"`, `"warn"`, `"info"`, `"strategy"`, `"neutral"`. Maps to alert colors. |
| `payload.summary` | `string` | **YES** | Max 12 words. Actionable, direct, no hedging. Displayed as the card headline. |
| `payload.details` | `array` | **YES** | Array of agent Q/A results. At least 1 entry. |
| `payload.details[].agent` | `string` | **YES** | One of: `"gmail"`, `"drive"`, `"sheets"`, `"calendar"`, `"listener"`, `"memory"`. |
| `payload.details[].question` | `string` | **YES** | The question the agent was asked. |
| `payload.details[].answer` | `string` | **YES** | The agent's response. |
| `payload.triggerSegmentId` | `string` | Optional | The `segmentId` of the transcript segment that triggered this card. Allows the frontend to visually link cards to transcript moments. |

**Frontend behavior**: Display the card in the LiveCardBoard with the appropriate animation based on `label`:
- `ALERT` → border flashes red, card fades in with scale-up
- `BATTLECARD` → slides in from right
- `CONTEXT` → fades in softly
- `STRATEGY` → slides up from bottom
- `INFO` → simple fade in

Also add a pill to the TopBar using the `priority` color.

---

#### `vision`
Body language and scene analysis results from the Vision Agent.

```json
{
  "type": "vision",
  "payload": {
    "bodyLanguage": {
      "participants": [
        {
          "label": "Participant 1",
          "expression": "skeptical",
          "engagementScore": 62,
          "attentionScore": 55,
          "emotion": "Shows doubt, leaning back slightly",
          "confidence": 0.82,
          "changeFromPrevious": "shifted to skeptical"
        }
      ],
      "groupDynamics": "Overall engagement has dropped since pricing was mentioned",
      "alert": "Skepticism detected — engagement dropped 23%"
    },
    "sceneAnalysis": {
      "description": "Conference room with whiteboard showing Q1 roadmap",
      "objects": ["whiteboard", "laptop", "coffee mug"],
      "textDetected": "Q1 Goals: Migration, Compliance, Cost Reduction",
      "context": "Strategic planning session focused on Q1 priorities",
      "risks": [],
      "opportunities": ["Whiteboard shows Q1 priorities that align with our offering"]
    }
  },
  "timestamp": "2026-03-14T10:30:10.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.bodyLanguage` | `object` | **YES** | Body language analysis. |
| `payload.bodyLanguage.participants` | `array` | **YES** | Array of per-person readings. May be empty if no faces detected. |
| `payload.bodyLanguage.participants[].label` | `string` | **YES** | `"Participant 1"`, `"Participant 2"`, etc. Never a real name. |
| `payload.bodyLanguage.participants[].expression` | `string` | **YES** | One of: `"neutral"`, `"positive"`, `"negative"`, `"skeptical"`, `"confused"`, `"engaged"`, `"disengaged"`, `"surprised"`. |
| `payload.bodyLanguage.participants[].engagementScore` | `number` | **YES** | `0`–`100`. |
| `payload.bodyLanguage.participants[].attentionScore` | `number` | **YES** | `0`–`100`. |
| `payload.bodyLanguage.participants[].emotion` | `string` | **YES** | Free text description of emotional state. |
| `payload.bodyLanguage.participants[].confidence` | `number` | **YES** | `0.0`–`1.0`. How confident the reading is. |
| `payload.bodyLanguage.participants[].changeFromPrevious` | `string` | **YES** | One of: `"no change"`, `"more engaged"`, `"less engaged"`, `"shifted to skeptical"`, `"shifted to positive"`, `"shifted to confused"`, `"shifted to negative"`, `"new participant"`. |
| `payload.bodyLanguage.groupDynamics` | `string` | **YES** | Overall group sentiment description. |
| `payload.bodyLanguage.alert` | `string \| null` | **YES** | `null` if no significant shift. String describing the alert if a major shift was detected. When NOT null, the backend ALSO sends a separate `card` message of type `STRATEGY` based on this alert. |
| `payload.sceneAnalysis` | `object` | **YES** | Scene understanding results. |
| `payload.sceneAnalysis.description` | `string` | **YES** | Brief scene description. |
| `payload.sceneAnalysis.objects` | `string[]` | **YES** | Notable objects. May be empty. |
| `payload.sceneAnalysis.textDetected` | `string` | **YES** | Readable text from whiteboards/screens. Empty string if none. |
| `payload.sceneAnalysis.context` | `string` | **YES** | Scene interpretation in meeting context. |
| `payload.sceneAnalysis.risks` | `string[]` | **YES** | Risks observed. May be empty. |
| `payload.sceneAnalysis.opportunities` | `string[]` | **YES** | Opportunities observed. May be empty. |

---

#### `document`
A post-meeting document generated by the Strategy Agent. One message per document type.

```json
{
  "type": "document",
  "payload": {
    "docId": "doc_summary_mtg_20260314_103000",
    "docType": "summary",
    "title": "Meeting Summary — AcmeCorp Q1 Review",
    "content": "## Executive Overview\n\nThis 34-minute call with AcmeCorp covered...",
    "metadata": {
      "meetingId": "mtg_20260314_103000",
      "duration": "34:12",
      "participants": ["Thomas Martin", "Sarah Chen"],
      "topicsCount": 3,
      "decisionsCount": 4,
      "generatedAt": "2026-03-14T10:36:00.000Z"
    }
  },
  "timestamp": "2026-03-14T10:36:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.docId` | `string` | **YES** | Unique document ID. Format: `"doc_{docType}_{meetingId}"`. |
| `payload.docType` | `string` | **YES** | One of: `"summary"`, `"follow-up-email"`, `"strategy-brief"`, `"decision-log"`. No other values. |
| `payload.title` | `string` | **YES** | Human-readable document title. |
| `payload.content` | `string` | **YES** | The document body in **Markdown format**. Frontend renders this with a Markdown renderer. |
| `payload.metadata` | `object` | **YES** | Meeting metadata. |
| `payload.metadata.meetingId` | `string` | **YES** | References the meeting that produced this document. |
| `payload.metadata.duration` | `string` | **YES** | Meeting duration as `"MM:SS"` or `"HH:MM:SS"`. |
| `payload.metadata.participants` | `string[]` | **YES** | Participant names. |
| `payload.metadata.topicsCount` | `number` | **YES** | Number of topics discussed. |
| `payload.metadata.decisionsCount` | `number` | **YES** | Number of decisions made. |
| `payload.metadata.generatedAt` | `string` | **YES** | ISO 8601 timestamp of generation. |

---

#### `pipeline-status`
Informs the frontend about what the backend is currently doing. Used for loading states and "AI thinking" animations.

```json
{
  "type": "pipeline-status",
  "payload": {
    "stage": "workers",
    "message": "Searching Gmail and Drive...",
    "active": true
  },
  "timestamp": "2026-03-14T10:30:06.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.stage` | `string` | **YES** | One of: `"listener"`, `"workers"`, `"analyser"`, `"vision"`, `"strategy"`, `"memory"`, `"idle"`. |
| `payload.message` | `string` | **YES** | Human-readable status. Displayed in the UI as subtle text. |
| `payload.active` | `boolean` | **YES** | `true` if this stage is currently running. `false` when it completes. |

**Frontend behavior**: When `active: true`, show a Gemini-style pulsing indicator near the card board. When `stage: "idle"`, hide all loading states.

---

#### `error`
Backend encountered an error it wants the frontend to know about.

```json
{
  "type": "error",
  "payload": {
    "code": "GEMINI_LIVE_DISCONNECTED",
    "message": "Gemini Live API connection lost. Switching to fallback mode.",
    "recoverable": true
  },
  "timestamp": "2026-03-14T10:31:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.code` | `string` | **YES** | Machine-readable error code. Known codes: `"GEMINI_LIVE_DISCONNECTED"`, `"WORKER_TIMEOUT"`, `"VISION_AGENT_FAILED"`, `"STRATEGY_AGENT_FAILED"`, `"MEMORY_AGENT_FAILED"`, `"UNKNOWN_ERROR"`. |
| `payload.message` | `string` | **YES** | Human-readable error message. Displayed in the UI. |
| `payload.recoverable` | `boolean` | **YES** | `true` if the system can continue operating (degraded). `false` if the meeting must be restarted. |

**Frontend behavior**: Show a toast notification. If `recoverable: false`, disable audio capture and show a "Reconnect" button.

---

## 3. REST API ENDPOINTS

Base URL: `http://localhost:3001` (from `NEXT_PUBLIC_API_URL`).

All responses follow this envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

On error:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Meeting not found"
  }
}
```

---

### `GET /api/health`

Health check. Returns server status and feature flags.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "mode": "live",
    "useMock": false,
    "features": {
      "visionAgent": true,
      "strategyAgent": true,
      "memoryAgent": true,
      "calendarWorker": true
    },
    "uptime": 3600
  }
}
```

**Frontend use**: Called on app load to check backend availability and determine which UI panels to show (e.g., hide camera panel if `visionAgent: false`).

---

### `GET /api/meetings`

Returns a list of past meetings (from Memory Agent).

**Response:**
```json
{
  "success": true,
  "data": {
    "meetings": [
      {
        "meetingId": "mtg_20260314_103000",
        "title": "AcmeCorp Q1 Review",
        "date": "2026-03-14T10:00:00.000Z",
        "duration": "34:12",
        "participants": ["Thomas Martin", "Sarah Chen"],
        "cardsCount": 5,
        "documentsGenerated": true
      }
    ]
  }
}
```

---

### `GET /api/meetings/:meetingId/documents`

Returns all generated documents for a specific meeting.

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "docId": "doc_summary_mtg_20260314_103000",
        "docType": "summary",
        "title": "Meeting Summary — AcmeCorp Q1 Review",
        "content": "## Executive Overview\n\n...",
        "metadata": { ... }
      }
    ]
  }
}
```

**Frontend use**: The Review page uses this to load documents for past meetings (not just the live one).

---

### `GET /api/meetings/:meetingId/cards`

Returns all cards generated during a specific meeting.

**Response:**
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "cardId": "card_001",
        "label": "BATTLECARD",
        "priority": "warn",
        "summary": "Datadog: volume billing, pitch our flat-rate",
        "details": [ ... ],
        "triggerSegmentId": "seg_001",
        "timestamp": "2026-03-14T10:30:08.000Z"
      }
    ]
  }
}
```

---

### `GET /api/meetings/:meetingId/transcript`

Returns the full transcript for a specific meeting.

**Response:**
```json
{
  "success": true,
  "data": {
    "segments": [
      {
        "segmentId": "seg_001",
        "text": "We've been evaluating Datadog for our infrastructure",
        "speaker": "prospect",
        "timestamp": "2026-03-14T10:30:05.000Z"
      }
    ]
  }
}
```

---

### `GET /api/memory/graph`

Returns the full knowledge graph for the Memory page visualization.

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      { "id": "person_thomas_martin", "type": "person", "label": "Thomas Martin", "properties": { "title": "CTO", "company": "AcmeCorp", "meetingsCount": 5 } },
      { "id": "company_acmecorp", "type": "company", "label": "AcmeCorp", "properties": { "dealSize": "175K", "stage": "evaluation" } },
      { "id": "topic_security", "type": "topic", "label": "Security / ISO 27001", "properties": { "mentionCount": 8 } }
    ],
    "edges": [
      { "source": "person_thomas_martin", "target": "company_acmecorp", "relationship": "works_at" },
      { "source": "person_thomas_martin", "target": "topic_security", "relationship": "raised_concern" }
    ],
    "stats": {
      "totalInteractions": 142,
      "totalPeople": 23,
      "totalDecisions": 67,
      "totalPatterns": 12
    }
  }
}
```

---

### `GET /api/memory/people`

Returns people profiles for the Memory page.

**Response:**
```json
{
  "success": true,
  "data": {
    "people": [
      {
        "id": "person_thomas_martin",
        "name": "Thomas Martin",
        "title": "CTO",
        "company": "AcmeCorp",
        "lastInteraction": "2026-03-14T10:34:12.000Z",
        "meetingsCount": 5,
        "keyConcerns": ["Security compliance", "No hidden fees"],
        "communicationStyle": "Direct, data-driven, pushes back on pricing first",
        "interactions": [
          {
            "date": "2026-03-14T10:00:00.000Z",
            "meetingId": "mtg_20260314_103000",
            "summary": "Discussed pricing, security, and Datadog comparison"
          }
        ]
      }
    ]
  }
}
```

---

### `GET /api/memory/patterns`

Returns detected patterns for the Memory page.

**Response:**
```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "id": "pattern_001",
        "description": "Thomas always pushes back on pricing before discussing features",
        "frequency": 4,
        "confidence": 0.85,
        "lastObserved": "2026-03-14T10:30:05.000Z",
        "relatedPeople": ["person_thomas_martin"],
        "relatedTopics": ["topic_pricing"]
      }
    ]
  }
}
```

---

### `GET /api/memory/decisions`

Returns decision history for the Memory page.

**Response:**
```json
{
  "success": true,
  "data": {
    "decisions": [
      {
        "id": "decision_001",
        "text": "Proceed with flat-rate pricing proposal for AcmeCorp",
        "owner": "Us",
        "deadline": "2026-03-21",
        "context": "AcmeCorp hates hidden fees; previous vendor (Splunk) had overage charges",
        "status": "new",
        "meetingId": "mtg_20260314_103000",
        "date": "2026-03-14T10:32:00.000Z",
        "contradictsDecisionId": null
      }
    ]
  }
}
```

| `status` values | Description |
|-----------------|-------------|
| `"new"` | Just decided in this meeting |
| `"confirmed"` | Reaffirms a previous decision |
| `"contradicts"` | Contradicts a previous decision (see `contradictsDecisionId`) |

---

## 4. WEBSOCKET LIFECYCLE

This is the exact sequence of events for a complete meeting session. Both teams MUST implement this flow.

```
FRONTEND                          BACKEND
   |                                 |
   |--- WebSocket connect /ws ------>|
   |<-- meeting-state {idle} --------|    (backend confirms connection)
   |                                 |
   |--- GET /api/health ------------>|    (frontend checks features)
   |<-- {features, mode} ------------|
   |                                 |
   |--- meeting-start --------------->|
   |<-- meeting-state {active} ------|    (backend confirms meeting started)
   |                                 |
   |=== MEETING LOOP (repeats) ======|
   |                                 |
   |--- audio-chunk OR text-input -->|    (every 250ms for audio, or on speech end for text)
   |<-- transcript {interim} --------|    (fast, partial recognition)
   |<-- transcript {final} ----------|    (confirmed text)
   |                                 |
   |<-- pipeline-status {listener} --|    (Listener analyzing...)
   |<-- pipeline-status {workers} ---|    (Workers searching GWS...)
   |<-- pipeline-status {analyser} --|    (Analyser building card...)
   |<-- card -------------------------|    (new intelligence card)
   |<-- pipeline-status {idle} ------|    (pipeline complete)
   |                                 |
   |<-- vision ----------------------|    (every 5s if camera enabled)
   |<-- card {STRATEGY} -------------|    (only if vision.alert is not null)
   |                                 |
   |=== END MEETING LOOP ============|
   |                                 |
   |--- meeting-stop ---------------->|
   |<-- meeting-state {ended} -------|
   |                                 |
   |--- generate-documents ---------->|
   |<-- pipeline-status {strategy} --|
   |<-- document {summary} ----------|
   |<-- document {follow-up-email} --|
   |<-- document {strategy-brief} ---|
   |<-- document {decision-log} -----|
   |<-- pipeline-status {memory} ----|    (Memory Agent storing...)
   |<-- pipeline-status {idle} ------|
   |                                 |
   |--- GET /api/meetings -----------|    (Review page loads past data)
   |--- GET /api/memory/graph -------|    (Memory page loads graph)
   |                                 |
```

---

## 5. MOCK / DEMO MODE

When `USE_MOCK=true` on the backend:

- All GWS workers return data from `mock-data/mock-data.json` instead of calling `gws` CLI.
- Vision Agent returns data from `mock-data/mock-vision.json` instead of calling Gemini Pro.
- Memory Agent returns data from `mock-data/mock-memory.json`.
- The Listener Agent and Analyser Agent still call Gemini Flash (they need AI reasoning), BUT if Gemini is also unavailable, the server should return pre-built cards from mock data.

When `MODE=fallback` on the backend:

- The server does NOT open a Gemini Live API session.
- The server accepts `text-input` messages instead of `audio-chunk` messages.
- The frontend uses `window.SpeechRecognition` for speech-to-text and sends `text-input` messages.
- All other flows remain identical.

**CRITICAL for demo**: When both `USE_MOCK=true` AND `MODE=fallback` are set, the system runs 100% simulated. The frontend sends text, the backend processes it through Listener/Analyser with mock GWS data, and returns cards. This must be indistinguishable from the live version to an observer.

---

## 6. LABEL-TO-COLOR MAPPING

Both frontend and backend MUST use the same mapping. This table is the single source of truth.

| `label` | `priority` | Color Name | Hex | Background | Border |
|---------|-----------|------------|-----|------------|--------|
| `ALERT` | `critical` | Google Red | `#EA4335` | `#FDE7E7` | `#F5C6C6` |
| `BATTLECARD` | `warn` | Google Yellow | `#FBBC04` | `#FEF7E0` | `#FDE293` |
| `CONTEXT` | `info` | Google Green | `#34A853` | `#E6F4EA` | `#B7E1C1` |
| `STRATEGY` | `strategy` | Google Blue | `#4285F4` | `#E8F0FE` | `#AECBFA` |
| `INFO` | `neutral` | Grey | `#5F6368` | `#F1F3F4` | `#DADCE0` |

---

## 7. TYPESCRIPT TYPES (Frontend Reference)

The frontend MUST define these types in `lib/types.ts`. They correspond exactly to the WebSocket payload structures above.

```typescript
// ============================================================
// DEALBOARD PROTOCOL TYPES
// These types map 1:1 to the WebSocket and REST API payloads
// defined in PROTOCOL.md. Do NOT modify field names or types
// without updating PROTOCOL.md first.
// ============================================================

// --- Enums ---

export type MeetingState = 'idle' | 'active' | 'ended' | 'error';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';
export type CardLabel = 'ALERT' | 'BATTLECARD' | 'CONTEXT' | 'STRATEGY' | 'INFO';
export type CardPriority = 'critical' | 'warn' | 'info' | 'strategy' | 'neutral';
export type DocType = 'summary' | 'follow-up-email' | 'strategy-brief' | 'decision-log';
export type Speaker = 'prospect' | 'us' | 'unknown';
export type Expression = 'neutral' | 'positive' | 'negative' | 'skeptical' | 'confused' | 'engaged' | 'disengaged' | 'surprised';
export type EngagementChange = 'no change' | 'more engaged' | 'less engaged' | 'shifted to skeptical' | 'shifted to positive' | 'shifted to confused' | 'shifted to negative' | 'new participant';
export type PipelineStage = 'listener' | 'workers' | 'analyser' | 'vision' | 'strategy' | 'memory' | 'idle';
export type ErrorCode = 'GEMINI_LIVE_DISCONNECTED' | 'WORKER_TIMEOUT' | 'VISION_AGENT_FAILED' | 'STRATEGY_AGENT_FAILED' | 'MEMORY_AGENT_FAILED' | 'UNKNOWN_ERROR';
export type DecisionStatus = 'new' | 'confirmed' | 'contradicts';

// --- WebSocket Message Envelope ---

export interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// --- Card ---

export interface CardDetail {
  agent: 'gmail' | 'drive' | 'sheets' | 'calendar' | 'listener' | 'memory';
  question: string;
  answer: string;
}

export interface Card {
  cardId: string;
  label: CardLabel;
  priority: CardPriority;
  summary: string;
  details: CardDetail[];
  triggerSegmentId?: string;
  timestamp: string;
}

// --- Transcript ---

export interface TranscriptSegment {
  segmentId: string;
  text: string;
  speaker: Speaker;
  isFinal: boolean;
  timestamp: string;
}

// --- Vision ---

export interface ParticipantReading {
  label: string;
  expression: Expression;
  engagementScore: number;
  attentionScore: number;
  emotion: string;
  confidence: number;
  changeFromPrevious: EngagementChange;
}

export interface BodyLanguage {
  participants: ParticipantReading[];
  groupDynamics: string;
  alert: string | null;
}

export interface SceneAnalysis {
  description: string;
  objects: string[];
  textDetected: string;
  context: string;
  risks: string[];
  opportunities: string[];
}

export interface VisionData {
  bodyLanguage: BodyLanguage;
  sceneAnalysis: SceneAnalysis;
}

// --- Document ---

export interface DocumentMetadata {
  meetingId: string;
  duration: string;
  participants: string[];
  topicsCount: number;
  decisionsCount: number;
  generatedAt: string;
}

export interface MeetingDocument {
  docId: string;
  docType: DocType;
  title: string;
  content: string;
  metadata: DocumentMetadata;
}

// --- Memory / Knowledge Graph ---

export interface GraphNode {
  id: string;
  type: 'person' | 'company' | 'topic' | 'decision';
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalInteractions: number;
    totalPeople: number;
    totalDecisions: number;
    totalPatterns: number;
  };
}

export interface PersonProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  lastInteraction: string;
  meetingsCount: number;
  keyConcerns: string[];
  communicationStyle: string;
  interactions: {
    date: string;
    meetingId: string;
    summary: string;
  }[];
}

export interface Pattern {
  id: string;
  description: string;
  frequency: number;
  confidence: number;
  lastObserved: string;
  relatedPeople: string[];
  relatedTopics: string[];
}

export interface Decision {
  id: string;
  text: string;
  owner: string;
  deadline: string;
  context: string;
  status: DecisionStatus;
  meetingId: string;
  date: string;
  contradictsDecisionId: string | null;
}

// --- Pipeline Status ---

export interface PipelineStatus {
  stage: PipelineStage;
  message: string;
  active: boolean;
}

// --- Error ---

export interface WSError {
  code: ErrorCode;
  message: string;
  recoverable: boolean;
}

// --- Meeting (for REST /api/meetings) ---

export interface MeetingSummaryItem {
  meetingId: string;
  title: string;
  date: string;
  duration: string;
  participants: string[];
  cardsCount: number;
  documentsGenerated: boolean;
}
```

---

## 8. RECONNECTION BEHAVIOR

| Event | Frontend behavior | Backend behavior |
|-------|-------------------|------------------|
| WebSocket disconnects | Show "Reconnecting..." status. Retry every 3 seconds (from config `WEBSOCKET_RECONNECT_INTERVAL_MS`). Use exponential backoff: 3s, 6s, 12s, max 30s. | Log disconnection. Clean up client session. |
| WebSocket reconnects during active meeting | Send `meeting-start` again. Backend resumes from current state. Frontend re-subscribes to all data. | Detect re-connection, send current `meeting-state` and any buffered cards/transcript since disconnection. |
| WebSocket reconnects after meeting ended | Frontend loads historical data via REST endpoints. | Send `meeting-state {ended}`. |

---

## 9. VERSIONING

This protocol is **version 1**. If either team needs to add new message types or fields:

1. Add them to this document first.
2. New fields on existing messages MUST be optional (so the other side doesn't break).
3. New message types are automatically ignored by the other side (per the rule in section 2.1).
4. Breaking changes (renaming fields, removing fields, changing types) require both teams to update simultaneously.

---

## 10. CHECKLIST FOR EACH TEAM

### Frontend team MUST:
- [ ] Connect to a single WebSocket at `WS_URL/ws`
- [ ] Send all client messages as JSON with `{ type, payload, timestamp }`
- [ ] Handle all server message types listed in section 2.3
- [ ] Silently ignore unknown message types
- [ ] Call `GET /api/health` on app load to determine feature flags
- [ ] Use REST endpoints for historical data (Review page, Memory page)
- [ ] Implement reconnection with exponential backoff
- [ ] Use the TypeScript types from section 7 exactly as defined

### Backend team MUST:
- [ ] Expose a single WebSocket endpoint at `/ws`
- [ ] Send all server messages as JSON with `{ type, payload, timestamp }`
- [ ] Handle all client message types listed in section 2.2
- [ ] Silently ignore unknown message types
- [ ] Implement all REST endpoints from section 3
- [ ] Send `pipeline-status` messages to keep the frontend informed
- [ ] Send `meeting-state` on every state transition
- [ ] Send `error` messages for all recoverable and unrecoverable errors
- [ ] Support `USE_MOCK=true` and `MODE=fallback` as described in section 5
