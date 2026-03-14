// ============================================================
// app/dashboard/layout.tsx — Dashboard Shell Layout
// ============================================================
//
// PURPOSE:
// Provides the persistent shell for all dashboard sub-pages:
//   /dashboard, /meeting, /review, /memory, /settings
//
// Layout:
//   [Sidebar 240px] | [Main content — flex-1, scrollable]
//
// Also handles auth guard: if 'dealboard_auth' is not set
// in localStorage, redirects to /auth.
//
// DESIGN: Sidebar is fixed-height (100vh), main area scrolls.
// The flex layout ensures the sidebar never scrolls with content.
//
// DEPENDENCIES: components/ui/Sidebar, next/navigation
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/ui/Sidebar';

/**
 * DashboardLayout
 * Persistent shell with Sidebar + scrollable main content area.
 * Guards against unauthenticated access.
 *
 * @param children - page content rendered in the main area
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Auth guard: redirect to /auth if not logged in
  useEffect(() => {
    const auth = localStorage.getItem('dealboard_auth');
    if (auth !== 'true') {
      router.replace('/auth');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#F8F9FA' }}
      >
        <div
          className="w-7 h-7 rounded-full border-2"
          style={{
            borderColor:    '#E8EAED',
            borderTopColor: '#4285F4',
            animation:      'spin 0.8s linear infinite',
          }}
          role="status"
          aria-label="Loading workspace…"
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: '#F8F9FA' }}
    >
      {/* ── Sidebar ──────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main Content Area ────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
