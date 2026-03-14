// ============================================================
// app/layout.tsx — Root Layout
// ============================================================
//
// PURPOSE:
// Next.js root layout applied to all pages in the app.
// Responsibilities:
//   1. Sets HTML metadata (title, description, viewport)
//   2. Loads Google Fonts (Google Sans via @import in globals.css)
//   3. Applies globals.css (design tokens + Tailwind)
//   4. Wraps every page in WebSocketProvider (real-time context)
//   5. Reads ?mock=true URL param to enable mock mode
//
// MOCK MODE:
// Adding ?mock=true to any URL will tell WebSocketProvider to
// skip the real WebSocket connection and load mock-data/ JSON.
// This allows demoing without a running backend server.
//
// DATA FLOW:
// WebSocketProvider → all pages via useWebSocketContext()
//
// PROTOCOL REFERENCE: N/A (infrastructure)
// DEPENDENCIES: globals.css, WebSocketProvider
// ============================================================

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { WebSocketProvider } from '../components/providers/WebSocketProvider';

// ── Metadata ──────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default:  'DealBoard AI Companion',
    template: '%s — DealBoard',
  },
  description: 'Real-time AI sales intelligence powered by Gemini 2.0. ' +
    'Live meeting cards, Google Workspace integration, and persistent memory.',
  keywords:    ['sales intelligence', 'AI', 'Gemini', 'meeting assistant', 'Google Workspace'],
  authors:     [{ name: 'DealBoard Team' }],
};

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#4285F4',
};

// ── Root Layout ───────────────────────────────────────────

/**
 * RootLayout
 * Top-level layout shared by all pages.
 * Wraps children in WebSocketProvider for real-time data.
 *
 * @param children - page content
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts — Google Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Google+Sans+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/*
          WebSocketProvider wraps all pages.
          In mock mode (?mock=true), it loads JSON from mock-data/
          instead of connecting to the backend WebSocket.
          The useMock prop is handled client-side per page.
        */}
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}
