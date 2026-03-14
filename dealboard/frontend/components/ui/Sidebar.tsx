// ============================================================
// components/ui/Sidebar.tsx — Navigation Sidebar Component
// ============================================================
//
// PURPOSE:
// Left-side navigation bar for the DealBoard dashboard layout.
// Displays:
//   - DealBoard logo + Gemini gradient dot
//   - Navigation items with lucide-react icons
//   - Active route highlighting (based on usePathname)
//   - WebSocket connection status at the bottom
//   - User avatar placeholder
//
// NAV ITEMS:
//   /dashboard — LayoutDashboard icon
//   /meeting   — Radio icon (pulsing dot when meeting active)
//   /review    — FileText icon
//   /memory    — Brain icon
//   /settings  — Settings icon
//
// DATA FLOW:
//   usePathname     → active highlight
//   useWebSocketContext → status for StatusIndicator
//
// DESIGN: 240px wide, white background, Google Sans font
// DEPENDENCIES: lucide-react, next/navigation, WebSocketProvider
// ============================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  FileText,
  Brain,
  Settings,
  Zap,
} from 'lucide-react';
import { useWebSocketContext } from '../providers/WebSocketProvider';
import { StatusIndicator } from './StatusIndicator';

// ── Nav Item Config ───────────────────────────────────────

interface NavItem {
  href:        string;
  label:       string;
  icon:        React.ComponentType<{ size?: number; strokeWidth?: number }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href:        '/dashboard',
    label:       'Dashboard',
    icon:        LayoutDashboard,
    description: 'Overview and past meetings',
  },
  {
    href:        '/meeting',
    label:       'Live Meeting',
    icon:        Radio,
    description: 'Real-time intelligence cards',
  },
  {
    href:        '/review',
    label:       'Review',
    icon:        FileText,
    description: 'Post-meeting documents',
  },
  {
    href:        '/memory',
    label:       'Memory',
    icon:        Brain,
    description: 'Knowledge graph and patterns',
  },
  {
    href:        '/settings',
    label:       'Settings',
    icon:        Settings,
    description: 'Configuration and preferences',
  },
];

// ── Sidebar Component ─────────────────────────────────────

/**
 * Sidebar
 * Full-height navigation sidebar for the dashboard layout.
 * Highlights the active route and shows WebSocket status.
 */
export function Sidebar() {
  const pathname   = usePathname();
  const { status, meetingState } = useWebSocketContext();

  /** Check if a nav item should be highlighted as active */
  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href) ?? false;
  }

  const isMeetingActive = meetingState?.state === 'active' || meetingState?.state === 'starting';

  return (
    <aside
      className="flex flex-col h-screen flex-shrink-0"
      style={{
        width:           240,
        backgroundColor: '#FFFFFF',
        borderRight:     '1px solid #E8EAED',
      }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid #E8EAED' }}
      >
        {/* Gemini gradient ring */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4285F4, #A142F4)' }}
        >
          <Zap size={14} color="white" strokeWidth={2.5} />
        </div>
        <div>
          <span
            className="font-semibold text-sm block leading-none"
            style={{ color: '#202124' }}
          >
            DealBoard
          </span>
          <span
            className="text-[10px] font-medium"
            style={{
              background: 'linear-gradient(90deg, #4285F4, #A142F4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            AI Companion
          </span>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active  = isActive(item.href);
            const Icon    = item.icon;
            const isMeet  = item.href === '/meeting';

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.description}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 group relative"
                style={{
                  backgroundColor: active ? '#E8F0FE' : 'transparent',
                  color:           active ? '#4285F4' : '#5F6368',
                }}
              >
                {/* Hover background */}
                {!active && (
                  <span
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: '#F8F9FA' }}
                    aria-hidden
                  />
                )}

                {/* Active left accent bar */}
                {active && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                    style={{ backgroundColor: '#4285F4' }}
                    aria-hidden
                  />
                )}

                {/* Icon */}
                <span className="relative flex-shrink-0">
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {/* Live meeting pulse indicator */}
                  {isMeet && isMeetingActive && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white"
                      style={{
                        backgroundColor: '#EA4335',
                        animation: 'statusPulse 1.5s ease-in-out infinite',
                      }}
                      aria-label="Meeting active"
                    />
                  )}
                </span>

                {/* Label */}
                <span className="relative flex-1">{item.label}</span>

                {/* Active indicator dot */}
                {active && (
                  <span
                    className="relative w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#4285F4' }}
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Connection Status ─────────────────────────────── */}
      <div
        className="px-4 py-3 flex-shrink-0 space-y-2"
        style={{ borderTop: '1px solid #E8EAED' }}
      >
        <StatusIndicator status={status} showLabel size="sm" />

        {/* Version / branding footer */}
        <p className="text-[10px]" style={{ color: '#9AA0A6' }}>
          Powered by Gemini 2.0
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
