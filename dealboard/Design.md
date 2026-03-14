# DealBoard AI Companion — Design Document

> Last updated: 2024-01-15 | Version 1.0

---

## Section 1: Project Overview

**DealBoard AI Companion** is a real-time AI-powered sales intelligence tool built on Google Gemini. During live sales meetings, it listens to the conversation, automatically fetches relevant context from Google Workspace (Gmail, Drive, Calendar, Sheets), and surfaces actionable intelligence cards on a live board — battlecards against competitors, contextual alerts, strategy recommendations, and historical account data.

After the meeting, it generates polished documents: meeting summary, follow-up email, strategy brief, and decision log — all from the full transcript and accumulated context.

A persistent Memory layer tracks people, companies, decisions, and patterns across all meetings, enabling increasingly intelligent assistance over time.

**Hackathon:** Gemini 3 Hackathon Paris
**Tech Stack:** Node.js + Express + WebSocket (backend), Next.js 14 + TypeScript (frontend), Gemini 2.5 Flash/Pro (AI), Google Workspace CLI (GWS tools)

---

## Section 2: Team Structure

| Team | Directory | Responsibility |
|------|-----------|----------------|
| **Backend** | `server/` | Express server, WebSocket, AI agents, GWS workers, memory |
| **Frontend** | `frontend/` | Next.js app, live UI, WebSocket client, visualization |
| **Contract** | `PROTOCOL.md` | Message schemas, REST endpoints, shared types |
| **Skills** | `skills/` | GWS CLI documentation for AI agents |

**The contract between teams is `PROTOCOL.md`.** Neither team may change message schemas without updating the protocol and informing the other team.

---

