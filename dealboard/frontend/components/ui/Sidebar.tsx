// ============================================================
// components/ui/Sidebar.tsx — Navigation Sidebar
// ============================================================
//
// PURPOSE:
// Left-side navigation bar. Shows app logo, nav items
// (Dashboard, Meeting, Review, Memory, Settings), and
// connection status at the bottom. Highlights current route.
//
// DATA FLOW:
// usePathname → active nav item
// useWebSocketContext → status for connection indicator
//
// DEPENDENCIES: next/navigation, useWebSocketContext, StatusIndicator, config
// ============================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/meeting', label: 'Live Meeting', icon: '◉' },
  { href: '/review', label: 'Review', icon: '◈' },
  { href: '/memory', label: 'Memory', icon: '◎' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-56 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {/* TODO: Import gemini-logo.svg */}
          <div className="w-6 h-6 rounded-full gemini-gradient" />
          <span className="font-semibold text-sm text-gray-900">DealBoard</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
              ${pathname?.startsWith(item.href)
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Connection Status */}
      <div className="p-4 border-t border-gray-100">
        {/* TODO: <StatusIndicator /> */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          <span className="text-xs text-gray-400">Not connected</span>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
