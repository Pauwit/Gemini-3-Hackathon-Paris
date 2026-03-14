// ============================================================
// app/dashboard/page.tsx — Dashboard Overview Page
// ============================================================
//
// PURPOSE:
// Main dashboard showing recent meetings, quick stats, and
// a "Start New Meeting" CTA. Entry point for the user flow.
//
// DATA FLOW:
// GET /api/meetings → display meeting list
// "Start Meeting" → navigates to /meeting with params
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/meetings)
// DEPENDENCIES: useWebSocketContext, mock-meetings.json
// ============================================================

'use client';

export default function DashboardPage() {
  // TODO: Fetch /api/meetings and render meeting history
  // TODO: Show connection status badge
  // TODO: "Start New Meeting" button → router.push('/meeting')
  // TODO: Stats cards: total meetings, cards generated, decisions logged

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">DealBoard</h1>
        <p className="text-gray-500 mt-1">AI-powered sales intelligence companion</p>
      </div>

      {/* TODO: Implement dashboard content */}
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-400 text-sm">Dashboard — TODO: implement</p>
        <p className="text-gray-300 text-xs mt-2">
          Recent meetings · Quick stats · Start meeting CTA
        </p>
      </div>
    </div>
  );
}
