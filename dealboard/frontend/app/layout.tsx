// ============================================================
// app/layout.tsx — Root Layout
// ============================================================
//
// PURPOSE:
// Next.js root layout. Sets HTML metadata, loads Google fonts,
// applies globals.css, and wraps the app in the WebSocketProvider.
//
// DATA FLOW: All pages rendered inside this layout shell.
//
// PROTOCOL REFERENCE: N/A
// DEPENDENCIES: globals.css, WebSocketProvider
// ============================================================

import type { Metadata } from 'next';
import './globals.css';
import { WebSocketProvider } from '../components/providers/WebSocketProvider';

export const metadata: Metadata = {
  title: 'DealBoard AI Companion',
  description: 'Real-time AI sales intelligence powered by Gemini',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}
