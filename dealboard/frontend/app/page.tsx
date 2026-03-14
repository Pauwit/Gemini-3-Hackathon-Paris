// ============================================================
// app/page.tsx — Root Page (Auth-aware redirect)
// ============================================================
//
// PURPOSE:
// Root URL handler. Checks localStorage for 'dealboard_auth'
// and redirects accordingly:
//   - Authenticated (dealboard_auth = 'true') → /dashboard
//   - Not authenticated → /auth
//
// Must be a client component to read localStorage.
// Shows a brief loading spinner during the redirect check.
//
// DEPENDENCIES: next/navigation (useRouter), React useEffect
// ============================================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * RootPage
 * Auth-aware redirect gate. Runs once on mount, reads
 * localStorage for auth state, then navigates.
 *
 * No content is rendered — just a brief spinner.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('dealboard_auth') === 'true';
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth');
    }
  }, [router]);

  // Minimal loading state while redirect fires
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F8F9FA' }}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Gemini gradient logo mark */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4285F4, #A142F4)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" strokeWidth="0"/>
          </svg>
        </div>

        {/* Spinner */}
        <div
          className="w-6 h-6 rounded-full border-2"
          style={{
            borderColor:    '#E8EAED',
            borderTopColor: '#4285F4',
            animation:      'spin 0.8s linear infinite',
          }}
          role="status"
          aria-label="Loading…"
        />
      </div>
    </div>
  );
}
