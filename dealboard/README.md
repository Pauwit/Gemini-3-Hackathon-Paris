# DealBoard AI Companion

Your second brain for work. Chat with an AI that has access to your Gmail, Drive, Sheets, and Calendar.

## Quick Start

### 1. Set up Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project, enable Gmail, Drive, Calendar, Sheets APIs
3. Create OAuth 2.0 credentials (Web Application)
4. Add `http://localhost:3001/auth/google/callback` as an authorized redirect URI
5. Copy the Client ID and Client Secret

### 2. Configure environment

```bash
cd dealboard/server
cp ../.env.example .env
# Edit .env with your Google OAuth credentials
```

### 3. Start the backend

```bash
cd dealboard/server
npm install
node server.js
# Server running on http://localhost:3001
```

### 4. Start the frontend

```bash
cd dealboard/frontend
npm install
npm run dev
# Ready on http://localhost:3000
```

### 5. Use it

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Approve workspace access
4. Go to Settings → paste your Gemini API key (from [aistudio.google.com](https://aistudio.google.com/apikey))
5. Go to Chat → ask anything about your work!

## Architecture

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Passport.js (Google OAuth)
- **AI**: Gemini 3.1 Pro (via user's own API key)
- **Workspace**: Gmail, Drive, Calendar APIs
- **Auth**: Google OAuth 2.0, tokens stored in server-side session