## Section 3: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  BROWSER (Next.js Frontend)                                         │
│                                                                      │
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐ │
│  │  Audio       │  │  WebSocketProvider (React Context)           │ │
│  │  Capture     │  │  ┌──────────┐ ┌────────────┐ ┌───────────┐  │ │
│  │  (Web Audio) │  │  │  cards[] │ │ transcript │ │documents[]│  │ │
│  └──────┬───────┘  │  └──────────┘ └────────────┘ └───────────┘  │ │
│         │          └────────────────────┬─────────────────────────┘ │
│         │                               │                            │
│  ┌──────▼───────────────────────────────▼──────────────────────────┐│
│  │       WebSocketClient (lib/websocket.ts)  — ws:3001/ws          ││
│  └──────────────────────────────┬───────────────────────────────── ┘│
└─────────────────────────────────┼───────────────────────────────────┘
                                  │  WebSocket (ws://localhost:3001/ws)
┌─────────────────────────────────┼───────────────────────────────────┐
│  SERVER (Node.js + Express)     │                                    │
│                                 ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  server.js  — WebSocket Message Router                       │   │
│  └──────┬─────────────────────────────────────────┬─────────────┘   │
│         │                                         │                  │
│  ┌──────▼──────────┐                    ┌─────────▼──────────────┐  │
│  │  Listener Agent │                    │  Strategy Agent        │  │
│  │  (Flash model)  │                    │  (Pro model)           │  │
│  │  → needs_ctx?   │                    │  → documents[]         │  │
│  └──────┬──────────┘                    └────────────────────────┘  │
│         │                                                            │
│  ┌──────▼──────────────────────────────────────┐                    │
│  │  Worker Orchestrator (parallel)             │                    │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────────┐  │                    │
│  │  │  Gmail  │ │  Drive   │ │  Calendar   │  │                    │
│  │  │ Worker  │ │  Worker  │ │  Worker     │  │                    │
│  │  └─────────┘ └──────────┘ └─────────────┘  │                    │
│  │         ↓ GWS CLI (gws gmail search ...)    │                    │
│  └──────┬──────────────────────────────────────┘                    │
│         │                                                            │
│  ┌──────▼──────────┐    ┌────────────────────────────────────────┐  │
│  │  Analyser Agent │    │  Memory Agent                          │  │
│  │  (Flash model)  │    │  ┌──────────────────────────────────┐  │  │
│  │  → Card[]       │    │  │  Knowledge Graph (JSON persist)  │  │  │
│  └─────────────────┘    │  └──────────────────────────────────┘  │  │
│                         └────────────────────────────────────────┘  │
│                                                                      │
│  REST: GET /api/health · /api/meetings/* · /api/memory/*            │
└──────────────────────────────────────────────────────────────────────┘
                    ↕  GWS CLI
┌─────────────────────────────────┐
│  Google Workspace               │
│  Gmail · Drive · Sheets · Cal   │
└─────────────────────────────────┘
```

---

## Section 4: Design Language

### Google / Gemini Aesthetic

DealBoard uses Google's Material Design 3 principles with Gemini branding:

- **Primary action color**: `#4285F4` (Google Blue)
- **Accent**: Gemini gradient `#4285F4 → #A142F4`
- **Surface**: White `#FFFFFF` and light gray `#F8F9FA`
- **Text**: `#202124` primary, `#5F6368` secondary, `#9AA0A6` muted
- **Border radius**: 8px (medium), 12px (cards), 16px (modals)
- **Shadows**: Subtle `0 1px 3px rgba(0,0,0,0.08)` — no heavy shadows

### Typography

- **Font**: Google Sans / Inter (system fallback)
- **Heading**: 20-24px, semibold, `#202124`
- **Body**: 14px, regular, `#5F6368`
- **Label / Badge**: 11-12px, bold, uppercase, tracked

### Card Label Colors (from PROTOCOL.md Section 6)

| Label | Intent | Color |
|-------|--------|-------|
| ALERT | Urgent risk | Google Red `#EA4335` |
| BATTLECARD | Competitive intel | Google Yellow `#FBBC04` |
| CONTEXT | Background info | Google Green `#34A853` |
| STRATEGY | Tactical advice | Google Blue `#4285F4` |
| INFO | Neutral data | Gray `#5F6368` |

### Motion

- Card entrance: slide up + fade in, `150ms ease-out`
- Status changes: color transition `100ms`
- Modals: scale + fade `150ms`

---

## Section 5: Feature List

| Feature | Status | Owner |
|---------|--------|-------|
| WebSocket real-time communication | [TODO] Backend + Frontend |
| Audio capture (browser mic) | [TODO] Frontend |
| Gemini Live audio transcription | [TODO] Backend |
| Listener Agent (context detection) | [TODO] Backend |
| Worker Orchestrator (parallel GWS) | [TODO] Backend |
| Gmail Worker | [TODO] Backend |
| Drive Worker | [TODO] Backend |
| Sheets Worker | [TODO] Backend |
| Calendar Worker | [TODO] Backend |
| Analyser Agent (card generation) | [TODO] Backend |
| Strategy Agent (document generation) | [TODO] Backend |
| Memory Agent (knowledge graph) | [TODO] Backend |
| Live Card Board UI | [TODO] Frontend |
| Live Transcript Panel UI | [TODO] Frontend |
| Vision emotion display | [TODO] Frontend |
| Post-meeting document viewer | [TODO] Frontend |
| Knowledge graph D3 visualization | [TODO] Frontend |
| Mock data fallback (dev mode) | [DONE] Both |
| /api/health endpoint | [DONE] Backend |
| WebSocket skeleton server | [DONE] Backend |
| WebSocket client with reconnect | [DONE] Frontend |
| Config / types scaffolding | [DONE] Both |

---

## Section 6: File Map

### Server Files

| File | Purpose | Team |
|------|---------|------|
| `server/server.js` | Main entry point, WS + REST setup | Backend |
| `server/config.js` | All configuration constants | Backend |
| `server/agents/listener-agent.js` | Transcript → context query decision | Backend |
| `server/agents/analyser-agent.js` | Worker results → Card synthesis | Backend |
| `server/agents/strategy-agent.js` | Full meeting → documents | Backend |
| `server/agents/memory-agent.js` | Meeting events → knowledge graph | Backend |
| `server/workers/gmail-worker.js` | GWS Gmail search | Backend |
| `server/workers/drive-worker.js` | GWS Drive search | Backend |
| `server/workers/sheets-worker.js` | GWS Sheets read | Backend |
| `server/workers/calendar-worker.js` | GWS Calendar fetch | Backend |
| `server/workers/worker-orchestrator.js` | Parallel worker coordination | Backend |
| `server/tools/gws-tools.js` | CLI execution wrapper | Backend |
| `server/tools/skills-loader.js` | Prompt + skill file loader | Backend |
| `server/tools/gemini-client.js` | Gemini API wrapper | Backend |
| `server/memory/knowledge-graph.js` | Graph storage + queries | Backend |
| `server/routes/api-health.js` | GET /api/health | Backend |
| `server/routes/api-meetings.js` | GET /api/meetings/* | Backend |
| `server/routes/api-memory.js` | GET /api/memory/* | Backend |
| `server/prompts/*.txt` | LLM system prompts | Backend |
| `server/mock-data/*.json` | Dev mock data | Backend |
| `server/scripts/test-*.js` | Agent test scripts | Backend |

### Frontend Files

| File | Purpose | Team |
|------|---------|------|
| `frontend/lib/config.ts` | All frontend config + design tokens | Frontend |
| `frontend/lib/types.ts` | All TypeScript interfaces | Frontend |
| `frontend/lib/websocket.ts` | WebSocket client class | Frontend |
| `frontend/lib/hooks/useWebSocket.ts` | WS status + send hook | Frontend |
| `frontend/lib/hooks/useAudioCapture.ts` | Browser mic hook | Frontend |
| `frontend/lib/hooks/useMeetingState.ts` | Meeting lifecycle hook | Frontend |
| `frontend/components/providers/WebSocketProvider.tsx` | Global WS context | Frontend |
| `frontend/components/ui/*.tsx` | Reusable UI components | Frontend |
| `frontend/app/dashboard/` | Meeting list + CTA | Frontend |
| `frontend/app/meeting/` | Live meeting experience | Frontend |
| `frontend/app/review/` | Post-meeting documents | Frontend |
| `frontend/app/memory/` | Knowledge graph explorer | Frontend |
| `frontend/app/settings/` | Config + connection status | Frontend |
| `frontend/mock-data/*.json` | Frontend dev mock data | Frontend |

### Contract Files

| File | Purpose | Team |
|------|---------|------|
| `PROTOCOL.md` | WebSocket + REST contract | Both |
| `skills/*/SKILL.md` | GWS CLI documentation | Backend |
| `.env.example` | Environment variable reference | Both |

---

## Section 7: Protocol Summary

See **`PROTOCOL.md`** for the complete specification. Key points:

- Single WebSocket at `ws://localhost:3001/ws`
- All messages use `{ type, payload, timestamp }` envelope
- 5 client→server types, 7 server→client types
- REST at `http://localhost:3001/api/*`
- Silently ignore unknown message types
- Reconnect with exponential backoff (3s → 30s max)

---

## Section 8: How to Run

### Scenario 1: Full Stack (Backend + Frontend)

```bash
# Install all dependencies
cd dealboard
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start both servers
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:3000
```

### Scenario 2: Backend Only

```bash
cd dealboard/server
npm install
node server.js
# Test: curl http://localhost:3001/api/health
# Test: node scripts/test-pipeline.js
```

### Scenario 3: Frontend Only (Mock Mode)

```bash
cd dealboard/frontend
npm install
# Use mock data — no backend required
NEXT_PUBLIC_USE_MOCK=true npm run dev
```

### Scenario 4: Test Individual Agents

```bash
cd dealboard/server
npm install

# Test specific agents
npm run test:listener    # node scripts/test-listener.js
npm run test:analyser    # node scripts/test-analyser.js
npm run test:strategy    # node scripts/test-strategy.js
npm run test:memory      # node scripts/test-memory.js
npm test                 # Full pipeline test
```

---

## Section 9: Config Reference

### Server Environment Variables (`server/.env` or `/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `MODE` | `live` | Operating mode (`live` or `demo`) |
| `USE_MOCK` | `false` | Return mock data from `mock-data/` |
| `GEMINI_API_KEY` | — | **Required for live mode** |

### Frontend Environment Variables (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:3001/ws` | WebSocket endpoint |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | REST API base URL |
| `NEXT_PUBLIC_ENABLE_VISION` | `true` | Show vision emotion features |
| `NEXT_PUBLIC_ENABLE_MEMORY` | `true` | Show memory graph features |

### Server Feature Flags (`server/config.js`)

| Flag | Default | Description |
|------|---------|-------------|
| `ENABLE_STRATEGY_AGENT` | `true` | Enable document generation |
| `ENABLE_MEMORY_AGENT` | `true` | Enable knowledge graph |
| `ENABLE_CALENDAR_WORKER` | `true` | Enable calendar GWS worker |

---

## Section 10: Testing Instructions

### Unit Tests (Agent Stubs)

Each agent has a corresponding test script in `server/scripts/`. Scripts load mock data and call agent functions, logging results to console. They run immediately without a Gemini API key (agents return stub responses until implemented).

```bash
cd server
node scripts/test-listener.js    # Tests listener-agent with 3 high-signal segments
node scripts/test-analyser.js    # Tests analyser-agent with mock worker results
node scripts/test-strategy.js    # Tests strategy-agent, generates all 4 doc types
node scripts/test-memory.js      # Tests memory-agent read/write
node scripts/test-pipeline.js    # Full pipeline end-to-end
```

### API Health Check

```bash
curl http://localhost:3001/api/health
# Expected: { "success": true, "version": "1.0", ... }
```

### WebSocket Test

```bash
# Using wscat (npm install -g wscat)
wscat -c ws://localhost:3001/ws
# Should receive: { "type": "meeting-state", "payload": { "state": "idle" }, ... }
```

### Mock Data Verification

All mock data files use the **AcmeCorp** scenario:
- **Prospect**: TechVentures (FinTech, 320 employees)
- **Key contacts**: Marcus Johnson (CTO), Priya Patel (VP Engineering)
- **Pain**: Datadog at $50k/mo, scaling to $70k/mo
- **Competitors**: Datadog, New Relic
- **Salesperson**: Sarah Chen (AcmeCorp AE)

Verify mock data with:
```bash
node -e "const d = require('./server/mock-data/mock-data.json'); console.log('Mock data OK:', Object.keys(d))"
node -e "const t = require('./server/mock-data/mock-transcript.json'); console.log('Transcript segments:', t.length)"
```
