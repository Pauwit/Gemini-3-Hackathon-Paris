// ============================================================
// app/settings/page.tsx — Settings & Connection Status
// ============================================================
//
// PURPOSE:
// Settings page for configuring DealBoard. Shows WebSocket
// connection status, feature flags, server health info,
// and allows configuring API URL and other preferences.
//
// DATA FLOW:
// useWebSocketContext → status, features
// GET /api/health → server info display
//
// PROTOCOL REFERENCE: PROTOCOL.md section 4 (GET /api/health)
// DEPENDENCIES: useWebSocketContext, StatusIndicator
// ============================================================

'use client';

// TODO: Import useWebSocketContext
// TODO: Import StatusIndicator
// TODO: Show server health badge (connected/disconnected)
// TODO: Feature flags display (vision, memory, strategyAgent)
// TODO: API URL configuration (stored in localStorage)

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Connection and configuration</p>

      {/* Connection Status Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-medium text-gray-900 mb-4">Server Connection</h2>
        {/* TODO: StatusIndicator + status text */}
        {/* TODO: Health check details */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <span className="text-sm text-gray-500">Connection status — TODO: implement</span>
        </div>
      </section>

      {/* Feature Flags Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-medium text-gray-900 mb-4">Features</h2>
        {/* TODO: Toggle-style display for vision, memory, strategyAgent */}
        <p className="text-gray-300 text-sm">Feature flags — TODO: implement</p>
      </section>

      {/* About */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-medium text-gray-900 mb-2">About</h2>
        <p className="text-sm text-gray-500">DealBoard AI Companion v1.0</p>
        <p className="text-xs text-gray-400 mt-1">Powered by Gemini · Built for Gemini 3 Hackathon Paris</p>
      </section>
    </div>
  );
}
