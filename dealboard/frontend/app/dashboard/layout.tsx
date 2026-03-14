// ============================================================
// app/dashboard/layout.tsx — Dashboard Layout
// ============================================================
//
// PURPOSE:
// Wraps all dashboard sub-pages with the navigation Sidebar
// and main content area layout.
//
// PROTOCOL REFERENCE: N/A
// DEPENDENCIES: components/ui/Sidebar
// ============================================================

'use client';

// TODO: Import Sidebar component when implemented
// import { Sidebar } from '../../components/ui/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* TODO: <Sidebar /> */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
