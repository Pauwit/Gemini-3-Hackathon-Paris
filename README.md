# DealBoard — AI Workspace Copilot

> Built in 6 hours at the **Gemini 3 Hackathon Paris 🇫🇷**

DealBoard is a real-time AI copilot that connects to your Google Workspace. It briefs you before meetings, listens during calls to surface the right context instantly, and generates a full recap when it's over.

---

<!-- SCREENSHOT: Full dashboard overview -->
![Dashboard Overview](./docs/screenshots/dashboard.png)

---

## Features

### Workspace Dashboard

Your live briefing before every call. DealBoard scans your Gmail, Drive, and Calendar to give you a structured overview of what matters right now.

| Panel | Description |
|---|---|
| **Strategic Advice** | AI-generated priorities based on your emails and docs |
| **Active Projects** | Status of ongoing deals and projects |
| **Upcoming Events** | Your next calendar events with context |
| **People Briefings** | Who you're meeting — what you need to know about them |
| **Meeting Summaries** | Recaps of past meetings, always at hand |

<!-- SCREENSHOT: Dashboard bento grid with all 5 panels visible -->
![Dashboard Panels](./docs/screenshots/dashboard-panels.png)

---

### AI Chat — Ask Anything

Chat directly with an AI that has full access to your Gmail, Drive, and Calendar. Ask about emails, find documents, get summaries — in plain language.

> *"What did the client say about the Q1 budget?"*
> *"Find the contract we sent last month."*
> *"What's on my calendar this week?"*

<!-- SCREENSHOT: Chat panel with a sample conversation -->
![AI Chat](./docs/screenshots/chat.png)

---

### Live Meeting Co-Pilot

Start a Google Meet directly from DealBoard. During the call, the AI listens in real time and automatically surfaces relevant documents, emails, and insights the moment key topics are mentioned — deals, budgets, deadlines, client names.

**What happens during the call:**
- Live speech transcription displayed in real time
- Key topic detection triggers instant workspace search
- Insights appear in the Co-Pilot sidebar as cards (High / Medium / Low priority)
- Live summaries generated every 15 seconds in the Transcript tab

<!-- SCREENSHOT: Active meeting view with video mirror + Co-Pilot sidebar showing insight cards -->
![Meeting Co-Pilot](./docs/screenshots/meeting-copilot.png)

<!-- SCREENSHOT: Close-up of the Co-Pilot sidebar with insight cards -->
![Insight Cards](./docs/screenshots/insight-cards.png)

---

### Meeting Recap

When you end the call, DealBoard automatically generates a structured recap powered by Gemini AI.

- **Summary** — what was discussed
- **Key Topics** — main subjects covered
- **Decisions** — what was agreed
- **Action Items** — who does what, by when
- **Next Steps** — follow-up plan

<!-- SCREENSHOT: Meeting recap page with summary, decisions, and action items -->
![Meeting Recap](./docs/screenshots/recap.png)

---

## Architecture

```
┌─────────────────────┐       ┌─────────────────────────────┐
│   Next.js Frontend  │ ←WS→  │     Node.js / Express       │
│   (port 3000)       │ ←HTTP→│     (port 3001)             │
└─────────────────────┘       │                             │
                              │  ┌────────────┐             │
                              │  │ Gemini AI  │             │
                              │  └────────────┘             │
                              │  ┌─────────────────────┐    │
                              │  │ Gmail · Drive · Cal  │    │
                              │  └─────────────────────┘    │
                              └─────────────────────────────┘
```

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express, WebSocket |
| **Auth** | Google OAuth 2.0 (Passport.js) |
| **AI** | Google Gemini (via your own API key) |
| **Workspace** | Gmail API, Drive API, Google Calendar API |

---

## Installation

### Prerequisites

- Node.js 18+
- A Google Cloud project with OAuth credentials
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com/apikey)

---

### Step 1 — Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the following APIs:
   - Gmail API
   - Google Drive API
   - Google Calendar API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web Application**
6. Add this authorized redirect URI:
   ```
   http://localhost:3001/auth/google/callback
   ```
7. Copy your **Client ID** and **Client Secret**

---

### Step 2 — Environment Setup

```bash
cd dealboard/server
cp .env.example .env
```

Edit `.env` with your credentials:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
SESSION_SECRET=any_random_string
```

---

### Step 3 — Start the Backend

```bash
cd dealboard/server
npm install
node server.js
```

Server running at `http://localhost:3001`

---

### Step 4 — Start the Frontend

```bash
cd dealboard/frontend
npm install
npm run dev
```

App available at `http://localhost:3000`

---

### Step 5 — First Login

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Sign in with Google**
3. Approve workspace access (Gmail, Drive, Calendar)
4. Go to **Settings** → paste your **Gemini API key**
5. The dashboard will scan your workspace automatically

---

## Built at

**Gemini 3 Hackathon Paris** — organized by Google DeepMind & Cerebral Valley
