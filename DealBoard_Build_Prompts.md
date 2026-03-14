# DEALBOARD v4 — AI COMPANION BUILD PROMPTS
## Step-by-Step Build Guide — Full Workspace Intelligence System

> **GOLDEN RULE**: Give ONE prompt at a time. Wait until the result works before moving to the next one.
> Each prompt is self-contained — the LLM does not need context from previous prompts.

> **ARCHITECTURE v4**: DealBoard AI Companion is a **full-workspace intelligence system** built as a **Next.js web application** with a Google/Gemini-inspired design language. It connects to a Google Cloud environment, listens during conversations via Google Meet, provides real-time advice during meetings, analyzes body language and visual scenes via camera, and generates strategic documents — as if you were truly collaborating with an AI partner throughout your workflow.
>
> The frontend is a **Next.js dashboard** (not a Chrome extension) that:
> - Connects to Google Meet audio via browser APIs
> - Displays real-time intelligence cards during meetings
> - Shows body language and scene analysis from camera feeds
> - Generates post-meeting documents (summaries, follow-ups, strategy briefs)
> - Visualizes a persistent knowledge graph of all interactions
> - Uses **Google/Gemini design language**: clean whites, soft blues (#4285F4), smooth gradients, rounded cards, Material-inspired typography
>
> The agent system is built on a **multi-agent pipeline**:
> - A **Listener Agent** monitors live audio from Google Meet and detects context gaps or strategic moments.
> - **Worker Agents** scrape Google Workspace (Gmail, Drive, Sheets, Calendar, Docs) via the `gws` CLI to retrieve relevant data.
> - An **Analyser Agent** fuses Worker results into structured cards displayed in real time.
> - A **Vision Agent** analyzes camera feeds for body language, emotions, and scene understanding.
> - A **Strategy Agent** produces post-meeting deliverables: summaries, follow-up emails, strategy documents, decision briefs.
> - A **Memory Agent** maintains a persistent knowledge graph of all interactions, people, decisions, and patterns.
>
> If the Listener understands the context → total silence, nothing is sent.
> If context is unclear → full pipeline: Workers → Analyser → Card.
> After meetings → Strategy Agent generates documents. Memory Agent stores everything.

---

> **CODE QUALITY RULES — APPLY TO EVERY PROMPT**
>
> These rules are **mandatory** for every file produced throughout this entire build:
>
> 1. **One file per feature or related feature group.** Split as much as possible into separate files. Never put unrelated logic in the same file.
> 2. **Add docstrings to ALL functions** explaining what they do, what they receive, and what they return.
> 3. **Start each file with a long comment block** (15–30 lines) explaining in detail what the feature is about, the different use cases it covers, and how it fits into the overall architecture.
> 4. **Maintain a `Design.md` document at the root of the app** that documents all features, their purpose, their file locations, and how they interact. Update it with every new feature.
> 5. **Group all configurable items** (model names, API keys, ports, thresholds, timeouts, feature flags) **in a single centralized config file** (`config.js` for the server, `lib/config.ts` for the frontend). No magic strings or hardcoded values anywhere else.
> 6. **Always create a way to test scripts without altering real data.** Every module that touches external APIs (Google Workspace, Gemini, etc.) must support a `USE_MOCK=true` mode that uses local mock data. Every agent prompt must be testable with a dry-run script.

---

# PART 0 : PROJECT FOUNDATION

## Prompt 0.1 — Project Structure + Config + Design.md

```
You are an expert full-stack developer building a hackathon project called "DealBoard AI Companion" — a real-time AI workspace intelligence system.

The frontend is a Next.js 14+ dashboard (App Router). The backend is a Node.js server with WebSocket support. The design language follows Google/Gemini aesthetics.

Create the foundational project structure with the following specifications:

PROJECT STRUCTURE:
dealboard/
├── package.json
├── Design.md                        (living documentation of all features)
├── .env.example                     (template for environment variables)
│
├── server/
│   ├── config.js                    (ALL server configurable items centralized here)
│   ├── server.js                    (main Express + WebSocket server)
│   ├── agents/
│   │   ├── listener-agent.js        (detects context gaps in live audio)
│   │   ├── analyser-agent.js        (fuses worker results into cards)
│   │   ├── vision-agent.js          (body language + scene understanding)
│   │   ├── strategy-agent.js        (generates post-meeting documents)
│   │   └── memory-agent.js          (maintains knowledge graph)
│   ├── workers/
│   │   ├── gmail-worker.js          (searches and retrieves emails)
│   │   ├── drive-worker.js          (searches and retrieves Drive files)
│   │   ├── sheets-worker.js         (reads spreadsheet data)
│   │   ├── calendar-worker.js       (reads calendar events and agendas)
│   │   └── worker-orchestrator.js   (runs workers in parallel)
│   ├── prompts/
│   │   ├── listener-prompt.txt      (system prompt for Listener Agent)
│   │   ├── analyser-prompt.txt      (system prompt for Analyser Agent)
│   │   ├── vision-prompt.txt        (system prompt for Vision Agent)
│   │   ├── strategy-prompt.txt      (system prompt for Strategy Agent)
│   │   └── memory-prompt.txt        (system prompt for Memory Agent)
│   ├── tools/
│   │   ├── gws-tools.js             (wrapper around gws CLI commands)
│   │   ├── skills-loader.js         (loads GWS SKILL.md files for agents)
│   │   └── gemini-client.js         (centralized Gemini API client)
│   ├── memory/
│   │   ├── knowledge-graph.js       (stores and queries interaction history)
│   │   └── memory-store.json        (persistent local store for the graph)
│   └── utils/
│       ├── logger.js                (timestamped console logging)
│       └── audio-processor.js       (PCM audio chunk handling)
│
├── app/                             (Next.js App Router)
│   ├── layout.tsx                   (root layout with Google Fonts + global styles)
│   ├── page.tsx                     (home — redirect to /dashboard)
│   ├── globals.css                  (global styles + Gemini design tokens)
│   ├── dashboard/
│   │   ├── page.tsx                 (main dashboard — overview of all features)
│   │   └── layout.tsx               (dashboard layout with sidebar nav)
│   ├── meeting/
│   │   ├── page.tsx                 (live meeting view — cards + transcript + camera)
│   │   └── components/
│   │       ├── LiveCardBoard.tsx     (real-time card display during meeting)
│   │       ├── TranscriptPanel.tsx   (live transcript view)
│   │       ├── CameraAnalysis.tsx    (body language + scene understanding panel)
│   │       ├── CardExpanded.tsx      (expanded card with Q/A details)
│   │       ├── TopBar.tsx            (alert pills + timer)
│   │       └── TimelineView.tsx      (chronological event timeline)
│   ├── review/
│   │   ├── page.tsx                 (post-meeting review — documents + insights)
│   │   └── components/
│   │       ├── MeetingSummary.tsx    (auto-generated meeting summary)
│   │       ├── FollowUpEmail.tsx     (editable follow-up email draft)
│   │       ├── StrategyBrief.tsx     (next steps, risks, opportunities)
│   │       ├── DecisionLog.tsx       (structured decisions with owners)
│   │       └── DocumentExport.tsx    (export buttons: copy, download, email)
│   ├── memory/
│   │   ├── page.tsx                 (knowledge graph visualization)
│   │   └── components/
│   │       ├── KnowledgeGraph.tsx    (interactive graph visualization)
│   │       ├── PeopleProfiles.tsx    (person cards with interaction history)
│   │       ├── PatternInsights.tsx   (detected patterns and trends)
│   │       └── DecisionHistory.tsx   (timeline of all past decisions)
│   └── settings/
│       └── page.tsx                 (config: API keys, feature toggles, model selection)
│
├── components/
│   ├── ui/                          (shared UI components — Gemini design system)
│   │   ├── Card.tsx                 (base card component with Gemini styling)
│   │   ├── Badge.tsx                (colored badge/pill component)
│   │   ├── Button.tsx               (Google-style button variants)
│   │   ├── Modal.tsx                (overlay modal)
│   │   ├── Sidebar.tsx              (navigation sidebar)
│   │   ├── StatusIndicator.tsx      (connection status dots)
│   │   └── LoadingSpinner.tsx       (Gemini-style loading animation)
│   └── providers/
│       └── WebSocketProvider.tsx     (React context for WebSocket connection)
│
├── lib/
│   ├── config.ts                    (frontend config — API URLs, feature flags)
│   ├── websocket.ts                 (WebSocket client logic)
│   ├── types.ts                     (TypeScript types for cards, documents, etc.)
│   └── hooks/
│       ├── useWebSocket.ts          (hook for WebSocket connection)
│       ├── useAudioCapture.ts       (hook for browser audio capture)
│       ├── useCameraCapture.ts      (hook for camera feed + frame extraction)
│       └── useMeetingState.ts       (hook for meeting lifecycle state)
│
├── mock-data/
│   ├── mock-data.json               (fake GWS data for demo fallback)
│   ├── mock-transcript.json         (fake meeting transcript for testing)
│   ├── mock-memory.json             (fake knowledge graph data)
│   └── mock-vision.json             (fake body language + scene analysis data)
│
├── scripts/
│   ├── test-listener.js             (test Listener Agent without live audio)
│   ├── test-analyser.js             (test Analyser Agent with mock worker results)
│   ├── test-vision.js               (test Vision Agent with mock camera frames)
│   ├── test-strategy.js             (test Strategy Agent with mock meeting data)
│   ├── test-pipeline.js             (test full pipeline end-to-end with mock data)
│   └── test-memory.js               (test Memory Agent read/write)
│
├── public/
│   ├── gemini-logo.svg              (Gemini logo for branding)
│   └── favicon.ico
│
└── skills/
    ├── gws-shared/SKILL.md
    ├── gws-gmail/SKILL.md
    ├── gws-drive/SKILL.md
    └── gws-sheets-read/SKILL.md

SERVER CONFIG (server/config.js):
This file centralizes ALL server-side configurable values.

module.exports = {
  // Server
  PORT: process.env.PORT || 3001,
  MODE: process.env.MODE || 'live',          // 'live' | 'fallback'
  USE_MOCK: process.env.USE_MOCK === 'true', // mock GWS data

  // Gemini Models
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_LIVE_MODEL: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
  GEMINI_FLASH_MODEL: 'gemini-2.5-flash',
  GEMINI_PRO_MODEL: 'gemini-2.5-pro',

  // Agent-specific model assignments (easy to swap)
  LISTENER_MODEL: 'gemini-2.5-flash',
  ANALYSER_MODEL: 'gemini-2.5-flash',
  VISION_MODEL: 'gemini-2.5-pro',           // needs multimodal capabilities
  STRATEGY_MODEL: 'gemini-2.5-pro',         // needs deeper reasoning
  MEMORY_MODEL: 'gemini-2.5-flash',

  // Timeouts
  GWS_COMMAND_TIMEOUT_MS: 10000,
  WEBSOCKET_RECONNECT_INTERVAL_MS: 3000,
  AUDIO_CHUNK_INTERVAL_MS: 250,
  CAMERA_FRAME_INTERVAL_MS: 5000,           // capture a frame every 5 seconds

  // Memory
  MEMORY_STORE_PATH: './server/memory/memory-store.json',
  MAX_MEMORY_ENTRIES: 1000,

  // Feature Flags
  ENABLE_STRATEGY_AGENT: true,
  ENABLE_MEMORY_AGENT: true,
  ENABLE_VISION_AGENT: true,
  ENABLE_BODY_LANGUAGE: true,
  ENABLE_SCENE_UNDERSTANDING: true,
  ENABLE_CALENDAR_WORKER: true,

  // Paths
  PROMPTS_DIR: './server/prompts',
  SKILLS_DIR: './skills',
  MOCK_DATA_DIR: './mock-data',
};

FRONTEND CONFIG (lib/config.ts):
export const config = {
  // API
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',

  // Feature Flags (mirror server flags for conditional UI)
  ENABLE_VISION: process.env.NEXT_PUBLIC_ENABLE_VISION !== 'false',
  ENABLE_MEMORY_VIEW: process.env.NEXT_PUBLIC_ENABLE_MEMORY !== 'false',

  // Camera
  CAMERA_FRAME_INTERVAL_MS: 5000,
  CAMERA_FRAME_WIDTH: 640,
  CAMERA_FRAME_HEIGHT: 480,

  // Design Tokens (referenced in CSS but also available in JS)
  COLORS: {
    googleBlue: '#4285F4',
    googleRed: '#EA4335',
    googleYellow: '#FBBC04',
    googleGreen: '#34A853',
    geminiBlue: '#4285F4',
    geminiPurple: '#A142F4',
    geminiGradientStart: '#4285F4',
    geminiGradientEnd: '#A142F4',
    surfaceWhite: '#FFFFFF',
    surfaceLight: '#F8F9FA',
    surfaceMedium: '#E8EAED',
    textPrimary: '#202124',
    textSecondary: '#5F6368',
    textMuted: '#9AA0A6',
    alertRed: '#EA4335',
    alertAmber: '#FBBC04',
    alertTeal: '#34A853',
    alertBlue: '#4285F4',
  },
};

DESIGN.MD:
Create an initial Design.md at the project root. It must contain:
1. Project overview (AI Companion — full workspace intelligence system)
2. Architecture diagram in ASCII art showing the data flow:
   Audio → Gemini Live → Transcript → Listener → Workers → Analyser → Cards → Dashboard
   Camera → Vision Agent → Body Language Cards + Scene Analysis → Dashboard
   Meeting End → Strategy Agent → Documents (summary, follow-up, strategy brief)
   Every interaction → Memory Agent → Knowledge Graph → Memory Dashboard
3. Design Language section: Google/Gemini aesthetic, color palette, typography, component style
4. Feature list with status: [TODO] / [WIP] / [DONE]
5. File map: which file implements which feature
6. Config reference: explain each setting in both config files
7. Testing instructions: how to run each test script

IMPORTANT:
- Do NOT write business logic yet — only the skeleton, configs, and documentation.
- Every file that will contain logic should exist as a placeholder with a detailed header comment, empty exported functions with docstrings, and TODO comments.
- The Next.js app uses TypeScript.
- The server remains plain JavaScript (Node.js).
```

---

# PART 1 : NEXT.JS DASHBOARD (Frontend)

## Prompt 1.1 — Design System + Global Styles (Google/Gemini Aesthetic)

```
You are an expert frontend developer and UI designer. Create the design system and global styles for "DealBoard AI Companion", a Next.js 14+ dashboard.

DESIGN LANGUAGE: Google/Gemini

The entire application must look like it was designed by Google's Gemini team. Think:
- Google's Material Design 3 principles but with the Gemini AI aesthetic
- Clean, airy, light backgrounds with generous whitespace
- Soft shadows and subtle depth
- Rounded corners (12-16px) on cards and containers
- Smooth, purposeful micro-animations
- The Gemini gradient (blue #4285F4 → purple #A142F4) as the primary accent

COLOR PALETTE:
Primary:
- Google Blue: #4285F4 (main action color, links, active states)
- Gemini Purple: #A142F4 (AI-specific accents, agent badges)
- Gemini Gradient: linear-gradient(135deg, #4285F4, #A142F4) (hero elements, AI activity indicators)

Surfaces:
- White: #FFFFFF (main background)
- Light Grey: #F8F9FA (card backgrounds, secondary surfaces)
- Medium Grey: #E8EAED (borders, dividers)
- Dark Surface: #1A1A2E (for optional dark mode / meeting view)

Text:
- Primary: #202124 (headings, body text)
- Secondary: #5F6368 (descriptions, labels)
- Muted: #9AA0A6 (timestamps, metadata)

Alerts (Google-native colors):
- Critical (ALERT card): #EA4335 (Google Red) — bg: #FDE7E7, border: #F5C6C6
- Warning (BATTLECARD): #FBBC04 (Google Yellow) — bg: #FEF7E0, border: #FDE293
- Info (CONTEXT card): #34A853 (Google Green) — bg: #E6F4EA, border: #B7E1C1
- Strategy (STRATEGY card): #4285F4 (Google Blue) — bg: #E8F0FE, border: #AECBFA
- Neutral (INFO card): #5F6368 — bg: #F1F3F4, border: #DADCE0

TYPOGRAPHY:
- Display / Headings: "Google Sans" (load from Google Fonts, fallback: "Product Sans", "Segoe UI", system-ui)
- Body text: "Google Sans Text" (fallback: "Roboto", sans-serif)
- Monospace / Data: "Google Sans Mono" (fallback: "Roboto Mono", monospace)
- Heading scale: 32px / 24px / 20px / 16px / 14px
- Body: 14px regular, 14px medium for emphasis
- Smaller text: 12px for timestamps, badges, labels

COMPONENT STYLE GUIDE:

Cards:
- Background: #FFFFFF or #F8F9FA
- Border: 1px solid #E8EAED
- Border-radius: 12px
- Shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)
- Hover shadow: 0 4px 12px rgba(0,0,0,0.1)
- Padding: 16px-20px
- Alert cards have a 3px left border in their alert color

Buttons:
- Primary: Gemini gradient background, white text, rounded-full (24px radius), subtle shadow
- Secondary: white background, Google Blue text, 1px Google Blue border, rounded-full
- Text: no background, Google Blue text, hover underline
- All buttons: 14px medium weight, padding 8px 20px, smooth transitions

Badges / Pills:
- Rounded-full (999px radius)
- Small: 10px text, padding 2px 8px
- Alert badges use their alert color bg + darker text
- Agent badges use Gemini Purple bg + white text

Navigation Sidebar:
- Width: 260px
- White background with right border #E8EAED
- Logo + app name at top with Gemini gradient icon
- Nav items: 14px, Google Blue on active, grey on inactive
- Active item has a light blue tinted background (#E8F0FE) with rounded-lg shape
- Icons from Lucide React (Google-style outlined icons)

Loading States:
- Gemini-style shimmer: soft blue-to-purple gradient moving left to right
- Pulsing dots in Gemini gradient for "AI thinking" states
- Skeleton screens with rounded rectangles

FILE: app/globals.css
- Define ALL CSS custom properties (--color-primary, --color-surface, etc.)
- Include Gemini gradient utility classes
- Define card, button, badge base styles
- Include animations: shimmer, pulse, slide-in, fade-in, flash-border
- Import Google Sans fonts from Google Fonts CDN
- Responsive breakpoints

FILE: app/layout.tsx
- Root layout with Google Fonts loaded via next/font/google
- Global CSS imported
- HTML lang="en"
- Metadata: title "AI Companion — Your Second Brain"

FILE: components/ui/Card.tsx
- Base card component following the style guide above
- Props: variant (default | alert | battlecard | context | strategy | info), children, className, onClick
- Alert variant adds left border color
- Hover shadow animation

FILE: components/ui/Badge.tsx
- Badge/pill component
- Props: variant (critical | warn | info | strategy | neutral | agent), label, pulsing (boolean)
- Pulsing prop adds animated dot before label

FILE: components/ui/Button.tsx
- Button component
- Props: variant (primary | secondary | text | danger), children, onClick, loading
- Loading state shows Gemini spinner

FILE: components/ui/StatusIndicator.tsx
- Small dot that shows connection status
- Props: status (connected | disconnected | connecting), label
- Connected: green dot, Disconnected: red dot, Connecting: pulsing yellow dot

FILE: components/ui/LoadingSpinner.tsx
- Gemini-style loading animation
- Three dots that pulse in sequence with Gemini gradient colors

IMPORTANT:
- Use Tailwind CSS for utility classes but define custom CSS properties for the design tokens
- All colors come from lib/config.ts or CSS custom properties — no hardcoded colors in components
- Every component has a JSDoc comment block at the top explaining its purpose and usage
- Every file starts with a detailed header comment
- Make the design feel PREMIUM and GOOGLE-NATIVE — not generic bootstrap or shadcn defaults
```

## Prompt 1.2 — Dashboard Layout + Navigation

```
You are an expert Next.js developer. Create the dashboard layout and navigation for "DealBoard AI Companion".

The layout follows Google/Gemini design language: clean sidebar on the left, content area on the right, top bar for context.

FILE: app/dashboard/layout.tsx
Start with a detailed comment block explaining:
- This is the shared layout for all dashboard pages
- It provides the sidebar navigation and top bar
- It wraps children in the WebSocket provider for real-time data

Layout structure:
┌──────────────────────────────────────────────────────┐
│  TOP BAR (64px height)                               │
│  Logo + "AI Companion" | Current page title | Status │
├────────────┬─────────────────────────────────────────┤
│            │                                         │
│  SIDEBAR   │        MAIN CONTENT AREA                │
│  (260px)   │        (scrollable)                     │
│            │                                         │
│  ● Meeting │                                         │
│  ● Review  │        {children}                       │
│  ● Memory  │                                         │
│  ● Settings│                                         │
│            │                                         │
│            │                                         │
│  ──────── │                                         │
│  Status:   │                                         │
│  🟢 Connected                                        │
└────────────┴─────────────────────────────────────────┘

FILE: components/Sidebar.tsx
Start with a header comment explaining this is the main navigation component.
- Logo section: Gemini-gradient icon + "AI Companion" text
- Navigation links:
  · Meeting (icon: Headphones) — /dashboard/meeting
  · Review (icon: FileText) — /dashboard/review
  · Memory (icon: Brain) — /dashboard/memory
  · Settings (icon: Settings) — /dashboard/settings
- Active link: light blue background (#E8F0FE), Google Blue text, bold
- Inactive: grey text, hover: light grey background
- Bottom section: WebSocket connection status with StatusIndicator
- Collapsible on mobile (hamburger menu)

FILE: components/TopBar.tsx
- Left: Logo icon (small) + "AI Companion" in Google Sans
- Center: Current page title (dynamic, based on route)
- Right: Connection status dot + "Generate Summary" button (only visible on /meeting route) + Call timer (only during active meeting)

FILE: app/dashboard/page.tsx
The main dashboard overview page. Shows:
- Welcome message with Gemini gradient text: "Your Second Brain is Ready"
- 4 feature cards in a 2x2 grid:
  · "Live Meeting" — card with microphone icon, description, "Start Meeting" button
  · "Post-Meeting Review" — card with document icon, description, link to /review
  · "Knowledge Graph" — card with brain icon, description, link to /memory
  · "Settings" — card with gear icon, description, link to /settings
- Each card has a subtle Gemini gradient top border (3px)
- Cards animate in with staggered fade-up on page load

FILE: components/providers/WebSocketProvider.tsx
Start with a header comment explaining:
- This React context provider manages the WebSocket connection to the backend
- It provides connection status, received cards, received documents, and send functions
- It handles automatic reconnection on disconnect
- All WebSocket config comes from lib/config.ts

Context value:
{
  status: 'connected' | 'disconnected' | 'connecting',
  cards: Card[],
  documents: Document[],
  visionData: VisionData | null,
  meetingState: 'idle' | 'active' | 'ended',
  startMeeting: () => void,
  stopMeeting: () => void,
  generateSummary: () => void,
  sendAudioChunk: (chunk: ArrayBuffer) => void,
  sendCameraFrame: (frame: string) => void   // base64 JPEG
}

FILE: lib/types.ts
Define TypeScript types for:
- Card (label, priority, summary, timestamp, details)
- CardDetail (agent, question, answer)
- Document (docType, title, content, metadata)
- VisionData (bodyLanguage, sceneAnalysis)
- BodyLanguageReading (participant, expression, engagement, emotion, confidence)
- SceneAnalysis (description, objects, context, risks)
- MeetingState, ConnectionStatus
- MemoryPerson, MemoryInteraction, MemoryDecision, MemoryPattern

IMPORTANT:
- All components use the Google/Gemini design system from Prompt 1.1
- Responsive: works on desktop (1440px+) and tablet (768px+)
- Use Lucide React for icons
- Every component has a JSDoc comment block
- Every file starts with a detailed header comment
- Use the Next.js App Router (not Pages Router)
```

## Prompt 1.3 — Live Meeting Page

```
You are an expert Next.js developer. Create the live meeting page for "DealBoard AI Companion".

This is the core feature: during a Google Meet call, this page shows real-time intelligence cards, live transcript, body language analysis, and scene understanding — all in a Google/Gemini-styled layout.

FILE: app/meeting/page.tsx
Start with a detailed comment block (20+ lines) explaining:
- This is the live meeting intelligence view
- It connects to the backend via WebSocket and streams audio + camera frames
- It displays real-time cards from the Listener → Workers → Analyser pipeline
- It shows body language analysis and scene understanding from the Vision Agent
- It provides a live transcript panel
- The layout adapts between "pre-meeting", "active meeting", and "meeting ended" states

LAYOUT (during active meeting):
┌───────────────────────────────────────────────────────────────┐
│  TOP BAR: [Alert Pills] ← pills slide in from left           │
│           Timer: 00:34:12                        [End Meeting]│
├─────────────────────────┬─────────────────┬───────────────────┤
│                         │                 │                   │
│   CARD BOARD            │   TRANSCRIPT    │   CAMERA PANEL    │
│   (scrollable)          │   (scrollable)  │   (fixed)         │
│                         │                 │                   │
│   ┌── ALERT ──────┐    │   00:34 [P]     │   ┌────────────┐ │
│   │ 25% exceeds   │    │   "We've been   │   │  Webcam     │ │
│   │ max grid      │    │    looking at    │   │  preview    │ │
│   └───────────────┘    │    Datadog..."   │   └────────────┘ │
│                         │                 │                   │
│   ┌── BATTLECARD ─┐    │   00:35 [Us]    │   BODY LANGUAGE:  │
│   │ Datadog:      │    │   "Interesting,  │   😐 Neutral      │
│   │ volume billing│    │    let me..."    │   📊 Engagement:  │
│   └───────────────┘    │                 │      72%          │
│                         │                 │   ⚠️ Skepticism   │
│   ┌── CONTEXT ────┐    │                 │      detected     │
│   │ CTO email:    │    │                 │                   │
│   │ ISO mandatory │    │                 │   SCENE:          │
│   └───────────────┘    │                 │   "Meeting room,  │
│                         │                 │    whiteboard     │
│   ┌── STRATEGY ───┐    │                 │    with Q1 goals" │
│   │ Mention flat  │    │                 │                   │
│   │ rate now      │    │                 │                   │
├─────────────────────────┴─────────────────┴───────────────────┤
│  TIMELINE BAR: ●00:12 Competitor detected  ●00:34 Risk alert │
└───────────────────────────────────────────────────────────────┘

LAYOUT (pre-meeting — no active call):
- Centered content: large Gemini-gradient microphone icon
- "Start Meeting" button (primary, large)
- "Connect to audio to begin your AI companion session"
- Recent meetings list below (from memory, if available)

FILE: app/meeting/components/LiveCardBoard.tsx
Start with a header comment explaining this component displays real-time intelligence cards.
- Receives cards from WebSocket context
- Groups cards by type: ALERT at top, then BATTLECARD, CONTEXT, STRATEGY, INFO
- New cards animate in:
  · ALERT: border flashes red, card fades in with slight scale-up
  · BATTLECARD: slides in from right
  · CONTEXT: fades in softly
  · STRATEGY: slides up from bottom
- Each card shows: colored left border (3px) + label badge + timestamp + summary text
- On click: card expands to show Q/A details from each agent
- Max 15 cards visible (older cards scroll up)

FILE: app/meeting/components/CardExpanded.tsx
- Expanded card overlay or inline expansion
- Shows all agent Q/A details:
  · Agent name in a Gemini Purple badge
  · "Q:" in secondary text color
  · "A:" in primary text, slightly bolder
- Close button (X) in top right
- Subtle expand animation (height transition 0.2s ease-out)

FILE: app/meeting/components/TranscriptPanel.tsx
Start with a header comment explaining:
- This displays the live meeting transcript
- Messages are color-coded: prospect (left-aligned, grey bg) vs us (right-aligned, blue bg)
- Auto-scrolls to bottom on new messages
- Timestamps in muted monospace
- Search/filter bar at top (optional)

FILE: app/meeting/components/CameraAnalysis.tsx
Start with a detailed header comment (20+ lines) explaining:
- This component handles camera feed capture and displays Vision Agent results
- It captures a frame from the user's webcam every N seconds (from config)
- The frame is sent to the backend as a base64 JPEG
- The backend runs it through the Vision Agent (Gemini Pro with multimodal)
- Results are displayed as two sub-panels: Body Language and Scene Understanding
- Camera feed is optional — the meeting works without it
- Privacy note: frames are processed and discarded, never stored

Camera section (top):
- Small webcam preview (320x240) with rounded corners
- "Camera Active" indicator with green dot
- Toggle button to enable/disable camera

Body Language section (middle):
- Participant emotion indicators:
  · Primary emotion with emoji: 😐 Neutral, 😊 Positive, 😟 Concerned, 🤔 Skeptical
  · Engagement level: progress bar (0-100%) in Gemini gradient
  · Attention level: progress bar (0-100%) in Google Blue
  · Confidence score for the reading
- Updates every 5 seconds (configurable)
- Smooth transitions between readings

Scene Understanding section (bottom):
- Text description of what the camera sees
- Detected objects as small badges
- Context interpretation: "Meeting room with whiteboard showing Q1 goals"
- Risk or opportunity flags from scene analysis

FILE: app/meeting/components/TopBar.tsx
- Fixed top bar during meeting
- Left side: animated alert pills (max 3), colored by priority
  · Pills slide in from left, push older pills right
  · Each pill: colored dot (pulsing) + short text (max 5 words)
- Right side: call timer (HH:MM:SS) in monospace + "End Meeting" button (red variant)

FILE: app/meeting/components/TimelineView.tsx
- Horizontal or vertical timeline at bottom
- Each event: colored dot + timestamp + short description
- Colors match card types (red, amber, green, blue, grey)
- Auto-scrolls to show most recent event
- Subtle line connecting events

FILE: lib/hooks/useAudioCapture.ts
Start with a header comment explaining:
- This hook captures audio from the user's microphone
- It chunks the audio into 250ms PCM segments at 16kHz 16-bit
- It sends each chunk to the backend via WebSocket
- It handles browser permission requests and fallback states
- NOTE: For hackathon, we capture the user's mic audio. Tab audio capture (Google Meet) would require a Chrome extension — as a fallback, the user can share system audio or use the Web Speech API text fallback mode.

FILE: lib/hooks/useCameraCapture.ts
Start with a header comment explaining:
- This hook captures webcam frames at a configurable interval
- It extracts a JPEG frame from the video element at the specified resolution
- It sends the base64 frame to the backend via WebSocket
- It handles browser permission requests and privacy toggles
- The camera is optional — if the user denies permission, the meeting continues without vision features

IMPORTANT:
- All styling follows Google/Gemini design system
- Use Tailwind CSS + CSS custom properties
- All intervals and settings from lib/config.ts
- Every component has JSDoc comments
- Every file starts with a detailed header comment
- Add hardcoded test data: 2 alerts, 1 battlecard, 1 context, 1 strategy card, mock transcript, mock body language data
- Mock data is shown when USE_MOCK is true
```

## Prompt 1.4 — Post-Meeting Review Page

```
You are an expert Next.js developer. Create the post-meeting review page for "DealBoard AI Companion".

After a meeting ends, the Strategy Agent generates documents. This page displays them in a clean, Google-Docs-inspired reading experience.

FILE: app/review/page.tsx
Start with a detailed comment block explaining:
- This page shows post-meeting deliverables generated by the Strategy Agent
- It displays: Meeting Summary, Follow-up Email, Strategy Brief, Decision Log
- Documents arrive via WebSocket after the user clicks "Generate Summary"
- The page can also load past meeting reviews from the Memory Agent
- Design: clean, document-centric, Google Docs-like reading experience

LAYOUT:
┌───────────────────────────────────────────────────────────┐
│  Meeting Review — AcmeCorp Call (March 14, 2026)          │
│  Duration: 34:12 | Participants: 3 | Decisions: 4        │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  [Tab: Summary] [Tab: Follow-up] [Tab: Strategy] [Tab: Decisions]
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │   DOCUMENT CONTENT                                  │ │
│  │   (Markdown rendered with Google Docs styling)      │ │
│  │                                                     │ │
│  │   ## Key Topics                                     │ │
│  │   - Pricing discussion                              │ │
│  │   - Security compliance                             │ │
│  │   - Competitor evaluation                           │ │
│  │                                                     │ │
│  │   ## Decisions Made                                 │ │
│  │   1. Proceed with flat-rate proposal...             │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  [Copy to Clipboard] [Download .md] [Send via Gmail]      │
└───────────────────────────────────────────────────────────┘

FILE: app/review/components/MeetingSummary.tsx
- Renders the summary document in styled markdown
- Metadata strip at top: duration, participants (as small avatar pills), topics (as badges)
- Sections: Executive Overview, Key Topics, Decisions, Action Items, Risks, Opportunities
- Each section has a subtle left border in Gemini gradient

FILE: app/review/components/FollowUpEmail.tsx
- Renders the follow-up email draft
- Editable: the user can modify the email before sending/copying
- Shows: To, Subject, Body fields
- "Copy" button copies the formatted email
- "Open in Gmail" button (future: uses Gmail API to create draft)
- Google-Docs-style editing: clean white background, gentle focus borders

FILE: app/review/components/StrategyBrief.tsx
- Renders the strategy document
- Sections: Position Analysis, Risks (ranked), Opportunities (ranked), Recommended Actions, Patterns from Past Interactions
- Risk items: red left border, ordered by severity
- Opportunity items: green left border, ordered by impact
- Actions: numbered list with owner and deadline columns

FILE: app/review/components/DecisionLog.tsx
- Renders all decisions from the meeting in a structured table/list
- Columns: Decision, Owner, Deadline, Context, Status
- Status badges: "New", "Confirmed", "Contradicts Previous" (red)
- Contradictions are highlighted with a red background row

FILE: app/review/components/DocumentExport.tsx
- Export toolbar at bottom of each document tab
- Buttons: "Copy to Clipboard", "Download as .md", "Download as .pdf" (stretch goal)
- Buttons use the Google/Gemini design system
- Copy button shows a brief "Copied!" confirmation

IMPORTANT:
- All styling follows Google/Gemini design
- Tab navigation is smooth with underline indicator animation in Gemini gradient
- Use react-markdown or similar for markdown rendering
- Add mock documents for preview during development
- Every component has JSDoc + header comment
```

## Prompt 1.5 — Knowledge Graph / Memory Page

```
You are an expert Next.js developer. Create the knowledge graph visualization page for "DealBoard AI Companion".

This page shows the user's "second brain" — all stored interactions, people, decisions, and patterns as an interactive knowledge graph.

FILE: app/memory/page.tsx
Start with a detailed comment block explaining:
- This page visualizes the persistent knowledge graph maintained by the Memory Agent
- It shows people profiles, interaction history, decision timelines, and detected patterns
- The main visual is an interactive graph where nodes are people/companies/topics and edges are relationships
- This is what makes the product feel like a real "second brain"

LAYOUT:
┌───────────────────────────────────────────────────────────┐
│  Your Second Brain                                        │
│  142 interactions | 23 people | 67 decisions | 12 patterns│
├───────────┬───────────────────────────────────────────────┤
│           │                                               │
│  FILTERS  │   KNOWLEDGE GRAPH (interactive)               │
│           │                                               │
│  People   │    [Thomas Martin] ──── [AcmeCorp]            │
│  Companies│           │                    │              │
│  Topics   │    [Sarah Chen] ───── [Pricing]               │
│  Time     │           │                                   │
│           │    [ISO 27001] ──── [Security]                │
│           │                                               │
├───────────┴───────────────────────────────────────────────┤
│                                                           │
│  [Tab: People] [Tab: Interactions] [Tab: Decisions] [Tab: Patterns]
│                                                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │ Thomas  │  │ Sarah   │  │ AcmeCorp│                   │
│  │ Martin  │  │ Chen    │  │ Deal    │                   │
│  │ CTO     │  │ VP Eng  │  │ 175K    │                   │
│  │ 5 meets │  │ 3 meets │  │ Q1 2026 │                   │
│  └─────────┘  └─────────┘  └─────────┘                  │
└───────────────────────────────────────────────────────────┘

FILE: app/memory/components/KnowledgeGraph.tsx
- Interactive graph visualization using D3.js or react-force-graph
- Nodes: people (blue), companies (purple), topics (green), decisions (yellow)
- Edges: labeled relationships (e.g., "works at", "discussed", "decided")
- Click on a node to highlight its connections and show details
- Zoom, pan, drag support
- Gemini-gradient glow on highlighted nodes
- Filter by: time range, person, company, topic

FILE: app/memory/components/PeopleProfiles.tsx
- Grid of person cards
- Each card: name, title, company, communication style notes, last interaction date
- Click to expand: full interaction history with this person
- "Key concerns" section based on pattern analysis
- Google Contacts-style clean design

FILE: app/memory/components/PatternInsights.tsx
- List of detected patterns
- Each pattern: description, frequency, confidence score (progress bar), last observed date
- Examples: "Thomas always pushes back on pricing first", "AcmeCorp decisions require board approval"
- Color-coded by confidence: high (green), medium (yellow), low (grey)

FILE: app/memory/components/DecisionHistory.tsx
- Timeline of all past decisions
- Vertical timeline with colored dots
- Each entry: date, decision text, owner, context, status
- Contradictions highlighted in red
- Filter by company, person, or topic

IMPORTANT:
- Graph visualization must be interactive and smooth
- Use D3.js (import as external script) or react-force-graph (install via npm)
- All styling Google/Gemini design
- Mock data for development: at least 5 people, 10 interactions, 15 decisions, 5 patterns
- Every component has JSDoc + header comment
```

---

# PART 2 : GOOGLE WORKSPACE TOOLS (Workers)

## Prompt 2.1 — Setup Google Workspace CLI + Test Data

```
Guide me step by step to configure the Google Workspace CLI (gws) for a hackathon project.

CONTEXT:
I am building an AI intelligence system called "DealBoard AI Companion" that needs to access Gmail, Google Drive, Google Sheets, and Google Calendar from a test Google account. The goal is to preload realistic fake data for a demo.

STEP 1 — Installation:
- npm install -g @googleworkspace/cli
- Verify that gws --help works

STEP 2 — OAuth Configuration:
- gws auth setup (guide me through the steps)
- gws auth login
- Which OAuth scopes do I need for Gmail, Drive, Sheets, and Calendar access?

STEP 3 — Preload demo data in the Google account:

Create the following content that I will manually add to my test Google account:

A. AN EMAIL in Gmail (send to myself):
- From: thomas.martin@acmecorp.com (simulated)
- Subject: "RE: Security requirements for Q1 migration"
- Body: "Hi team, After our security audit, we need all vendors to comply with ISO 27001 certification. This is non-negotiable for our board. Please confirm your vendor's compliance status before we proceed. — Thomas Martin, CTO, AcmeCorp"
- Date: approximately 3 months ago

B. A GOOGLE DOC in Drive:
- Title: "AcmeCorp - Meeting Notes Q4 2025"
- Content:
  "Meeting with AcmeCorp — December 12, 2025
  Attendees: Thomas Martin (CTO), Sarah Chen (VP Eng), Us: Jean Dupont

  Key Points:
  - AcmeCorp is evaluating 3 vendors for their data infrastructure migration
  - Main competitors: Datadog (preferred by engineering team) and New Relic (preferred by finance)
  - Budget: 150K-200K annual, decision by end of Q1 2026
  - CRITICAL: They hate hidden fees. Previous vendor (Splunk) surprised them with overage charges.
  - Thomas wants a flat-rate pricing model — 'no surprises'
  - Next step: Technical demo scheduled for January

  Action items:
  - Prepare flat-rate proposal
  - Get ISO 27001 certification status from compliance team"

C. A GOOGLE SHEET in Drive:
- Title: "Sales Discount Policy 2026"
- Content:
  | Deal Size   | Max no approval | Max with Manager | Max with VP |
  | < 50K       | 10%             | 15%              | 20%         |
  | 50K-150K    | 5%              | 10%              | 15%         |
  | > 150K      | 0%              | 5%               | 10%         |
  Note: "Any discount above these thresholds requires written VP approval. No exceptions."

D. CALENDAR EVENTS:
- Event 1: "AcmeCorp — Technical Demo" scheduled for next week
  - Description: "Demo our data platform to AcmeCorp engineering team. Focus: migration speed, flat-rate pricing, compliance dashboard."
- Event 2: "Internal — AcmeCorp Strategy Sync" scheduled for yesterday
  - Description: "Review approach for AcmeCorp deal before demo. Topics: pricing strategy, Datadog counter-arguments, ISO 27001 readiness."

STEP 4 — Test the commands:
- gws gmail users messages list --params '{"userId": "me", "q": "AcmeCorp security"}'
- gws drive files list --params '{"q": "name contains '\''AcmeCorp'\''"}'
- gws sheets spreadsheets values get --params '{"spreadsheetId": "SHEET_ID", "range": "A1:E5"}'
- gws calendar events list --params '{"calendarId": "primary", "q": "AcmeCorp"}'

Give me the exact commands and tell me what to verify in the JSON responses.
```

## Prompt 2.2 — Node.js Wrapper for Google Workspace CLI

```
Create a set of Node.js modules that wrap the Google Workspace CLI (gws) commands for use by the AI agents of DealBoard AI Companion.

CONTEXT:
DealBoard uses multiple AI agents. When the Listener Agent detects a context gap, it orders Worker Agents to scrape Google Workspace via the gws CLI. Results are passed to an Analyser Agent that structures them into cards.

IMPORTANT — ONE FILE PER WORKER. Split the logic as follows:

FILE: server/tools/gws-tools.js
Start with a detailed comment block (20+ lines) explaining:
- This file is the base utility module for executing gws CLI commands
- It handles command execution, timeout management, and mock mode
- It is used by individual worker files (gmail-worker.js, drive-worker.js, etc.)
- In mock mode (USE_MOCK=true), it returns data from mock-data.json instead of calling gws

Export these base functions:
1. executeGwsCommand(command, args) — runs a gws command with timeout from config
2. isMockMode() — checks USE_MOCK from config
3. loadMockData(key) — loads data from mock-data.json for a given key

FILE: server/workers/gmail-worker.js
Start with a detailed comment block explaining:
- This worker searches Gmail for emails matching a query
- It retrieves full message content including decoded body
- Use cases: finding past client communications, checking commitments, verifying claims
- In mock mode, returns pre-built email data

Export:
1. searchEmails(query) — searches and returns { agent: "gmail", question, answer, raw, error }

FILE: server/workers/drive-worker.js
Export:
1. searchDrive(query) — { agent: "drive", question, answer, raw, error }

FILE: server/workers/sheets-worker.js
Export:
1. getSheetData(spreadsheetId, range) — { agent: "sheets", question, answer, raw, error }

FILE: server/workers/calendar-worker.js
Export:
1. searchCalendarEvents(query) — { agent: "calendar", question, answer, raw, error }

FILE: server/workers/worker-orchestrator.js
Export:
1. runWorkers(queries) — runs all non-null workers in parallel, returns array of results

STANDARDIZED RETURN FORMAT:
{
  "agent": "gmail" | "drive" | "sheets" | "calendar",
  "question": "the original query",
  "answer": "1-2 sentence summary of the result",
  "raw": { /* raw data */ },
  "error": false
}

IMPORTANT:
- Use child_process.execFile (not exec) for security
- All timeouts from server/config.js
- Each function has full JSDoc
- Each file starts with a detailed header comment
- USE_MOCK flag from config.js
- Update Design.md
```

## Prompt 2.3 — Inject GWS SKILL.md Files into Agents

```
I want my AI agents to use the SKILL.md files from the Google Workspace CLI.

FILE: server/tools/skills-loader.js
Start with a detailed comment block (20+ lines) explaining:
- This module loads GWS SKILL.md files from the skills/ directory
- They are injected into agent system prompts so Gemini generates valid gws commands
- gws-shared SKILL.md must ALWAYS be loaded first

Export:
1. loadSkill(name) — loads a SKILL.md by name
2. buildListenerContext() — all skills for the Listener
3. buildWorkerContext(services) — specific skills for Workers

See the skills-loader code from the architecture document for the exact implementation.

IMPORTANT:
- gws-shared MUST always be first
- Graceful fallback if SKILL.md files are missing
- Full JSDoc + header comment
- Update Design.md
```

## Prompt 2.4 — Mock Data JSON

```
Create the mock data files for DealBoard AI Companion's demo fallback system.

FILE: mock-data/mock-data.json
Contains: battlecards (Datadog, New Relic), discount_rules, client_history, prospect_info, calendar_events

FILE: mock-data/mock-transcript.json
10-15 transcript segments simulating a real sales call with triggers for each card type.

FILE: mock-data/mock-memory.json
Fake knowledge graph: 3-5 past interactions, people profiles, decisions, patterns.

FILE: mock-data/mock-vision.json
Fake camera analysis data:
{
  "body_language_readings": [
    {
      "timestamp": "00:15",
      "participants": [
        { "label": "Participant 1", "expression": "neutral", "engagement": 85, "emotion": "attentive", "confidence": 0.78 }
      ]
    },
    {
      "timestamp": "00:30",
      "participants": [
        { "label": "Participant 1", "expression": "skeptical", "engagement": 62, "emotion": "doubtful", "confidence": 0.82 }
      ]
    }
  ],
  "scene_readings": [
    {
      "timestamp": "00:15",
      "description": "Conference room with whiteboard showing Q1 roadmap milestones",
      "objects": ["whiteboard", "laptop", "coffee mug", "notepad"],
      "context": "Professional meeting environment. Whiteboard content suggests strategic planning session.",
      "risks": [],
      "opportunities": ["Whiteboard shows their Q1 priorities — could align our pitch to their roadmap"]
    }
  ]
}

Format all JSON cleanly. Use "_comment" key for documentation.
```

---

# PART 3 : BACKEND SERVER + AGENT ORCHESTRATION

## Prompt 3.1 — The Node.js Middleware Server

```
Create the main Node.js/Express server that orchestrates the AI agents of DealBoard AI Companion.

FILE: server/server.js
Start with a detailed comment block (30+ lines) explaining:
- Central orchestration server for DealBoard AI Companion
- Manages WebSocket connections for audio, camera frames, and card delivery
- Coordinates the multi-agent pipeline: Listener → Workers → Analyser → Dashboard
- Handles camera frames → Vision Agent → Body Language + Scene cards
- Handles post-meeting document generation via Strategy Agent
- Supports 'live' and 'fallback' modes
- All config from server/config.js

ARCHITECTURE:
- Express server on port from config.PORT
- WebSocket routes (lib 'ws'):
  1. ws://localhost:{PORT}/audio — receives PCM 16kHz audio chunks from the dashboard
  2. ws://localhost:{PORT}/cards — sends cards and documents to the dashboard
  3. ws://localhost:{PORT}/vision — receives base64 JPEG camera frames from the dashboard

COMPLETE DATA FLOW:

AUDIO PIPELINE:
1. Dashboard sends audio chunk on /audio
2. Server streams chunk to Gemini Live API
3. Gemini Live returns transcription
4. Text → Listener Agent (Gemini Flash)
5. Listener responds: needs_context true/false + queries
6. If false → silence
7. If true → Workers (parallel) → Analyser → Card → broadcast to /cards

VISION PIPELINE:
1. Dashboard sends camera frame on /vision (base64 JPEG)
2. Server sends frame to Vision Agent (Gemini Pro multimodal)
3. Vision Agent returns:
   {
     "body_language": {
       "participants": [
         { "label": "Participant 1", "expression": "skeptical", "engagement": 62, "emotion": "doubtful", "confidence": 0.82 }
       ]
     },
     "scene_analysis": {
       "description": "Conference room with whiteboard",
       "objects": ["whiteboard", "laptop"],
       "context": "Strategic planning session",
       "risks": [],
       "opportunities": ["Whiteboard shows Q1 priorities"]
     }
   }
4. Broadcast vision data to /cards as type "vision"
5. If body language detects strong signals (high skepticism, confusion, disengagement), create a STRATEGY card:
   "Participant shows skepticism — consider addressing concerns directly"

POST-MEETING FLOW:
On "Generate Summary" message:
1. Collect transcript + cards + vision highlights + memory context
2. Send to Strategy Agent
3. Strategy Agent generates: summary, follow-up email, strategy brief, decision log
4. Broadcast each as type "document" to /cards
5. Send memory updates to Memory Agent

GEMINI LIVE API:
- Model from config.GEMINI_LIVE_MODEL
- response_modalities: ["TEXT"]
- Audio: mime_type "audio/pcm;rate=16000"

ERROR HANDLING:
- Gemini Live disconnect → auto reconnect
- Worker failure → Analyser still gets other results
- Vision Agent failure → meeting continues without vision (graceful degradation)
- Log all events with logger.js

IMPORTANT:
- Plain JavaScript, no TypeScript
- All config from server/config.js
- System prompts from server/prompts/
- Every function has full JSDoc
- 30+ line header comment
- Update Design.md
```

## Prompt 3.2 — The Listener Agent System Prompt

```
Write the system prompt for the Listener Agent of DealBoard AI Companion.

FILE: server/prompts/listener-prompt.txt

ROLE: Context gap detector. Does NOT analyze, does NOT generate cards. Only detects if information is missing.

OUTPUT FORMAT (JSON):
{
  "needs_context": true/false,
  "reason": "1 sentence (null if false)",
  "queries": {
    "gmail": "gws command or null",
    "drive": "gws command or null",
    "sheets": "gws command or null",
    "calendar": "gws command or null"
  }
}

TRIGGERS needs_context: true:
- Prospect mentions historical fact not in context
- Competitor named
- Objection related to past commitment
- Contradiction with past email/doc
- Certification/standard mentioned
- Meeting/event referenced
- Decision from past meeting referenced

DOES NOT TRIGGER:
- Small talk
- Info already in context
- Segment < 5 words

Uses GWS SKILL.md syntax for commands.
Write complete prompt in English.
```

## Prompt 3.3 — The Analyser Agent System Prompt

```
Write the system prompt for the Analyser Agent.

FILE: server/prompts/analyser-prompt.txt

INPUT: { transcript_segment, reason, worker_results[] }
OUTPUT: { label, priority, summary (max 12 words), details[] }

Labels: ALERT (critical), BATTLECARD (warn), CONTEXT (info), STRATEGY (strategy), INFO (neutral)
Summary: always actionable, direct, no hedging.

Write complete prompt in English.
```

## Prompt 3.4 — The Vision Agent System Prompt

```
Write the system prompt for the Vision Agent of DealBoard AI Companion.

CONTEXT:
The Vision Agent receives camera frames (JPEG images) captured from the user's webcam during a meeting. It analyzes two things:
1. Body Language — facial expressions, engagement levels, emotional signals of visible participants
2. Scene Understanding — what is in the environment, whiteboards, documents, room context

This agent uses Gemini Pro with multimodal capabilities (image + text input).

FILE: server/prompts/vision-prompt.txt
Start with a comment block explaining the agent's purpose and input/output format.

INPUT:
The agent receives a single image (JPEG frame from webcam) along with context:
{
  "image": "<base64 JPEG>",
  "meeting_context": "Sales call with AcmeCorp, discussing pricing and migration",
  "previous_reading": { /* last body language reading for comparison */ }
}

OUTPUT (strict JSON):
{
  "body_language": {
    "participants": [
      {
        "label": "Participant 1",
        "expression": "neutral" | "positive" | "negative" | "skeptical" | "confused" | "engaged" | "disengaged" | "surprised",
        "engagement_score": 0-100,
        "attention_score": 0-100,
        "emotion": "free text description of detected emotional state",
        "confidence": 0.0-1.0,
        "change_from_previous": "no change" | "more engaged" | "less engaged" | "shifted to skeptical" | "shifted to positive" | etc.
      }
    ],
    "group_dynamics": "Overall group sentiment description",
    "alert": null | "string describing a significant shift worth flagging"
  },
  "scene_analysis": {
    "description": "Brief description of the visible environment",
    "objects": ["list", "of", "notable", "objects"],
    "text_detected": "any readable text from whiteboards, screens, documents",
    "context": "interpretation of the scene in the meeting context",
    "risks": ["list of potential risks observed"],
    "opportunities": ["list of opportunities observed from the scene"]
  }
}

BODY LANGUAGE RULES:
- Analyze ALL visible faces in the frame
- For each person: detect the primary expression, estimate engagement (0-100), estimate attention (0-100)
- Compare with previous reading to detect SHIFTS (these are more important than static readings)
- If a significant negative shift is detected (engagement drops >20 points, expression shifts from positive to skeptical), set the "alert" field
- Be calibrated: most people have neutral expressions in meetings — only flag genuine shifts
- Confidence score must reflect how clear the face is in the image
- Never identify specific real people by name — use labels like "Participant 1"

SCENE UNDERSTANDING RULES:
- Describe the physical environment briefly
- Identify readable text (whiteboards, screens, documents visible)
- Detect objects that provide meeting context (laptops, notepads, product prototypes, etc.)
- Interpret the scene in the context of the meeting topic
- Flag risks: e.g., "competitor logo visible on participant's screen"
- Flag opportunities: e.g., "whiteboard shows Q1 priorities that align with our offering"

YOU NEVER:
- Identify real people by name
- Make assumptions beyond what is visible
- Produce output outside the JSON structure
- Return body language readings if no faces are clearly visible (return empty participants array)

Write the complete prompt in English, ready to be injected as system_instruction.
```

## Prompt 3.5 — The Strategy Agent System Prompt

```
Write the system prompt for the Strategy Agent of DealBoard AI Companion.

FILE: server/prompts/strategy-prompt.txt

Called after meeting ends. Receives: full transcript, all cards, vision highlights (body language + scene insights), calendar context, memory context.

Produces 4 documents:
1. Meeting Summary (executive overview, topics, decisions, actions, risks, opportunities)
2. Follow-up Email (professional, references specific discussion points)
3. Strategy Brief (position analysis, risks ranked, opportunities ranked, recommended actions, body language insights)
4. Decision Log (each decision with owner, deadline, context, contradiction flags)

Also produces memory_updates for the Memory Agent.

NEW — VISION INSIGHTS INTEGRATION:
The Strategy Agent must incorporate body language observations into its analysis:
- If skepticism was detected during pricing discussion → flag in Strategy Brief as "Prospect showed hesitation during pricing — consider alternative framing"
- If engagement dropped during a specific topic → flag as "Low engagement detected during [topic] — may need different approach"
- Scene insights (whiteboards, visible documents) → incorporate into context analysis

Write complete prompt in English.
```

## Prompt 3.6 — The Memory Agent System Prompt

```
Write the system prompt for the Memory Agent.

FILE: server/prompts/memory-prompt.txt

Two modes:
1. QUERY — returns relevant interactions, people, decisions, patterns
2. STORE — adds new data, detects conflicts

Knowledge graph structure: People, Interactions, Decisions, Patterns, Relationships.
Pattern detection: recurring objections, competitor mentions, unfollowed promises, negotiation patterns.

Write complete prompt in English.
```

## Prompt 3.7 — Gemini Client Module

```
Create the centralized Gemini API client.

FILE: server/tools/gemini-client.js

Export:
1. callGemini(prompt, systemInstruction, modelOverride?) — standard text call
2. callGeminiWithImage(prompt, imageBase64, systemInstruction, modelOverride?) — multimodal call (for Vision Agent)
3. createLiveSession() — Gemini Live API WebSocket for audio
4. sendAudioChunk(session, chunk) — send PCM audio to live session
5. parseGeminiResponse(rawResponse) — safe JSON extraction

IMPORTANT:
- callGeminiWithImage sends the image as an inline_data part with mime_type "image/jpeg"
- The Vision Agent always uses the VISION_MODEL from config (Gemini Pro for multimodal)
- Retry logic with exponential backoff (3 attempts)
- All model names from config
- Full JSDoc + header comment
- Update Design.md
```

## Prompt 3.8 — Fallback Mode (No Live API)

```
Create a fallback mode that works WITHOUT the Gemini Live API.

FALLBACK APPROACH:
1. Use the browser's Web Speech API for client-side speech-to-text
2. Dashboard sends transcribed TEXT to server via WebSocket
3. Server sends text to Listener Agent (standard Gemini Flash)
4. Pipeline continues normally: Workers → Analyser → Card

MODIFICATIONS:

FILE: lib/hooks/useAudioCapture.ts
- Add a "text_fallback" mode that uses window.SpeechRecognition
- When MODE=fallback, capture text instead of audio
- Send text to ws://{URL}/text instead of audio chunks

FILE: server/server.js
- Add WebSocket route ws://localhost:{PORT}/text for text input
- In fallback mode, skip the Gemini Live API and feed text directly to Listener

Switch: MODE env variable from config ('live' or 'fallback').

IMPORTANT:
- Fallback works without additional config
- USE_MOCK=true simulates GWS data
- Vision features work independently of audio mode (camera frames still go through Vision Agent)
- Every function has docstrings
- Update Design.md
```

---

# PART 4 : KNOWLEDGE GRAPH + MEMORY SYSTEM

## Prompt 4.1 — Knowledge Graph Implementation

```
Create the knowledge graph storage system.

FILE: server/memory/knowledge-graph.js
Start with a 25+ line comment block explaining the module.

Export:
1. initialize() — loads from disk
2. query(queryText, context) — searches for relevant data
3. store(newData) — adds new data, detects conflicts
4. getPersonProfile(name) — full person profile with history
5. getPatterns(filter) — observed patterns
6. exportGraph() — full graph as JSON
7. resetForTest() — resets to mock data (never writes to disk)

Data structure: people, interactions, decisions, patterns, relationships, metadata.

IMPORTANT:
- All paths from config.js
- Thread-safe writes
- Test mode never writes to disk
- Full JSDoc + header comment
- Update Design.md
```

---

# PART 5 : TEST SCRIPTS

## Prompt 5.1 — Test Scripts for Every Agent

```
Create test scripts for every agent and the full pipeline.

RULE: Test scripts NEVER alter real data. Always USE_MOCK=true.

FILE: scripts/test-listener.js
5 test cases: competitor mention, discount request, security contradiction, small talk (no trigger), short segment (no trigger).

FILE: scripts/test-analyser.js
Mock worker results → verify card format, labels, summary length.

FILE: scripts/test-vision.js
Mock camera frames (base64 JPEG) → verify body language + scene analysis format.
Test cases:
1. Clear face with neutral expression → body language reading
2. Blurry/dark frame → empty participants, scene analysis only
3. Whiteboard visible → text_detected populated
4. Multiple faces → multiple participant entries

FILE: scripts/test-strategy.js
Mock transcript + cards + vision highlights + memory → verify all 4 document types.

FILE: scripts/test-memory.js
Test QUERY and STORE modes. Verify graph operations.

FILE: scripts/test-pipeline.js
Full end-to-end: transcript → Listener → Workers → Analyser → Card → Strategy → Documents → Memory.

EACH SCRIPT:
- Sets USE_MOCK=true
- Prints PASS/FAIL per test
- Shows actual output
- Never touches real data
- Full JSDoc + header comment
- Run with: node scripts/test-{name}.js

Update Design.md with testing instructions.
```

---

# PART 6 : DEMO SCRIPT

## Prompt 6.1 — The Complete Demo Script

```
Write the complete demo script for DealBoard AI Companion for a hackathon, timed to the second.

CONTEXT:
- DealBoard AI Companion is a full-workspace AI intelligence system with a Next.js dashboard
- The demo lasts 90-120 seconds maximum
- 2 people perform: the User (who pitches) and the Prospect (on Google Meet)
- Judges see the User's screen: Google Meet on one side, DealBoard dashboard on the other
- 5 "wow" moments:
  1. Automatic Battlecard when competitor is mentioned
  2. Contrarian Alert when risky discount is requested
  3. Historical Context when contradiction is detected
  4. Body Language insight when skepticism is detected on camera
  5. Post-meeting document generation (the "second brain" moment)

NARRATIVE STRUCTURE:

0:00-0:05 — INTRO
User to judges: "What if you had a second brain that listens, sees, and thinks alongside you?"
Dashboard shows: clean Gemini-styled interface, "AI Companion — Your Second Brain" header

0:05-0:25 — MOMENT 1: BATTLECARD
Prospect: "We've been evaluating Datadog for our infrastructure..."
Dashboard: amber pill slides into top bar → BATTLECARD card appears with slide-in animation
Card: "Datadog: volume billing, pitch our flat-rate"
Click: shows Gmail + Drive agent results with competitive intel

0:25-0:40 — MOMENT 2: ALERT
Prospect: "We'd need at least 25% discount to get board approval"
Dashboard: RED FLASH on border → red pill in top bar → ALERT card
Card: "25% exceeds max grid — need VP for >5%"
Click: shows Sheets agent with discount policy

0:40-0:55 — MOMENT 3: CONTEXT + BODY LANGUAGE
Prospect: "Security isn't really a concern for us"
Dashboard: teal pill → CONTEXT card appears
Card: "CTO email Dec: ISO 27001 mandatory, raise this"
SIMULTANEOUSLY: Camera panel shows "😟 Skepticism detected — engagement dropped 23%"
→ Blue STRATEGY card appears: "Participant shows doubt — address security proactively"

0:55-1:05 — USER RESPONDS WITH AI INTEL
User uses DealBoard's insights to address all three concerns elegantly
"Actually Thomas, I noticed your CTO flagged ISO 27001 as mandatory..."

1:05-1:20 — MOMENT 4: POST-MEETING DOCUMENTS
Meeting ends. User clicks "Generate Summary"
Dashboard switches to Review tab:
→ Meeting Summary loads (animated skeleton → content)
→ Follow-up Email ready to copy
→ Strategy Brief with risks and next steps
→ Decision Log with action items

1:20-1:35 — MOMENT 5: SECOND BRAIN
User navigates to Memory tab
Dashboard shows knowledge graph: AcmeCorp node connected to people, topics, decisions
"Every interaction is stored. Every pattern is learned. This is your second brain."

1:35-2:00 — CLOSE
User to judges: "DealBoard doesn't just listen to your meetings. It sees the room, reads the signals, retrieves your history, writes your follow-ups, and remembers everything. Humans were never designed to process this complexity alone. Now they don't have to."

For each moment, specify:
- TOP BAR state (pills)
- CARD BOARD state (which cards visible)
- CAMERA PANEL state (body language readings)
- TRANSCRIPT PANEL state
- REVIEW/MEMORY states when applicable
```

---

# EXECUTION ORDER

## BEFORE the hackathon:

| Day | Dev 1 (Backend/Audio) | Dev 2 (Frontend/Dashboard) | Dev 3 (Prompts/Data/Memory) |
|-----|----------------------|---------------------------|---------------------------|
| Day 1 | Read Gemini Live API + Vision API docs | Prompt 0.1 → Project skeleton | Prompt 2.1 → GWS CLI setup |
| Day 2 | Prompt 3.1 → Server + Prompt 3.7 → Gemini client | Prompt 1.1 → Design system + Prompt 1.2 → Layout | Prompt 2.2 → Workers + Prompt 2.3 → Skills |
| Day 3 | Prompt 3.8 → Fallback mode | Prompt 1.3 → Meeting page + Prompt 1.4 → Review page | Prompt 2.4 → Mock data + All agent prompts (3.2-3.6) |
| Day 3 eve | First end-to-end test | Prompt 1.5 → Memory page | Prompt 4.1 → Knowledge graph + Prompt 5.1 → Tests |

## HACKATHON DAY:

| Time | Everyone |
|------|----------|
| 9h-10h | Setup Gemini access, first Live API + Vision API test |
| 10h-13h | Connect real APIs, debug full pipeline with vision |
| 13h-15h | Test Strategy Agent + Memory Agent with real data |
| 15h-17h | Full assembly, first end-to-end demo run |
| 17h-19h | Debug, polish, verify all fallbacks |
| 19h-21h | Rehearse demo 5-10 times |
| 21h-22h | Pitch |

## FALLBACK CHECKLIST:

| Problem | Solution |
|---------|----------|
| Gemini Live API down | MODE=fallback → Web Speech API + Gemini Flash |
| GWS CLI fails | USE_MOCK=true → mock-data.json |
| Vision Agent too slow | ENABLE_VISION_AGENT=false → meeting works without camera |
| Strategy Agent slow | Pre-generate docs from mock data |
| Memory Agent fails | ENABLE_MEMORY_AGENT=false → use mock-memory.json |
| Everything fails | MODE=fallback + USE_MOCK=true → 100% simulated, indistinguishable |

---

# DESIGN.MD UPDATE CHECKLIST

After ALL prompts, Design.md must contain:

1. **Project Overview**: AI Companion — full workspace intelligence with Next.js dashboard
2. **Design Language**: Google/Gemini aesthetic — colors, typography, component styles
3. **Architecture Diagram**: ASCII art of complete data flow (audio + vision + post-meeting + memory)
4. **Feature List**: Every feature with [TODO] / [WIP] / [DONE]
5. **File Map**: Every file with purpose and feature
6. **Agent Reference**: Each agent's role, input, output, model
7. **Vision System**: Body Language + Scene Understanding pipeline documentation
8. **Config Reference**: Both config files (server + frontend) explained
9. **Testing Instructions**: How to run each test script
10. **Demo Instructions**: How to set up and run the demo
11. **Fallback Reference**: Each fallback scenario
12. **Code Quality Standards**: The 6 mandatory rules
