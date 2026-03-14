// ============================================================
// app/auth/layout.tsx — Auth Layout (No Sidebar)
// ============================================================
//
// PURPOSE:
// Minimal layout for authentication pages (/auth/...).
// Intentionally excludes the dashboard Sidebar and Topbar
// so the sign-in page is full-screen without navigation chrome.
//
// DESIGN:
// Full-screen gradient background matching Gemini brand,
// with a centered content column. The background features
// a subtle geometric pattern overlay for visual interest.
//
// DEPENDENCIES: globals.css
// ============================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — DealBoard AI',
  description: 'Sign in to DealBoard AI Companion',
};

/**
 * AuthLayout
 * Full-screen layout for the authentication flow.
 * No sidebar, no topbar — clean sign-in experience.
 *
 * @param children - page content (sign-in form)
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F9FA' }}>
      {children}
    </div>
  );
}
